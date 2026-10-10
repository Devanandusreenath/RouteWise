from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from itertools import islice
from typing import Any

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS, SERPAPI_API_KEY, SERPAPI_TIMEOUT_SECONDS
from .database import get_all, get_one, init_db, put_json, connect
from .pilot import NODES, SEGMENTS, SEGMENT_BY_ID, NODE_BY_ID, haversine, segment_length, point_on_segment, nearest_segment
from .schemas import VehicleProfile, VehicleLookupQuery, NewDefectInput, DefectStatusUpdate, RouteRequest, InspectionInput, RepairInput
from .seed import seed_database

app = FastAPI(
    title="RouteWise AI API",
    description=(
        "Vehicle-aware routing and road-defect intelligence API. "
        "The included Kochi road graph, restrictions, and seeded defects are illustrative demo data, not surveyed road conditions."
    ),
    version="0.1.0",
)
app.add_middleware(
       CORSMiddleware,
       allow_origins=CORS_ORIGINS,
       allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
       allow_credentials=False,
       allow_methods=["*"],
       allow_headers=["*"],
   )

@app.on_event("startup")
def startup():
    init_db()
    seed_database()

@app.get("/")
def root():
    return {"name":"RouteWise AI API","version":"0.1.0","docs":"/docs","demoData":True}

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status":"ok","service":"routewise-api","vehicleLookup":"serpapi" if SERPAPI_API_KEY else "local-catalogue-only","demoRoadNetwork":True}

@app.get("/api/meta")
def meta():
    return {"demoMode":True,"pilotArea":"Kochi, Kerala","warning":"Seeded road geometry, restrictions and defects are illustrative demonstration data, not surveyed or live conditions.","nodes":NODES,"segments":SEGMENTS}

# --------------------------- Vehicles ---------------------------

@app.get("/vehicles")
def list_vehicles():
    return sorted(get_all("vehicles"), key=lambda x: (x.get("make", ""), x.get("model", ""), x.get("year") or 0))

@app.get("/vehicles/{vehicle_id}")
def get_vehicle(vehicle_id: str):
    item=get_one("vehicles",vehicle_id)
    if not item: raise HTTPException(404,"Vehicle profile not found")
    return item

@app.put("/vehicles")
def save_vehicle(vehicle: VehicleProfile):
    data=vehicle.model_dump()
    data["updatedAt"]=datetime.now(timezone.utc).isoformat()
    put_json("vehicles",data["id"],data)
    return data

@app.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: str):
    from .database import delete_one
    if not get_one("vehicles",vehicle_id): raise HTTPException(404,"Vehicle profile not found")
    delete_one("vehicles",vehicle_id)
    return {"id":vehicle_id,"deleted":True}

@app.post("/vehicles/lookup")
def lookup_vehicles(query: VehicleLookupQuery):
    q=query.model_dump()
    all_profiles=get_all("vehicles")
    # The frontend mock catalogue is represented in the database seed. Filter only supplied values.
    def matches(v):
        for field in ("make","model","variant"):
            val=(q.get(field) or "").strip().lower()
            if val and val not in str(v.get(field) or "").lower(): return False
        if q.get("year") and v.get("year") != q["year"]: return False
        if q.get("category") and v.get("category") != q["category"]: return False
        return True
    local=[v for v in all_profiles if matches(v)]
    if local:
        return local[:20]
    if not SERPAPI_API_KEY:
        return []
    # SerpApi is used only to discover candidate sources. Search snippets are not parsed into specifications.
    terms=" ".join(x for x in [q.get("make"),q.get("model"),str(q.get("year") or ""),q.get("variant"),"official vehicle specifications"] if x)
    try:
        resp=requests.get("https://serpapi.com/search.json",params={"engine":"google","q":terms,"api_key":SERPAPI_API_KEY,"num":5,"gl":"in","hl":"en"},timeout=(5,SERPAPI_TIMEOUT_SECONDS))
        resp.raise_for_status()
        payload=resp.json()
        if payload.get("error"): raise RuntimeError(payload["error"])
    except (requests.RequestException, ValueError, RuntimeError) as exc:
        raise HTTPException(502,f"Vehicle source lookup failed: {exc}") from exc
    results=[]
    for item in payload.get("organic_results",[])[:5]:
        link=item.get("link")
        if not link or not link.startswith(("https://","http://")): continue
        title=str(item.get("title") or "Vehicle specification source")
        results.append({
            "id":"lookup-"+uuid.uuid4().hex[:10],"make":q.get("make") or "Unknown","model":q.get("model") or title[:100],
            "year":q.get("year"),"variant":q.get("variant") or "","category":q.get("category") or "other",
            "lengthM":None,"widthM":None,"heightM":None,"grossVehicleWeightKg":None,"currentLoadedWeightKg":None,
            "specStatus":{"lengthM":"unknown","widthM":"unknown","heightM":"unknown","grossVehicleWeightKg":"unknown","currentLoadedWeightKg":"unknown"},
            "verificationStatus":"unknown","sources":[link],"isIllustrative":False,"updatedAt":datetime.now(timezone.utc).isoformat(),"lastVerifiedAt":None,
            "sourceTitle":title,"sourceSnippet":item.get("snippet","")
        })
    return results

