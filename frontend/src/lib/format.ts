import type {
  DefectType,
  MaintenanceStatus,
  RestrictionType,
  SpecStatus,
  SuitabilityStatus,
  VehicleCategory,
  VehicleProfile,
} from "@/types";

export const CATEGORY_LABEL: Record<VehicleCategory, string> = {
  small_car: "Small car",
  sedan: "Sedan",
  suv: "SUV",
  van: "Van",
  lcv: "Light commercial vehicle",
  heavy_truck: "Heavy truck",
  bus: "Bus",
  motorcycle: "Motorcycle",
  other: "Other",
};

export const DEFECT_LABEL: Record<DefectType, string> = {
  pothole: "Pothole",
  damaged_surface: "Damaged surface",
  cracked_road: "Cracked road",
  waterlogging: "Waterlogging",
  damaged_edge: "Damaged road edge",
  obstruction: "Obstruction",
  clearance_issue: "Suspected clearance issue",
  other: "Other",
};

export const MAINT_LABEL: Record<MaintenanceStatus, string> = {
  open: "Open",
  under_review: "Under review",
  inspected: "Inspected",
  resolved: "Resolved",
};

export const SPEC_LABEL: Record<SpecStatus, string> = {
  verified: "Verified",
  user_confirmed: "User-confirmed",
  estimated: "Estimated",
  unknown: "Unknown",
};

export const RESTRICTION_LABEL: Record<RestrictionType, string> = {
  height: "Height limit",
  width: "Width limit",
  weight: "Weight limit",
  length: "Length limit",
  access: "Access restriction",
  closure: "Road closure",
};

export const SUITABILITY_LABEL: Record<SuitabilityStatus, string> = {
  suitable: "Suitable based on available data",
  warning: "Warning: incomplete road information",
  unsuitable: "Unsuitable due to a known restriction",
  not_validated: "Route could not be validated",
};

export function formatDistance(m: number, units: "km" | "mi") {
  if (units === "mi") return `${(m / 1609.34).toFixed(1)} mi`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatDuration(s: number) {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export function timeAgo(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const h = diff / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`;
  if (h < 24) return `${Math.round(h)} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function ageDays(iso: string, now = Date.now()) {
  return (now - new Date(iso).getTime()) / 86_400_000;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export const vehicleName = (v: VehicleProfile) =>
  `${v.make} ${v.model}${v.year ? ` ${v.year}` : ""}${v.variant ? ` · ${v.variant}` : ""}`;

/** Critical specs required for restriction checks. */
export function missingCriticalSpecs(v: VehicleProfile): string[] {
  const out: string[] = [];
  if (v.heightM == null) out.push("height");
  if (v.widthM == null) out.push("width");
  if (v.lengthM == null) out.push("length");
  if (v.grossVehicleWeightKg == null && v.currentLoadedWeightKg == null) out.push("weight");
  return out;
}
