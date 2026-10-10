import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { PILOT_CENTER, PILOT_ZOOM, segmentById, segmentMidpoint } from "@/data/pilot";
import { DEFECT_LABEL, MAINT_LABEL, RESTRICTION_LABEL, formatDateTime } from "@/lib/format";
import type { LatLng, RoadDefect, RoadRestriction, SuitabilityStatus } from "@/types";

export interface MapRoute {
  id: string;
  label: string;
  geometry: LatLng[];
  selected: boolean;
  status: SuitabilityStatus;
}

export interface MapViewProps {
  defects?: RoadDefect[];
  restrictions?: RoadRestriction[];
  routes?: MapRoute[];
  origin?: { position: LatLng; name: string } | null;
  destination?: { position: LatLng; name: string } | null;
  picked?: LatLng | null;
  onPick?: (p: LatLng) => void;
  onRouteClick?: (id: string) => void;
  onDefectClick?: (id: string) => void;
  selectedDefectId?: string | null;
  cluster?: boolean;
  heat?: boolean;
  mapStyle?: "dark" | "standard";
  fitTo?: LatLng[] | null;
}

const pin = (cls: string, text: string) =>
  L.divIcon({ className: "", html: `<div class="rw-pin ${cls}">${text}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });

const restrictionIcon = (closure: boolean) =>
  L.divIcon({
    className: "",
    html: `<div class="rw-restriction ${closure ? "rw-restriction-closure" : ""}"><span>${closure ? "×" : "!"}</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

function ClickPicker({ onPick }: { onPick?: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick?.([e.latlng.lat, e.latlng.lng]) });
  return null;
}

function FitBounds({ pts }: { pts?: LatLng[] | null }) {
  const map = useMap();
  const key = pts?.length ? `${pts[0]}-${pts[pts.length - 1]}-${pts.length}` : "";
  useEffect(() => {
    if (pts && pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function DefectPopup({ d }: { d: RoadDefect }) {
  return (
    <div className="space-y-1">
      <div className="font-semibold">
        {DEFECT_LABEL[d.defectType]} · Severity {d.severity}/5
      </div>
      <div className="text-xs opacity-80">{segmentById(d.roadSegmentId)?.name ?? "Unmatched road segment"}</div>
      <div className="text-xs">Observed {formatDateTime(d.observedAt)} · Reported {formatDateTime(d.reportedAt)}</div>
      <div className="text-xs">
        {d.verificationStatus === "verified" ? "Verified" : "Unverified"} · {MAINT_LABEL[d.maintenanceStatus]} · {d.independentReportCount} report
        {d.independentReportCount === 1 ? "" : "s"}
      </div>
      {d.description && <p className="text-xs">{d.description}</p>}
      {d.photoUrl && <img src={d.photoUrl} alt="Reported defect" className="mt-1 max-h-28 rounded" />}
      <div className="text-[10px] opacity-60">{d.isUserSubmitted ? "Your demo submission" : "Sample demo record"}</div>
    </div>
  );
}

function DefectMarker({ d, selected, heat, onClick }: { d: RoadDefect; selected: boolean; heat?: boolean; onClick?: (id: string) => void }) {
  const cls = [
    "hz",
    `hz-sev-${d.severity}`,
    d.verificationStatus === "unverified" ? "hz-unverified" : "",
    d.maintenanceStatus === "resolved" ? "hz-resolved" : "",
    selected ? "hz-selected" : "",
  ].join(" ");
  return (
    <>
      {heat && d.maintenanceStatus !== "resolved" && (
        <CircleMarker
          center={[d.latitude, d.longitude]}
          radius={12 + d.severity * 5 + Math.min(d.independentReportCount, 10) * 1.5}
          pathOptions={{ className: `hz-heat hz-sev-${d.severity}`, fillOpacity: 0.28 }}
          interactive={false}
        />
      )}
      <CircleMarker
        center={[d.latitude, d.longitude]}
        radius={5 + d.severity * 1.4}
        pathOptions={{ className: cls, fillOpacity: 0.95 }}
        eventHandlers={{ click: () => onClick?.(d.id) }}
      >
        <Popup>
          <DefectPopup d={d} />
        </Popup>
      </CircleMarker>
    </>
  );
}

function ClusteredDefects({ defects, selectedId, onClick, heat }: { defects: RoadDefect[]; selectedId?: string | null; onClick?: (id: string) => void; heat?: boolean }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const groups = useMemo(() => {
    const out: RoadDefect[][] = [];
    const px = defects.map((d) => map.project([d.latitude, d.longitude], zoom));
    const used = new Set<number>();
    defects.forEach((_, i) => {
      if (used.has(i)) return;
      const g = [defects[i]];
      used.add(i);
      defects.forEach((__, j) => {
        if (!used.has(j) && px[i].distanceTo(px[j]) < 34) {
          g.push(defects[j]);
          used.add(j);
        }
      });
      out.push(g);
    });
    return out;
  }, [defects, zoom, map]);

  return (
    <>
      {groups.map((g) => {
        if (g.length === 1) return <DefectMarker key={g[0].id} d={g[0]} selected={selectedId === g[0].id} onClick={onClick} heat={heat} />;
        const lat = g.reduce((s, d) => s + d.latitude, 0) / g.length;
        const lng = g.reduce((s, d) => s + d.longitude, 0) / g.length;
        return (
          <Marker
            key={g.map((d) => d.id).join("-")}
            position={[lat, lng]}
            icon={L.divIcon({ className: "", html: `<div class="rw-cluster">${g.length}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] })}
            eventHandlers={{ click: () => map.flyTo([lat, lng], Math.min(zoom + 2, 18)) }}
          >
            <Tooltip>{g.length} reports here — click to zoom in</Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

export default function MapView(props: MapViewProps) {
  const {
    defects = [],
    restrictions = [],
    routes = [],
    origin,
    destination,
    picked,
    onPick,
    onRouteClick,
    onDefectClick,
    selectedDefectId,
    cluster,
    heat,
    mapStyle = "dark",
    fitTo,
  } = props;

  const sortedRoutes = [...routes].sort((a, b) => Number(a.selected) - Number(b.selected));

  return (
    <MapContainer center={PILOT_CENTER} zoom={PILOT_ZOOM} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className={mapStyle === "dark" ? "rw-tiles-dark" : ""}
      />
      <ClickPicker onPick={onPick} />
      <FitBounds pts={fitTo} />

      {sortedRoutes.map((r) => (
        <Polyline
          key={r.id + r.selected}
          positions={r.geometry}
          pathOptions={{ className: `rw-route ${r.selected ? "rw-route-selected" : ""} ${r.status === "unsuitable" ? "rw-route-unsuitable" : ""}` }}
          eventHandlers={{ click: () => onRouteClick?.(r.id) }}
        >
          <Tooltip sticky>{r.label} — demonstration geometry</Tooltip>
        </Polyline>
      ))}

      {restrictions.map((r) => (
        <Marker key={r.id} position={segmentMidpoint(r.roadSegmentId)} icon={restrictionIcon(r.restrictionType === "closure")}>
          <Popup>
            <div className="space-y-1">
              <div className="font-semibold">
                {RESTRICTION_LABEL[r.restrictionType]}
                {r.limitValue != null ? ` · ${r.limitValue} ${r.unit}` : ""}
              </div>
              <div className="text-xs opacity-80">{segmentById(r.roadSegmentId)?.name}</div>
              <p className="text-xs">{r.description}</p>
              <div className="text-xs">
                {r.verificationStatus === "verified" ? "Confirmed" : "Unverified"} · {r.source}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {cluster ? (
        <ClusteredDefects defects={defects} selectedId={selectedDefectId} onClick={onDefectClick} heat={heat} />
      ) : (
        defects.map((d) => <DefectMarker key={d.id} d={d} selected={selectedDefectId === d.id} onClick={onDefectClick} heat={heat} />)
      )}

      {origin && (
        <Marker position={origin.position} icon={pin("rw-pin-origin", "A")}>
          <Tooltip>Start: {origin.name}</Tooltip>
        </Marker>
      )}
      {destination && (
        <Marker position={destination.position} icon={pin("rw-pin-dest", "B")}>
          <Tooltip>Destination: {destination.name}</Tooltip>
        </Marker>
      )}
      {picked && (
        <Marker position={picked} icon={pin("rw-pin-pick", "•")}>
          <Tooltip permanent direction="top" offset={[0, -14]}>
            Report location
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}