# --------------------------- Defects ---------------------------

@app.get("/defects")
def list_defects(
    status: str | None = None,
    severity_min: int | None = Query(default=None, ge=1, le=5),
    defect_type: str | None = None,
    limit: int = Query(default=500, ge=1, le=2000),
):
    items=get_all("defects")
    if status: items=[d for d in items if d.get("maintenanceStatus")==status]
    if severity_min is not None: items=[d for d in items if d.get("severity",0)>=severity_min]
    if defect_type: items=[d for d in items if d.get("defectType")==defect_type]
    items.sort(key=lambda d:d.get("reportedAt", ""), reverse=True)
    return items[:limit]

@app.post("/defects", status_code=201)
def create_defect(data: NewDefectInput):
    now=datetime.now(timezone.utc).isoformat()
    defect={
        **data.model_dump(),"id":"U-"+uuid.uuid4().hex[:8].upper(),
        "roadSegmentId":nearest_segment(data.latitude,data.longitude),"reportedAt":now,
        "verificationStatus":"unverified","maintenanceStatus":"open","independentReportCount":1,"isUserSubmitted":True,
    }
    put_json("defects",defect["id"],defect)
    return defect

@app.get("/defects/{defect_id}")
def get_defect(defect_id: str):
    item=get_one("defects",defect_id)
    if not item: raise HTTPException(404,"Defect report not found")
    return item

@app.patch("/defects/{defect_id}/status")
def update_defect_status(defect_id: str, update: DefectStatusUpdate):
    item=get_one("defects",defect_id)
    if not item: raise HTTPException(404,"Defect report not found")
    item["maintenanceStatus"]=update.status
    item["statusUpdatedAt"]=datetime.now(timezone.utc).isoformat()
    put_json("defects",defect_id,item)
    return {"id":defect_id,"status":update.status}

@app.post("/defects/{defect_id}/confirm")
def confirm_defect(defect_id: str):
    item=get_one("defects",defect_id)
    if not item: raise HTTPException(404,"Defect report not found")
    item["verificationStatus"]="verified"
    item["verifiedAt"]=datetime.now(timezone.utc).isoformat()
    put_json("defects",defect_id,item)
    return item

@app.post("/defects/{defect_id}/resolve")
def resolve_defect(defect_id: str):
    item=get_one("defects",defect_id)
    if not item: raise HTTPException(404,"Defect report not found")
    item["maintenanceStatus"]="resolved"
    item["resolvedAt"]=datetime.now(timezone.utc).isoformat()
    put_json("defects",defect_id,item)
    return item

# --------------------------- Restrictions and road graph ---------------------------

@app.get("/restrictions")
def list_restrictions():
    return get_all("restrictions")

@app.get("/roads/nearby")
def nearby_roads(lat: float=Query(ge=-90,le=90), lon: float=Query(ge=-180,le=180), radius_m: int=Query(default=1000,ge=50,le=10000)):
    found=[]
    for seg in SEGMENTS:
        distance=min(haversine([lat,lon],p) for p in seg["geometry"])
        if distance<=radius_m: found.append({**seg,"distanceMeters":round(distance)})
    return sorted(found,key=lambda x:x["distanceMeters"])

@app.get("/roads/{segment_id}")
def get_road(segment_id: str):
    segment=SEGMENT_BY_ID.get(segment_id)
    if not segment: raise HTTPException(404,"Road segment not found in the pilot dataset")
    return {**segment,"restrictions":[r for r in get_all("restrictions") if r.get("roadSegmentId")==segment_id],"defects":[d for d in get_all("defects") if d.get("roadSegmentId")==segment_id]}

# --------------------------- Routing ---------------------------

SURFACE_SPEED={"good":34,"fair":27,"poor":19,"unknown":24}
SURFACE_KEYS=("good","fair","poor","unknown")
STATUS_RANK={"suitable":0,"warning":1,"not_validated":1,"unsuitable":3}
CATEGORY_LABEL={"small_car":"small car","sedan":"sedan","suv":"SUV","van":"van","lcv":"light commercial vehicle","heavy_truck":"heavy truck","bus":"bus","motorcycle":"motorcycle","other":"vehicle"}
RESTRICTION_LABEL={"height":"Height limit","width":"Width limit","length":"Length limit","weight":"Weight limit","access":"Access restriction","closure":"Road closure"}

