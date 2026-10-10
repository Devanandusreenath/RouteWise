export type LatLng = [number, number];

export type VehicleCategory =
  | "small_car"
  | "sedan"
  | "suv"
  | "van"
  | "lcv"
  | "heavy_truck"
  | "bus"
  | "motorcycle"
  | "other";

/** How trustworthy an individual value or profile is. */
export type SpecStatus = "verified" | "user_confirmed" | "estimated" | "unknown";

export type SpecKey =
  | "lengthM"
  | "widthM"
  | "heightM"
  | "grossVehicleWeightKg"
  | "currentLoadedWeightKg";

export interface VehicleProfile {
  id: string;
  make: string;
  model: string;
  year: number | null;
  variant: string;
  category: VehicleCategory;
  lengthM: number | null;
  widthM: number | null;
  heightM: number | null;
  grossVehicleWeightKg: number | null;
  currentLoadedWeightKg: number | null;
  specStatus: Record<SpecKey, SpecStatus>;
  verificationStatus: SpecStatus;
  sources: string[];
  isIllustrative: boolean;
  updatedAt: string;
  lastVerifiedAt: string | null;
}

export type DefectType =
  | "pothole"
  | "damaged_surface"
  | "cracked_road"
  | "waterlogging"
  | "damaged_edge"
  | "obstruction"
  | "clearance_issue"
  | "other";

export type VerificationStatus = "verified" | "unverified";
export type MaintenanceStatus = "open" | "under_review" | "inspected" | "resolved";

export interface RoadDefect {
  id: string;
  latitude: number;
  longitude: number;
  roadSegmentId: string | null;
  defectType: DefectType;
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
  photoUrl: string | null;
  observedAt: string;
  reportedAt: string;
  verificationStatus: VerificationStatus;
  maintenanceStatus: MaintenanceStatus;
  independentReportCount: number;
  isUserSubmitted?: boolean;
}

export type RestrictionType = "height" | "width" | "weight" | "length" | "access" | "closure";

export interface RoadRestriction {
  id: string;
  roadSegmentId: string;
  restrictionType: RestrictionType;
  limitValue: number | null;
  unit: "m" | "t" | null;
  appliesTo: VehicleCategory[] | "all";
  description: string;
  source: string;
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
}

export type SurfaceCondition = "good" | "fair" | "poor" | "unknown";

export interface PilotNode {
  id: string;
  name: string;
  position: LatLng;
}

export interface RoadSegment {
  id: string;
  name: string;
  area: string;
  from: string;
  to: string;
  geometry: LatLng[];
  widthM: number | null;
  surface: SurfaceCondition;
  restrictionDataComplete: boolean;
}

export type SuitabilityStatus = "suitable" | "warning" | "unsuitable" | "not_validated";

export interface RouteWarning {
  level: "critical" | "warning" | "info";
  message: string;
  segmentId?: string;
}

export interface RouteOption {
  id: string;
  label: string;
  segmentIds: string[];
  distanceMeters: number;
  durationSeconds: number;
  geometry: LatLng[];
  knownHazards: RoadDefect[];
  severeHazardCount: number;
  warnings: RouteWarning[];
  missingData: string[];
  surfaceMeters: Record<SurfaceCondition, number>;
  suitabilityStatus: SuitabilityStatus;
  recommended: boolean;
  explanation: string;
}

export interface RouteRequest {
  originId: string;
  destinationId: string;
  vehicle: VehicleProfile | null;
  avoidSevereDefects: boolean;
  preferBetterSurfaces: boolean;
}

export interface MaintenanceSummary {
  total: number;
  open: number;
  verified: number;
  underInspection: number;
  resolved: number;
  highPriority: number;
}

export interface AppSettings {
  preferredVehicleId: string | null;
  units: "km" | "mi";
  mapStyle: "dark" | "standard";
  clusterMarkers: boolean;
  showRestrictions: boolean;
  defectNotifications: boolean;
}

export interface NewDefectInput {
  defectType: DefectType;
  latitude: number;
  longitude: number;
  severity: RoadDefect["severity"];
  description: string;
  photoUrl: string | null;
  observedAt: string;
}
