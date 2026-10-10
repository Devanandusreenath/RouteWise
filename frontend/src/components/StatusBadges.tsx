import { AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPEC_LABEL, SUITABILITY_LABEL, MAINT_LABEL } from "@/lib/format";
import type { MaintenanceStatus, SpecStatus, SuitabilityStatus } from "@/types";

const tone = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  info: "bg-info/15 text-info border-info/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export function Pill({ t, children, className }: { t: keyof typeof tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", tone[t], className)}>
      {children}
    </span>
  );
}

export function SuitabilityBadge({ status }: { status: SuitabilityStatus }) {
  const map = {
    suitable: { t: "success" as const, I: CheckCircle2 },
    warning: { t: "warning" as const, I: AlertTriangle },
    unsuitable: { t: "danger" as const, I: AlertOctagon },
    not_validated: { t: "muted" as const, I: HelpCircle },
  }[status];
  return (
    <Pill t={map.t}>
      <map.I className="size-3" />
      {SUITABILITY_LABEL[status]}
    </Pill>
  );
}

export function SpecBadge({ status }: { status: SpecStatus }) {
  const t = { verified: "success", user_confirmed: "info", estimated: "warning", unknown: "danger" }[status] as keyof typeof tone;
  return <Pill t={t}>{SPEC_LABEL[status]}</Pill>;
}

export function MaintBadge({ status }: { status: MaintenanceStatus }) {
  const t = { open: "danger", under_review: "warning", inspected: "info", resolved: "success" }[status] as keyof typeof tone;
  return <Pill t={t}>{MAINT_LABEL[status]}</Pill>;
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return <Pill t={verified ? "success" : "muted"}>{verified ? "Verified" : "Unverified"}</Pill>;
}

export function SeverityDot({ s }: { s: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      <span className={`sev-dot-${s} inline-block size-2.5 rounded-full`} />
      {s}
    </span>
  );
}

export function DemoTag({ className }: { className?: string }) {
  return <Pill t="info" className={className}>Demo data</Pill>;
}