def enumerate_paths(origin,dest,max_depth=6):
    out=[]
    def walk(node,visited,segs):
        if node==dest:
            out.append(list(segs)); return
        if len(segs)>=max_depth: return
        for s in SEGMENTS:
            nxt=s["to"] if s["from"]==node else s["from"] if s["to"]==node else None
            if not nxt or nxt in visited: continue
            visited.add(nxt); segs.append(s["id"]); walk(nxt,visited,segs); segs.pop(); visited.remove(nxt)
    walk(origin,{origin},[])
    return out

def oriented_geometry(seg_ids,origin):
    pts=[]; at=origin
    for sid in seg_ids:
        s=SEGMENT_BY_ID[sid]
        g=s["geometry"] if s["from"]==at else list(reversed(s["geometry"]))
        at=s["to"] if s["from"]==at else s["from"]
        pts.extend(g if not pts else g[1:])
    return pts

def applies(restriction,vehicle):
    ap=restriction.get("appliesTo","all")
    return ap=="all" or (vehicle is not None and vehicle.get("category") in ap)

def vehicle_value(r,v):
    typ=r["restrictionType"]
    if typ=="height": return v.get("heightM")
    if typ=="width": return v.get("widthM")
    if typ=="length": return v.get("lengthM")
    if typ=="weight":
        kg=v.get("currentLoadedWeightKg")
        if kg is None: kg=v.get("grossVehicleWeightKg")
        return kg/1000 if kg is not None else None
    return None

def evaluate_path(seg_ids,vehicle,defects,restrictions):
    warnings=[]; missing=[]; status="suitable"
    def bump(value):
        nonlocal status
        order=["suitable","warning","not_validated","unsuitable"]
        if order.index(value)>order.index(status): status=value
    if vehicle is None:
        bump("not_validated")
        warnings.append({"level":"warning","message":"No vehicle selected — restrictions cannot be checked against this route."})
    else:
        critical=[("widthM","width"),("heightM","height"),("grossVehicleWeightKg","gross vehicle weight")]
        absent=[label for key,label in critical if vehicle.get(key) is None]
        if absent: missing.append("Vehicle "+", ".join(absent)+" not provided")
    for sid in seg_ids:
        seg=SEGMENT_BY_ID[sid]
        if not seg["restrictionDataComplete"]:
            missing.append(f"Restriction data incomplete on {seg['name']}"); bump("warning")
        if seg["widthM"] is None:
            missing.append(f"Road width unknown on {seg['name']}"); bump("warning")
        elif vehicle and vehicle.get("widthM") is not None and seg["widthM"]<6 and vehicle["widthM"]>2.0:
            warnings.append({"level":"warning","segmentId":sid,"message":f"{seg['name']} is narrow ({seg['widthM']} m demo value) for a {vehicle['widthM']} m wide vehicle — passing may be difficult."}); bump("warning")
        for r in [x for x in restrictions if x.get("roadSegmentId")==sid and applies(x,vehicle)]:
            label=RESTRICTION_LABEL.get(r["restrictionType"],r["restrictionType"])
            verified=r.get("verificationStatus")=="verified"
            if r["restrictionType"]=="closure":
                warnings.append({"level":"critical" if verified else "warning","segmentId":sid,"message":f"{label} on {seg['name']}: {r.get('description','')}"}); bump("unsuitable" if verified else "warning"); continue
            if r["restrictionType"]=="access":
                warnings.append({"level":"critical" if verified else "warning","segmentId":sid,"message":f"{label} on {seg['name']} for {CATEGORY_LABEL.get(vehicle.get('category','other'),'vehicle') if vehicle else 'some vehicles'}: {r.get('description','')}"}); bump("unsuitable" if verified else "warning"); continue
            if not vehicle: continue
            val=vehicle_value(r,vehicle)
            if val is None:
                warnings.append({"level":"warning","segmentId":sid,"message":f"{label} of {r.get('limitValue')} {r.get('unit')} on {seg['name']}, but your vehicle's {r['restrictionType']} is unknown — cannot confirm clearance."}); bump("warning"); continue
            limit=r.get("limitValue")
            if limit is not None and val>limit:
                if verified:
                    warnings.append({"level":"critical","segmentId":sid,"message":f"{label} {limit} {r.get('unit')} on {seg['name']}; your vehicle is {val:.2f} {r.get('unit')}. Vehicle is not permitted / cannot pass."}); bump("unsuitable")
                else:
                    warnings.append({"level":"warning","segmentId":sid,"message":f"Unverified {label.lower()} of {limit} {r.get('unit')} on {seg['name']}; your vehicle is {val:.2f} {r.get('unit')}. Confirm before travelling."}); bump("warning")
    hazards=[d for d in defects if d.get("roadSegmentId") in seg_ids and d.get("maintenanceStatus")!="resolved"]
    for h in hazards:
        if h.get("severity",0)>=4:
            warnings.append({"level":"info","segmentId":h.get("roadSegmentId"),"message":f"Severity {h['severity']} {h['defectType'].replace('_',' ')} reported on {SEGMENT_BY_ID.get(h.get('roadSegmentId'),{}).get('name','road')} ({h.get('verificationStatus')})."})
    return warnings,list(dict.fromkeys(missing)),status,hazards

