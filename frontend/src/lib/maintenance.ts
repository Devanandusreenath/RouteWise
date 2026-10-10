import type { MaintenanceSummary, RoadDefect } from "@/types";
import { ageDays } from "./format";

/**
 * Decision-support inspection priority (0–100). NOT an engineering safety rating.
 * Age raises priority for unaddressed items; age never resolves a defect.
 */
export function inspectionPriority(d: RoadDefect, now = Date.now()): number {
  if (d.maintenanceStatus === "resolved") return 0;
  let score = d.severity * 13;
  score += Math.min(d.independentReportCount, 8) * 3.5;
  if (d.verificationStatus === "verified") score += 8;
  const age = ageDays(d.reportedAt, now);
  if (d.maintenanceStatus === "open") score += Math.min(age / 3, 8);
  if (d.maintenanceStatus === "inspected") score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function priorityBand(score: number): "High" | "Medium" | "Low" | "—" {
  if (score === 0) return "—";
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export function summarize(defects: RoadDefect[], now = Date.now()): MaintenanceSummary {
  return {
    total: defects.length,
    open: defects.filter((d) => d.maintenanceStatus === "open").length,
    verified: defects.filter((d) => d.verificationStatus === "verified").length,
    underInspection: defects.filter((d) => d.maintenanceStatus === "under_review").length,
    resolved: defects.filter((d) => d.maintenanceStatus === "resolved").length,
    highPriority: defects.filter((d) => inspectionPriority(d, now) >= 70).length,
  };
}
