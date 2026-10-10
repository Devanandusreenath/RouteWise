import { SEGMENTS, nodeById, segmentById } from "@/data/pilot";
import { CATEGORY_LABEL, RESTRICTION_LABEL, formatDuration, missingCriticalSpecs } from "@/lib/format";
import type {
  LatLng,
  RoadDefect,
  RoadRestriction,
  RouteOption,
  RouteRequest,
  RouteWarning,
  SuitabilityStatus,
  SurfaceCondition,
  VehicleProfile,
} from "@/types";

/**
 * Demo route engine. Enumerates paths over the small pilot road graph and evaluates them
 * against vehicle specs, restrictions and defects. The FastAPI backend will replace this.
 */

const ROAD_FACTOR = 1.2;
const SPEED_KMH: Record<SurfaceCondition, number> = { good: 34, fair: 27, poor: 19, unknown: 24 };

export function haversine(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function segmentLength(id: string) {
  const g = segmentById(id)!.geometry;
  let d = 0;
  for (let i = 1; i < g.length; i++) d += haversine(g[i - 1], g[i]);
  return d * ROAD_FACTOR;
}

function enumeratePaths(origin: string, dest: string, maxDepth = 6): string[][] {
  const out: string[][] = [];
  const walk = (node: string, visited: Set<string>, segs: string[]) => {
    if (node === dest) {
      out.push([...segs]);
      return;
    }
    if (segs.length >= maxDepth) return;
    for (const s of SEGMENTS) {
      const next = s.from === node ? s.to : s.to === node ? s.from : null;
      if (!next || visited.has(next)) continue;
      visited.add(next);
      segs.push(s.id);
      walk(next, visited, segs);
      segs.pop();
      visited.delete(next);
    }
  };
  walk(origin, new Set([origin]), []);
  return out;
}

function orientedGeometry(segIds: string[], origin: string): LatLng[] {
  const pts: LatLng[] = [];
  let at = origin;
  for (const id of segIds) {
    const s = segmentById(id)!;
    const g = s.from === at ? s.geometry : [...s.geometry].reverse();
    at = s.from === at ? s.to : s.from;
    pts.push(...(pts.length ? g.slice(1) : g));
  }
  return pts;
}

function applies(r: RoadRestriction, v: VehicleProfile | null) {
  if (r.appliesTo === "all") return true;
  return !!v && r.appliesTo.includes(v.category);
}

function vehicleValue(r: RoadRestriction, v: VehicleProfile): number | null {
  switch (r.restrictionType) {
    case "height":
      return v.heightM;
    case "width":
      return v.widthM;
    case "length":
      return v.lengthM;
    case "weight": {
      const kg = v.currentLoadedWeightKg ?? v.grossVehicleWeightKg;
      return kg == null ? null : kg / 1000;
    }
    default:
      return null;
  }
}

function evaluate(
  segIds: string[],
  vehicle: VehicleProfile | null,
  defects: RoadDefect[],
  restrictions: RoadRestriction[],
) {
  const warnings: RouteWarning[] = [];
  const missing: string[] = [];
  let status: SuitabilityStatus = "suitable";
  const bump = (s: SuitabilityStatus) => {
    const order: SuitabilityStatus[] = ["suitable", "warning", "not_validated", "unsuitable"];
    if (order.indexOf(s) > order.indexOf(status)) status = s;
  };

  if (!vehicle) {
    bump("not_validated");
    warnings.push({ level: "warning", message: "No vehicle selected — restrictions cannot be checked against this route." });
  } else {
    const miss = missingCriticalSpecs(vehicle);
    if (miss.length) missing.push(`Vehicle ${miss.join(", ")} not provided`);
  }

  for (const id of segIds) {
    const seg = segmentById(id)!;
    if (!seg.restrictionDataComplete) {
      missing.push(`Restriction data incomplete on ${seg.name}`);
      bump("warning");
    }
    if (seg.widthM == null) {
      missing.push(`Road width unknown on ${seg.name}`);
      bump("warning");
    } else if (vehicle?.widthM != null && seg.widthM < 6 && vehicle.widthM > 2.0) {
      warnings.push({
        level: "warning",
        segmentId: id,
        message: `${seg.name} is narrow (${seg.widthM} m demo value) for a ${vehicle.widthM} m wide vehicle — passing may be difficult.`,
      });
      bump("warning");
    }

    for (const r of restrictions.filter((x) => x.roadSegmentId === id && applies(x, vehicle))) {
      const label = RESTRICTION_LABEL[r.restrictionType];
      if (r.restrictionType === "closure") {
        warnings.push({
          level: r.verificationStatus === "verified" ? "critical" : "warning",
          segmentId: id,
          message: `${label} on ${seg.name}: ${r.description}.`,
        });
        bump(r.verificationStatus === "verified" ? "unsuitable" : "warning");
        continue;
      }
      if (r.restrictionType === "access") {
        const verified = r.verificationStatus === "verified";
        warnings.push({
          level: verified ? "critical" : "warning",
          segmentId: id,
          message: `${label} on ${seg.name} for ${vehicle ? CATEGORY_LABEL[vehicle.category].toLowerCase() : "some vehicles"}: ${r.description}.`,
        });
        bump(verified ? "unsuitable" : "warning");
        continue;
      }
      if (!vehicle) continue;
      const val = vehicleValue(r, vehicle);
      if (val == null) {
        warnings.push({
          level: "warning",
          segmentId: id,
          message: `${label} of ${r.limitValue} ${r.unit} on ${seg.name}, but your vehicle's ${r.restrictionType} is unknown — cannot confirm clearance.`,
        });
        bump("warning");
        continue;
      }
      if (r.limitValue != null && val > r.limitValue) {
        if (r.verificationStatus === "verified") {
          warnings.push({
            level: "critical",
            segmentId: id,
            message: `${label} ${r.limitValue} ${r.unit} on ${seg.name}; your vehicle is ${val.toFixed(2)} ${r.unit}. Vehicle is not permitted / cannot pass.`,
          });
          bump("unsuitable");
        } else {
          warnings.push({
            level: "warning",
            segmentId: id,
            message: `Unverified ${label.toLowerCase()} of ${r.limitValue} ${r.unit} on ${seg.name}; your vehicle is ${val.toFixed(2)} ${r.unit}. Confirm before travelling.`,
          });
          bump("warning");
        }
      }
    }
  }

  const hazards = defects.filter((d) => d.roadSegmentId && segIds.includes(d.roadSegmentId) && d.maintenanceStatus !== "resolved");
  for (const h of hazards.filter((h) => h.severity >= 4)) {
    warnings.push({
      level: "info",
      segmentId: h.roadSegmentId ?? undefined,
      message: `Severity ${h.severity} ${h.defectType.replace("_", " ")} reported on ${segmentById(h.roadSegmentId)?.name} (${h.verificationStatus}).`,
    });
  }
  return { warnings, missing: Array.from(new Set(missing)), status, hazards };
}

export function computeRoutes(
  req: RouteRequest,
  defects: RoadDefect[],
  restrictions: RoadRestriction[],
): RouteOption[] {
  if (req.originId === req.destinationId) return [];
  const paths = enumeratePaths(req.originId, req.destinationId);
  const measured = paths.map((segIds) => {
    let distance = 0;
    let duration = 0;
    const surfaceMeters: Record<SurfaceCondition, number> = { good: 0, fair: 0, poor: 0, unknown: 0 };
    for (const id of segIds) {
      const len = segmentLength(id);
      const surf = segmentById(id)!.surface;
      distance += len;
      duration += len / ((SPEED_KMH[surf] * 1000) / 3600);
      surfaceMeters[surf] += len;
    }
    return { segIds, distance, duration, surfaceMeters };
  });
  measured.sort((a, b) => a.duration - b.duration);
  const candidates = measured.slice(0, 3);

  const evaluated = candidates.map((c) => {
    const ev = evaluate(c.segIds, req.vehicle, defects, restrictions);
    const severe = ev.hazards.filter((h) => h.severity >= 4).length;
    let score = c.duration;
    if (req.avoidSevereDefects) score += severe * 600;
    if (req.preferBetterSurfaces) score += (c.surfaceMeters.poor / 1000) * 240 + (c.surfaceMeters.unknown / 1000) * 90;
    const statusRank = { suitable: 0, warning: 1, not_validated: 1, unsuitable: 3 }[ev.status];
    return { ...c, ev, severe, score, statusRank };
  });

  // Letters assigned by speed (A = fastest); recommendation by suitability then score.
  const lettered = evaluated.map((e, i) => ({ ...e, label: `Route ${String.fromCharCode(65 + i)}` }));
  const ranked = [...lettered].sort((a, b) => a.statusRank - b.statusRank || a.score - b.score);
  const recId = ranked[0]?.label;

  const options: RouteOption[] = lettered.map((e) => ({
    id: `${req.originId}-${req.destinationId}-${e.segIds.join("_")}`,
    label: e.label,
    segmentIds: e.segIds,
    distanceMeters: Math.round(e.distance),
    durationSeconds: Math.round(e.duration),
    geometry: orientedGeometry(e.segIds, req.originId),
    knownHazards: e.ev.hazards,
    severeHazardCount: e.severe,
    warnings: e.ev.warnings,
    missingData: e.ev.missing,
    surfaceMeters: e.surfaceMeters,
    suitabilityStatus: e.ev.status,
    recommended: e.label === recId,
    explanation: "",
  }));
  for (const o of options) o.explanation = explain(o, options);
  return options;
}

const mins = (s: number) => Math.max(1, Math.round(Math.abs(s) / 60));

export function explain(route: RouteOption, all: RouteOption[]): string {
  const fastest = all[0];
  const rec = all.find((r) => r.recommended) ?? fastest;
  const firstCritical = (r: RouteOption) => r.warnings.find((w) => w.level === "critical")?.message;
  const via = route.segmentIds.map((id) => segmentById(id)?.name).filter(Boolean).slice(0, 2).join(", ");

  if (route.suitabilityStatus === "unsuitable") {
    return `${route.label} is not usable for this vehicle: ${firstCritical(route) ?? "a known restriction applies"}`;
  }
  const compareTo = route.recommended ? fastest : rec;
  if (compareTo.id === route.id) {
    return `${route.label} (via ${via}) is the fastest option with ${route.knownHazards.length} known hazard${route.knownHazards.length === 1 ? "" : "s"} (${route.severeHazardCount} severe).`;
  }
  const dt = route.durationSeconds - compareTo.durationSeconds;
  const dSevere = compareTo.severeHazardCount - route.severeHazardCount;
  const parts: string[] = [];
  if (compareTo.suitabilityStatus === "unsuitable") {
    parts.push(`${compareTo.label} is ${dt > 0 ? "faster" : "slower"} but unsuitable for this vehicle`);
  } else if (dSevere > 0) {
    parts.push(`${route.label} avoids ${dSevere} reported severe road defect${dSevere === 1 ? "" : "s"} compared with ${compareTo.label}`);
  } else if (dSevere < 0) {
    parts.push(`${route.label} passes ${-dSevere} more reported severe defect${dSevere === -1 ? "" : "s"} than ${compareTo.label}`);
  } else {
    parts.push(`${route.label} has the same number of severe defects as ${compareTo.label}`);
  }
  if (dt > 30) parts.push(`adds approximately ${mins(dt)} minutes`);
  else if (dt < -30) parts.push(`saves approximately ${mins(dt)} minutes`);
  else parts.push("takes about the same time");
  return `${parts.join(" but ")}. Estimated ${formatDuration(route.durationSeconds)}.`;
}

/** Snap a point to the nearest pilot segment (within maxM metres). */
export function nearestSegment(p: LatLng, maxM = 700): string | null {
  let best: { id: string; d: number } | null = null;
  for (const s of SEGMENTS) {
    for (const g of s.geometry) {
      const d = haversine(p, g);
      if (!best || d < best.d) best = { id: s.id, d };
    }
  }
  return best && best.d <= maxM ? best.id : null;
}

export const nodeName = (id: string) => nodeById(id)?.name ?? id;