def format_duration(seconds):
    minutes=max(1,round(seconds/60))
    return f"{minutes//60} hr {minutes%60} min" if minutes>=60 else f"{minutes} min"

def route_explanation(route,all_routes):
    fastest=all_routes[0] if all_routes else route
    recommended=next((r for r in all_routes if r["recommended"]),fastest)
    critical=next((w["message"] for w in route["warnings"] if w["level"]=="critical"),None)
    via=", ".join(SEGMENT_BY_ID[sid]["name"] for sid in route["segmentIds"][:2])
    if route["suitabilityStatus"]=="unsuitable": return f"{route['label']} is not usable for this vehicle: {critical or 'a known restriction applies'}"
    compare=fastest if route["recommended"] else recommended
    if compare["id"]==route["id"]:
        return f"{route['label']} (via {via}) is the fastest option with {len(route['knownHazards'])} known hazards ({route['severeHazardCount']} severe)."
    dt=route["durationSeconds"]-compare["durationSeconds"]
    d_severe=compare["severeHazardCount"]-route["severeHazardCount"]
    if d_severe>0: parts=f"{route['label']} avoids {d_severe} reported severe road defect{'s' if d_severe!=1 else ''} compared with {compare['label']}"
    elif d_severe<0: parts=f"{route['label']} passes {-d_severe} more reported severe defects than {compare['label']}"
    else: parts=f"{route['label']} has the same number of severe defects as {compare['label']}"
    if dt>30: parts+=f" but adds approximately {max(1,round(dt/60))} minutes"
    elif dt < -30: parts+=f" but saves approximately {max(1,round(-dt/60))} minutes"
    else: parts+=" and takes about the same time"
    return parts+f". Estimated {format_duration(route['durationSeconds'])}."

@app.post("/routes")
def calculate_routes(req: RouteRequest):
    if req.originId not in NODE_BY_ID: raise HTTPException(422,f"Unknown origin node: {req.originId}")
    if req.destinationId not in NODE_BY_ID: raise HTTPException(422,f"Unknown destination node: {req.destinationId}")
    if req.originId==req.destinationId: return []
    defects=get_all("defects"); restrictions=get_all("restrictions")
    measured=[]
    for path in enumerate_paths(req.originId,req.destinationId):
        dist=duration=0.0; surface={k:0.0 for k in SURFACE_KEYS}
        for sid in path:
            length=segment_length(sid); surf=SEGMENT_BY_ID[sid]["surface"]
            dist+=length; duration+=length/(SURFACE_SPEED[surf]*1000/3600); surface[surf]+=length
        measured.append({"segIds":path,"distance":dist,"duration":duration,"surfaceMeters":surface})
    measured.sort(key=lambda x:x["duration"])
    evaluated=[]
    for candidate in measured[:3]:
        warnings,missing,status,hazards=evaluate_path(candidate["segIds"],req.vehicle.model_dump() if req.vehicle else None,defects,restrictions)
        severe=sum(1 for h in hazards if h.get("severity",0)>=4)
        score=candidate["duration"]
        if req.avoidSevereDefects: score+=severe*600
        if req.preferBetterSurfaces: score+=(candidate["surfaceMeters"]["poor"]/1000)*240+(candidate["surfaceMeters"]["unknown"]/1000)*90
        evaluated.append({**candidate,"warnings":warnings,"missing":missing,"status":status,"hazards":hazards,"severe":severe,"score":score,"statusRank":STATUS_RANK[status]})
    for i,e in enumerate(evaluated): e["label"]=f"Route {chr(65+i)}"
    ranked=sorted(evaluated,key=lambda e:(e["statusRank"],e["score"]))
    recommended_label=ranked[0]["label"] if ranked else None
    result=[]
    for e in evaluated:
        item={
            "id":f"{req.originId}-{req.destinationId}-{'_'.join(e['segIds'])}","label":e["label"],"segmentIds":e["segIds"],
            "distanceMeters":round(e["distance"]),"durationSeconds":round(e["duration"]),"geometry":oriented_geometry(e["segIds"],req.originId),
            "knownHazards":e["hazards"],"severeHazardCount":e["severe"],"warnings":e["warnings"],"missingData":e["missing"],
            "surfaceMeters":{k:round(v) for k,v in e["surfaceMeters"].items()},"suitabilityStatus":e["status"],"recommended":e["label"]==recommended_label,"explanation":""
        }
        result.append(item)
    for item in result: item["explanation"]=route_explanation(item,result)
    return result

