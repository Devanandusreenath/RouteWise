/**
 * Central API client. When VITE_API_BASE_URL is set, every call goes to the FastAPI backend and
 * failures surface as errors (never silently replaced by mock data). When it is not set, the app
 * runs in explicit DEMO MODE backed by local mock data.
 * Secrets (e.g. SerpApi keys for vehicle lookup) must live on the backend only.
 */
import { MOCK_DEFECTS, MOCK_RESTRICTIONS, MOCK_VEHICLES, VEHICLE_CATALOG } from "@/data/mock";
import { computeRoutes } from "@/lib/routing";
import { summarize } from "@/lib/maintenance";
import { nearestSegment } from "@/lib/routing";
import type {
  MaintenanceStatus,
  MaintenanceSummary,
  NewDefectInput,
  RoadDefect,
  RoadRestriction,
  RouteOption,
  RouteRequest,
  VehicleCategory,
  VehicleProfile,
} from "@/types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
export const isDemoMode = !BASE_URL;

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("RouteWise backend is unreachable. Check your connection or the API URL.");
  }
  if (!res.ok) throw new ApiError(`Backend error ${res.status} on ${path}`, res.status);
  return res.json() as Promise<T>;
}

const delay = <T,>(v: T, ms = 350) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export interface VehicleLookupQuery {
  make?: string;
  model?: string;
  year?: number | null;
  variant?: string;
  category?: VehicleCategory | "";
}

export async function getVehicles(): Promise<VehicleProfile[]> {
  if (isDemoMode) return delay(clone(MOCK_VEHICLES));
  return http("/vehicles");
}

export async function lookupVehicle(q: VehicleLookupQuery): Promise<VehicleProfile[]> {
  if (!isDemoMode) return http("/vehicles/lookup", { method: "POST", body: JSON.stringify(q) });
  const has = (a: string, b?: string) => !b || a.toLowerCase().includes(b.trim().toLowerCase());
  const results = VEHICLE_CATALOG.filter(
    (v) =>
      has(v.make, q.make) &&
      has(v.model, q.model) &&
      has(v.variant, q.variant) &&
      (!q.year || v.year === q.year) &&
      (!q.category || v.category === q.category),
  );
  return delay(clone(results), 600);
}

export async function saveVehicle(v: VehicleProfile): Promise<VehicleProfile> {
  const saved = { ...v, updatedAt: new Date().toISOString() };
  if (isDemoMode) return delay(saved, 250);
  return http("/vehicles", { method: "PUT", body: JSON.stringify(saved) });
}

export async function calculateRoutes(
  req: RouteRequest,
  ctx: { defects: RoadDefect[]; restrictions: RoadRestriction[] },
): Promise<RouteOption[]> {
  if (isDemoMode) return delay(computeRoutes(req, ctx.defects, ctx.restrictions), 700);
  return http("/routes", { method: "POST", body: JSON.stringify(req) });
}

export async function getRoadDefects(): Promise<RoadDefect[]> {
  if (isDemoMode) return delay(clone(MOCK_DEFECTS));
  return http("/defects");
}

export async function createRoadDefect(input: NewDefectInput): Promise<RoadDefect> {
  if (!isDemoMode) return http("/defects", { method: "POST", body: JSON.stringify(input) });
  const now = new Date().toISOString();
  return delay(
    {
      ...input,
      id: `U-${crypto.randomUUID().slice(0, 8)}`,
      roadSegmentId: nearestSegment([input.latitude, input.longitude]),
      reportedAt: now,
      verificationStatus: "unverified",
      maintenanceStatus: "open",
      independentReportCount: 1,
      isUserSubmitted: true,
    },
    500,
  );
}

export async function getRoadRestrictions(): Promise<RoadRestriction[]> {
  if (isDemoMode) return delay(clone(MOCK_RESTRICTIONS));
  return http("/restrictions");
}

export async function getMaintenanceSummary(defects: RoadDefect[]): Promise<MaintenanceSummary> {
  if (isDemoMode) return summarize(defects);
  return http("/maintenance/summary");
}

export async function updateDefectStatus(id: string, status: MaintenanceStatus): Promise<{ id: string; status: MaintenanceStatus }> {
  if (isDemoMode) return delay({ id, status }, 200);
  return http(`/defects/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}
