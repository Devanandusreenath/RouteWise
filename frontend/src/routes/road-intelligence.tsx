import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/AppShell";
import { RouteMap } from "@/components/map/RouteMap";
import { MapLegend } from "@/components/map/MapLegend";
import { DemoTag, MaintBadge, SeverityDot, VerifiedBadge } from "@/components/StatusBadges";
import { useAppStore } from "@/hooks/use-app-store";
import { segmentById } from "@/data/pilot";
import { DEFECT_LABEL, ageDays, formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DefectType, SurfaceCondition } from "@/types";

export const Route = createFileRoute("/road-intelligence")({
  head: () => ({
    meta: [
      { title: "Road Intelligence — RouteWise AI" },
      { name: "description", content: "Filter and explore reported road defects and restrictions on an interactive map." },
      { property: "og:title", content: "Road Intelligence — RouteWise AI" },
      { property: "og:description", content: "Road-condition map and hazard analytics for the Kochi pilot." },
    ],
  }),
  component: IntelPage,
});

const INITIAL = { type: "" as DefectType | "", minSev: 1, verification: "all", age: "all", surface: "" as SurfaceCondition | "", status: "open" };

function IntelPage() {
  const { defects, restrictions, settings } = useAppStore();
  const [f, setF] = useState(INITIAL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = Date.now();
    return defects
      .filter((d) => !f.type || d.defectType === f.type)
      .filter((d) => d.severity >= f.minSev)
      .filter((d) => f.verification === "all" || d.verificationStatus === f.verification)
      .filter((d) => f.age === "all" || ageDays(d.reportedAt, now) <= Number(f.age))
      .filter((d) => !f.surface || segmentById(d.roadSegmentId)?.surface === f.surface)
      .filter((d) => f.status === "all" || (f.status === "resolved" ? d.maintenanceStatus === "resolved" : d.maintenanceStatus !== "resolved"))
      .sort((a, b) => b.severity - a.severity || b.reportedAt.localeCompare(a.reportedAt));
  }, [defects, f]);

  const selected = defects.find((d) => d.id === selectedId) ?? null;
  const active = defects.filter((d) => d.maintenanceStatus !== "resolved");
  const recentResolved = defects.filter((d) => d.maintenanceStatus === "resolved").length;

  return (
    <>
      <PageHeader title="Road Intelligence" subtitle="Sample records for a small Kochi, Kerala pilot area. These are not live observations." actions={<DemoTag />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Active reports", active.length],
          ["Severe (4–5) active", active.filter((d) => d.severity >= 4).length],
          ["Verified active", active.filter((d) => d.verificationStatus === "verified").length],
          ["Resolved", recentResolved],
        ].map(([l, v]) => (
          <div key={l} className="panel p-3"><div className="eyebrow">{l}</div><div className="font-display text-2xl font-semibold">{v}</div></div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[260px_1fr_320px]">
        <aside className="panel h-fit space-y-3 p-4" aria-label="Filters">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Filters</h2>
            <Button size="sm" variant="ghost" onClick={() => setF(INITIAL)}><RotateCcw className="size-3.5" /> Reset</Button>
          </div>
          <Sel label="Defect type" value={f.type} onChange={(v) => setF({ ...f, type: v as DefectType | "" })} opts={[["", "All types"], ...Object.entries(DEFECT_LABEL)]} />
          <Sel label="Minimum severity" value={String(f.minSev)} onChange={(v) => setF({ ...f, minSev: Number(v) })} opts={[1, 2, 3, 4, 5].map((s) => [String(s), `${s}+`])} />
          <Sel label="Verification" value={f.verification} onChange={(v) => setF({ ...f, verification: v })} opts={[["all", "All"], ["verified", "Verified"], ["unverified", "Unverified"]]} />
          <Sel label="Report age" value={f.age} onChange={(v) => setF({ ...f, age: v })} opts={[["all", "Any age"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]]} />
          <Sel label="Road condition" value={f.surface} onChange={(v) => setF({ ...f, surface: v as SurfaceCondition | "" })} opts={[["", "Any"], ["good", "Good"], ["fair", "Fair"], ["poor", "Poor"], ["unknown", "Unknown"]]} />
          <Sel label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} opts={[["open", "Open (not resolved)"], ["resolved", "Resolved"], ["all", "All"]]} />
          <MapLegend />
        </aside>

        <RouteMap
          className="h-[60vh] min-h-[380px] xl:h-[72vh]"
          defects={filtered}
          restrictions={settings.showRestrictions ? restrictions : []}
          selectedDefectId={selectedId}
          onDefectClick={setSelectedId}
          cluster={settings.clusterMarkers}
          mapStyle={settings.mapStyle}
        />

        <aside className="space-y-3">
          {selected && (
            <div className="panel space-y-2 border-primary/50 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{DEFECT_LABEL[selected.defectType]}</h2>
                <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
              </div>
              <div className="flex flex-wrap gap-1"><VerifiedBadge verified={selected.verificationStatus === "verified"} /><MaintBadge status={selected.maintenanceStatus} /></div>
              <div className="text-sm">Severity <SeverityDot s={selected.severity} /> · {selected.independentReportCount} independent report(s)</div>
              <div className="text-xs text-muted-foreground">{segmentById(selected.roadSegmentId)?.name ?? "No matched road segment"}</div>
              <div className="text-xs text-muted-foreground">Observed {formatDateTime(selected.observedAt)}</div>
              <p className="text-sm">{selected.description}</p>
              {selected.photoUrl && <img src={selected.photoUrl} alt="Defect" className="rounded-md" />}
            </div>
          )}
          <div className="panel p-3">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Reports</h2><span className="text-xs text-muted-foreground">{filtered.length} shown</span></div>
            {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No reports match these filters.</p>}
            <ul className="max-h-[52vh] space-y-1 overflow-y-auto">
              {filtered.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setSelectedId(d.id)}
                    className={cn("w-full rounded-md p-2 text-left text-sm hover:bg-muted", selectedId === d.id && "bg-muted")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><SeverityDot s={d.severity} />{DEFECT_LABEL[d.defectType]}</span>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(d.reportedAt)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{segmentById(d.roadSegmentId)?.name ?? "Off-network"} · {d.verificationStatus}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function Sel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: string[][] }) {
  const id = label.replace(/\s/g, "-").toLowerCase();
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