# --------------------------- Maintenance analytics ---------------------------

def priority(defect, now=None):
    if defect.get("maintenanceStatus")=="resolved": return 0
    now=now or datetime.now(timezone.utc)
    try: reported=datetime.fromisoformat(defect.get("reportedAt","").replace("Z","+00:00"))
    except Exception: reported=now
    if reported.tzinfo is None: reported=reported.replace(tzinfo=timezone.utc)
    age=max(0,(now-reported).total_seconds()/86400)
    score=defect.get("severity",1)*13+min(defect.get("independentReportCount",1),8)*3.5
    if defect.get("verificationStatus")=="verified": score+=8
    if defect.get("maintenanceStatus")=="open": score+=min(age/3,8)
    if defect.get("maintenanceStatus")=="inspected": score-=10
    return max(0,min(100,round(score)))

def summary(defects):
    return {"total":len(defects),"open":sum(d.get("maintenanceStatus")=="open" for d in defects),"verified":sum(d.get("verificationStatus")=="verified" for d in defects),"underInspection":sum(d.get("maintenanceStatus")=="under_review" for d in defects),"resolved":sum(d.get("maintenanceStatus")=="resolved" for d in defects),"highPriority":sum(priority(d)>=70 for d in defects)}

@app.get("/maintenance/summary")
def maintenance_summary(): return summary(get_all("defects"))

@app.get("/admin/defects")
def admin_defects(status: str | None=None, severity_min: int | None=Query(default=None,ge=1,le=5)):
    items=get_all("defects")
    if status: items=[d for d in items if d.get("maintenanceStatus")==status]
    if severity_min is not None: items=[d for d in items if d.get("severity",0)>=severity_min]
    return sorted(items,key=lambda d:priority(d),reverse=True)

@app.get("/admin/priority-segments")
def priority_segments():
    defects=get_all("defects"); rows=[]
    for seg in SEGMENTS:
        linked=[d for d in defects if d.get("roadSegmentId")==seg["id"] and d.get("maintenanceStatus")!="resolved"]
        if not linked: continue
        rows.append({"roadSegment":seg,"defectCount":len(linked),"maxSeverity":max(d["severity"] for d in linked),"independentReports":sum(d.get("independentReportCount",1) for d in linked),"priority":round(sum(priority(d) for d in linked)/len(linked)),"openDefects":sum(d.get("maintenanceStatus")=="open" for d in linked)})
    return sorted(rows,key=lambda r:r["priority"],reverse=True)

@app.post("/admin/inspections",status_code=201)
def create_inspection(data: InspectionInput):
    defect=get_one("defects",data.defectId)
    if not defect: raise HTTPException(404,"Defect report not found")
    payload={"id":uuid.uuid4().hex,"defectId":data.defectId,"inspectorId":data.inspectorId,"observedCondition":data.observedCondition,"notes":data.notes,"inspectedAt":data.inspectedAt or datetime.now(timezone.utc).isoformat()}
    with connect() as c: c.execute("INSERT INTO inspections(payload) VALUES(?)",(json.dumps(payload),))
    defect["maintenanceStatus"]="inspected"; put_json("defects",data.defectId,defect)
    return payload

@app.post("/admin/repairs",status_code=201)
def create_repair(data: RepairInput):
    defect=get_one("defects",data.defectId)
    if not defect: raise HTTPException(404,"Defect report not found")
    payload={"id":uuid.uuid4().hex,**data.model_dump()}
    with connect() as c: c.execute("INSERT INTO repairs(payload) VALUES(?)",(json.dumps(payload),))
    # Only mark resolved when an explicit completedAt is supplied; never infer repair from age.
    if data.completedAt:
        defect["maintenanceStatus"]="resolved"; defect["resolvedAt"]=data.completedAt; put_json("defects",data.defectId,defect)
    return payload
