import type { LatLng, PilotNode, RoadSegment, SurfaceCondition } from "@/types";

/**
 * Kochi (Kerala) pilot area. All road attributes below are DEMONSTRATION data:
 * widths, surfaces and geometries are illustrative and not surveyed values.
 * Geometries are simplified curves, not real road alignments.
 */
export const PILOT_CENTER: LatLng = [10.015, 76.305];
export const PILOT_ZOOM = 12;

export const NODES: PilotNode[] = [
  { id: "FKC", name: "Fort Kochi", position: [9.9658, 76.2421] },
  { id: "ERS", name: "Ernakulam South", position: [9.969, 76.289] },
  { id: "MGR", name: "MG Road", position: [9.9816, 76.282] },
  { id: "VYT", name: "Vyttila Hub", position: [9.9667, 76.3186] },
  { id: "PLV", name: "Palarivattom", position: [10.003, 76.307] },
  { id: "EDP", name: "Edappally", position: [10.0261, 76.3083] },
  { id: "KLM", name: "Kalamassery", position: [10.053, 76.315] },
  { id: "ALV", name: "Aluva", position: [10.1076, 76.3516] },
  { id: "KKD", name: "Kakkanad", position: [10.0159, 76.3419] },
  { id: "TPR", name: "Thrippunithura", position: [9.945, 76.3467] },
];

export const nodeById = (id: string) => NODES.find((n) => n.id === id);

function curve(a: LatLng, b: LatLng, bend: number): LatLng[] {
  const mid: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  const pts: LatLng[] = [a];
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const off = Math.sin(Math.PI * t) * bend;
    pts.push([a[0] + dLat * t - dLng * off, a[1] + dLng * t + dLat * off]);
  }
  pts.push(b);
  void mid;
  return pts;
}

type SegSeed = [string, string, string, string, string, number | null, SurfaceCondition, boolean, number];
// id, name, area, from, to, widthM, surface, restrictionDataComplete, bend
const SEEDS: SegSeed[] = [
  ["S1", "Thoppumpady Old Bridge Rd", "Thoppumpady", "FKC", "ERS", 7, "fair", true, 0.12],
  ["S2", "Willingdon Island Rd", "Willingdon Island", "FKC", "MGR", null, "fair", false, -0.15],
  ["S3", "Chittoor Rd", "Ernakulam South", "ERS", "MGR", 9, "good", true, 0.1],
  ["S4", "Sahodaran Ayyappan Rd", "Kadavanthra", "ERS", "VYT", 14, "good", true, -0.08],
  ["S5", "Banerji–Kaloor Rd", "Kaloor", "MGR", "PLV", 10, "fair", true, 0.1],
  ["S6", "NH 66 Bypass (Vyttila–Palarivattom)", "Vennala", "VYT", "PLV", 18, "good", true, 0.05],
  ["S7", "NH 66 (Palarivattom–Edappally)", "Palarivattom", "PLV", "EDP", 16, "good", true, -0.06],
  ["S8", "NH 544 (Edappally–Kalamassery)", "Kalamassery", "EDP", "KLM", 14, "fair", true, 0.06],
  ["S9", "NH 544 (Kalamassery–Aluva)", "Aluva", "KLM", "ALV", 14, "good", true, -0.05],
  ["S10", "Petta–Thrippunithura Rd", "Petta", "VYT", "TPR", 10, "poor", true, 0.1],
  ["S11", "Seaport–Airport Rd (South)", "Irumpanam", "TPR", "KKD", 12, "good", true, 0.08],
  ["S12", "Thammanam–Kakkanad Link (rail underpass)", "Thammanam", "VYT", "KKD", 5.5, "poor", true, -0.12],
  ["S13", "Civil Line Rd", "Padivattom", "PLV", "KKD", 11, "fair", true, 0.08],
  ["S14", "HMT Rd", "HMT Colony", "KKD", "KLM", null, "unknown", false, -0.1],
  ["S15", "Edappally–Kakkanad Rd", "Vazhakkala", "EDP", "KKD", 9, "fair", true, 0.1],
  ["S16", "Seaport–Airport Rd (North)", "Thrikkakara North", "KKD", "ALV", 8, "poor", false, 0.12],
];

export const SEGMENTS: RoadSegment[] = SEEDS.map(([id, name, area, from, to, widthM, surface, complete, bend]) => ({
  id,
  name,
  area,
  from,
  to,
  widthM,
  surface,
  restrictionDataComplete: complete,
  geometry: curve(nodeById(from)!.position, nodeById(to)!.position, bend),
}));

export const segmentById = (id: string | null | undefined) =>
  id ? SEGMENTS.find((s) => s.id === id) : undefined;

/** Point at fraction t along a segment's polyline. */
export function pointOnSegment(id: string, t: number): LatLng {
  const g = segmentById(id)!.geometry;
  const scaled = t * (g.length - 1);
  const i = Math.min(Math.floor(scaled), g.length - 2);
  const f = scaled - i;
  return [g[i][0] + (g[i + 1][0] - g[i][0]) * f, g[i][1] + (g[i + 1][1] - g[i][1]) * f];
}

export function segmentMidpoint(id: string): LatLng {
  return pointOnSegment(id, 0.5);
}

export const AREAS = Array.from(new Set(SEGMENTS.map((s) => s.area))).sort();
