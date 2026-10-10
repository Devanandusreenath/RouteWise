import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/AppShell";
import { RouteMap } from "@/components/map/RouteMap";
import { DemoTag, MaintBadge, Pill, SeverityDot, VerifiedBadge } from "@/components/StatusBadges";
import { useAppStore } from "@/hooks/use-app-store";
import { AREAS, segmentById } from "@/data/pilot";
import { inspectionPriority, priorityBand, summarize } from "@/lib/maintenance";
import { DEFECT_LABEL, ageDays, formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MaintenanceStatus, RoadDefect } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance Dashboard — RouteWise AI" },
      { name: "description", content: "Prioritise road inspections and track repair status of reported defects." },
      { property: "og:title", content: "Maintenance Dashboard — RouteWise AI" },
      { property: "og:description", content: "Inspection-priority dashboard for road maintenance teams." },
    ],
  }),
  component: MaintenancePage,
});

const SEV_COLORS = ["var(--sev-1)", "var(--sev-2)", "var(--sev-3)", "var(--sev-4)", "var(--sev-5)"];

function MaintenancePage() {
  const { defects, setDefectStatus, settings } = useAppStore();
  const [area, setArea] = useState("");
  const [minSev, setMinSev] = useState(1);
  const [age, setAge] = useState("all");
  const [status, setStatus] = useState<"" | MaintenanceStatus>("");
  const [sort, setSort] = useState<"priority" | "severity" | "recent" | "reports">("priority");
  const [detailId, setDetailId] = useState<string | null>(null);

  const now = Date.now();
  const summary = summarize(defects, now);

  const rows = useMemo(() => {
    const list = defects
      .filter((d) => !area || segmentById(d.roadSegmentId)?.area === area)
      .filter((d) => d.severity >= minSev)
      .filter((d) => age === "all" || ageDays(d.reportedAt, now) <= Number(age))
      .filter((d) => !status || d.maintenanceStatus === status)
      .map((d) => ({ d, p: inspectionPriority(d, now) }));
    const cmp = {
      priority: (a: typeof list[0], b: typeof list[0]) => b.p - a.p,
      severity: (a: typeof list[0], b: typeof list[0]) => b.d.severity - a.d.severity,
      recent: (a: typeof list[0], b: typeof list[0]) => b.d.reportedAt.localeCompare(a.d.reportedAt),
      reports: (a: typeof list[0], b: typeof list[0]) => b.d.independentReportCount - a.d.independentReportCount,
    }[sort];
    return list.sort(cmp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defects, area, minSev, age, status, sort]);

  const sevData = [1, 2, 3, 4, 5].map((s) => ({ s: `S${s}`, count: rows.filter((r) => r.d.severity === s).length }));
  const trend = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = now - i * 7 * 86400000;
      const start = end - 7 * 86400000;
      weeks.push({
        label: new Date(end).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        count: rows.filter((r) => { const t = new Date(r.d.reportedAt).getTime(); return t > start && t <= end; }).length,
      });
    }
    return weeks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const detail = defects.find((d) => d.id === detailId) ?? null;

  async function change(id: string, s: MaintenanceStatus) {
    await setDefectStatus(id, s);
    toast.success(`Marked as ${s.replace("_", " ")} (demo)`);
  }

  return (
    <>
      <PageHeader title="Maintenance Dashboard" subtitle="Rank reported defects for inspection. Status changes are saved in this demo only." actions={<DemoTag />} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Total reported", summary.total, ""],
          ["Open", summary.open, "text-danger"],
          ["Verified", summary.verified, "text-success"],
          ["Under inspection", summary.underInspection, "text-warning"],
          ["Resolved", summary.resolved, "text-info"],
          ["High priority", summary.highPriority, "text-primary"],
        ].map(([l, v, c]) => (
          <div key={l as string} className="panel p-3"><div className="eyebrow">{l}</div><div className={cn("font-display text-2xl font-semibold", c as string)}>{v}</div></div>
        ))}
      </div>

      <div className="panel mb-4 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <F label="Area"><select className="field" value={area} onChange={(e) => setArea(e.target.value)}><option value="">All areas</option>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></F>
        <F label="Min severity"><select className="field" value={minSev} onChange={(e) => setMinSev(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s}+</option>)}</select></F>
        <F label="Age"><select className="field" value={age} onChange={(e) => setAge(e.target.value)}><option value="all">Any</option><option value="7">≤ 7 days</option><option value="30">≤ 30 days</option><option value="90">≤ 90 days</option></select></F>
        <F label="Status"><select className="field" value={status} onChange={(e) => setStatus(e.target.value as MaintenanceStatus | "")}><option value="">All</option><option value="open">Open</option><option value="under_review">Under review</option><option value="inspected">Inspected</option><option value="resolved">Resolved</option></select></F>
        <F label="Sort by"><select className="field" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="priority">Inspection priority</option><option value="severity">Severity</option><option value="recent">Most recent</option><option value="reports">Report count</option></select></F>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="panel p-4">
          <h2 className="mb-2 text-sm font-semibold">Severity distribution</h2>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={sevData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="s" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} width={24} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>{sevData.map((_, i) => <Cell key={i} fill={SEV_COLORS[i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="mb-2 text-sm font-semibold">Reports per week</h2>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} width={24} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <RouteMap className="h-64 lg:h-auto" defects={rows.map((r) => r.d)} heat selectedDefectId={detailId} onDefectClick={setDetailId} mapStyle={settings.mapStyle} />
      </div>

      <div className="mb-3 flex gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-xs text-info">
        <Info className="size-4 shrink-0" />
        Inspection priority is a decision-support score from severity, report count, verification and time open. It is not an engineering safety certification, and old reports are never marked repaired automatically.
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border text-left">
              <tr className="[&>th]:eyebrow [&>th]:px-3 [&>th]:py-2">
                <th>#</th><th>Location / segment</th><th>Type</th><th>Sev.</th><th>Reports</th><th>Last reported</th><th>Verification</th><th>Priority</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No defects match these filters.</td></tr>}
              {rows.map(({ d, p }, i) => (
                <tr key={d.id} onClick={() => setDetailId(d.id)} className={cn("cursor-pointer border-b border-border/60 hover:bg-muted/50 [&>td]:px-3 [&>td]:py-2", detailId === d.id && "bg-muted")}>
                  <td className="font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td><div>{segmentById(d.roadSegmentId)?.area ?? "Off-network"}</div><div className="text-xs text-muted-foreground">{segmentById(d.roadSegmentId)?.name ?? `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}`}</div></td>
                  <td>{DEFECT_LABEL[d.defectType]}</td>
                  <td><SeverityDot s={d.severity} /></td>
                  <td className="font-mono">{d.independentReportCount}</td>
                  <td className="text-xs">{timeAgo(d.reportedAt, now)}</td>
                  <td><VerifiedBadge verified={d.verificationStatus === "verified"} /></td>
                  <td><PriorityCell p={p} /></td>
                  <td><MaintBadge status={d.maintenanceStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="panel h-fit p-4">
          {detail ? <Detail d={detail} p={inspectionPriority(detail, now)} onChange={change} /> : <p className="text-sm text-muted-foreground">Select a defect to see details and update its status.</p>}
        </aside>
      </div>
    </>
  );
}

function PriorityCell({ p }: { p: number }) {
  const band = priorityBand(p);
  const t = band === "High" ? "danger" : band === "Medium" ? "warning" : "muted";
  return <Pill t={t}>{band} · {p}</Pill>;
}

function Detail({ d, p, onChange }: { d: RoadDefect; p: number; onChange: (id: string, s: MaintenanceStatus) => void }) {
  const actions: { s: MaintenanceStatus; label: string }[] = [
    { s: "under_review", label: "Mark under review" },
    { s: "inspected", label: "Mark inspected" },
    { s: "resolved", label: "Mark resolved" },
    { s: "open", label: "Reopen" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold">{DEFECT_LABEL[d.defectType]}</h2><span className="font-mono text-xs text-muted-foreground">{d.id}</span></div>
      <div className="flex flex-wrap gap-1"><MaintBadge status={d.maintenanceStatus} /><VerifiedBadge verified={d.verificationStatus === "verified"} /><PriorityCell p={p} /></div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <dt className="text-muted-foreground">Segment</dt><dd>{segmentById(d.roadSegmentId)?.name ?? "Unknown"}</dd>
        <dt className="text-muted-foreground">Severity</dt><dd><SeverityDot s={d.severity} /></dd>
        <dt className="text-muted-foreground">Reports</dt><dd>{d.independentReportCount}</dd>
        <dt className="text-muted-foreground">Observed</dt><dd>{formatDateTime(d.observedAt)}</dd>
        <dt className="text-muted-foreground">Reported</dt><dd>{formatDateTime(d.reportedAt)}</dd>
      </dl>
      <p className="text-sm">{d.description}</p>
      {d.photoUrl && <img src={d.photoUrl} alt="Defect" className="rounded-md" />}
      <div className="grid grid-cols-2 gap-2">
        {actions.filter((a) => a.s !== d.maintenanceStatus).map((a) => (
          <Button key={a.s} size="sm" variant={a.s === "resolved" ? "default" : "secondary"} onClick={() => onChange(d.id, a.s)}>{a.label}</Button>
        ))}
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
