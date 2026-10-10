import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownUp, Info, Loader2, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RouteMap } from "@/components/map/RouteMap";
import { MapLegend } from "@/components/map/MapLegend";
import { Pill, SuitabilityBadge } from "@/components/StatusBadges";
import { PageHeader } from "@/components/layout/AppShell";
import { useAppStore } from "@/hooks/use-app-store";
import { NODES, nodeById } from "@/data/pilot";
import { calculateRoutes } from "@/lib/api";
import { formatDistance, formatDuration, missingCriticalSpecs, vehicleName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RouteOption } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Navigate — RouteWise AI" },
      { name: "description", content: "Plan routes checked against your vehicle's size, weight and reported road defects." },
      { property: "og:title", content: "Navigate — RouteWise AI" },
      { property: "og:description", content: "Vehicle-aware route planning with road-defect intelligence." },
    ],
  }),
  component: NavigatePage,
});

function NavigatePage() {
  const { vehicles, selectedVehicle, selectVehicle, defects, restrictions, settings } = useAppStore();
  const [originId, setOrigin] = useState("FKC");
  const [destId, setDest] = useState("KKD");
  const [avoidSevere, setAvoidSevere] = useState(true);
  const [preferSurface, setPreferSurface] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origin = nodeById(originId)!;
  const dest = nodeById(destId)!;
  const selected = routes?.find((r) => r.id === selectedId) ?? null;
  const missing = selectedVehicle ? missingCriticalSpecs(selectedVehicle) : [];
  const activeDefects = useMemo(() => defects.filter((d) => d.maintenanceStatus !== "resolved"), [defects]);

  async function calculate() {
    if (originId === destId) {
      setError("Start and destination must be different.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await calculateRoutes(
        { originId, destinationId: destId, vehicle: selectedVehicle, avoidSevereDefects: avoidSevere, preferBetterSurfaces: preferSurface },
        { defects, restrictions },
      );
      setRoutes(res);
      setSelectedId(res.find((r) => r.recommended)?.id ?? res[0]?.id ?? null);
      if (!res.length) setError("No route found between these places in the pilot road network.");
    } catch (e) {
      setError((e as Error).message);
      setRoutes(null);
      toast.error("Route calculation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Navigate" subtitle="Routes are checked against your vehicle and sample Kochi pilot road data. No live traffic or live road conditions." />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <section className="panel space-y-4 p-4" aria-label="Route planning">
            <div className="space-y-1.5">
              <Label htmlFor="origin">Starting location</Label>
              <select id="origin" className="field" value={originId} onChange={(e) => setOrigin(e.target.value)}>
                {NODES.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => { setOrigin(destId); setDest(originId); }} aria-label="Swap start and destination">
                <ArrowDownUp className="size-4" /> Swap
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dest">Destination</Label>
              <select id="dest" className="field" value={destId} onChange={(e) => setDest(e.target.value)}>
                {NODES.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">Pilot area places only (Kochi demo network).</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="veh">Vehicle</Label>
              <select id="veh" className="field" value={selectedVehicle?.id ?? ""} onChange={(e) => selectVehicle(e.target.value || null)}>
                <option value="">No vehicle (cannot validate)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{vehicleName(v)}</option>
                ))}
              </select>
              {missing.length > 0 && (
                <p className="text-xs text-warning">
                  Missing {missing.join(", ")} — related restrictions can't be confirmed.{" "}
                  <Link to="/vehicle" className="underline">Edit vehicle</Link>
                </p>
              )}
            </div>
            <div className="space-y-3 rounded-lg bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="avoid">Avoid severe road defects</Label>
                <Switch id="avoid" checked={avoidSevere} onCheckedChange={setAvoidSevere} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="surf">Prefer better road surfaces</Label>
                <Switch id="surf" checked={preferSurface} onCheckedChange={setPreferSurface} />
              </div>
            </div>
            <Button className="w-full" onClick={calculate} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RouteIcon className="size-4" />}
              {loading ? "Calculating…" : "Calculate route"}
            </Button>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          </section>

          {selected && (
            <section className="panel border-primary/40 p-4" aria-live="polite">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-primary">
                <Info className="size-4" /> Why this route
              </div>
              <p className="text-sm">{selected.explanation}</p>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <div className="relative">
            <RouteMap
              className="h-[55vh] min-h-[380px] xl:h-[62vh]"
              defects={activeDefects}
              restrictions={settings.showRestrictions ? restrictions : []}
              routes={(routes ?? []).map((r) => ({ id: r.id, label: r.label, geometry: r.geometry, selected: r.id === selectedId, status: r.suitabilityStatus }))}
              onRouteClick={setSelectedId}
              origin={{ position: origin.position, name: origin.name }}
              destination={{ position: dest.position, name: dest.name }}
              cluster={settings.clusterMarkers}
              mapStyle={settings.mapStyle}
              fitTo={selected?.geometry ?? null}
            />
            <div className="pointer-events-none absolute bottom-6 left-3 z-[500] hidden w-64 md:block">
              <div className="pointer-events-auto">
                <MapLegend showRoutes />
              </div>
            </div>
            {routes && (
              <div className="absolute right-3 top-3 z-[500]">
                <Pill t="info">Demonstration route geometry</Pill>
              </div>
            )}
          </div>
          <div className="md:hidden"><MapLegend showRoutes /></div>

          {loading && <div className="panel p-6 text-center text-sm text-muted-foreground">Evaluating routes against restrictions and defects…</div>}
          {!loading && !routes && (
            <div className="panel p-6 text-center text-sm text-muted-foreground">Choose a start, destination and vehicle, then calculate to compare routes.</div>
          )}
          {!loading && routes && routes.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {routes.map((r) => (
                <RouteCard key={r.id} r={r} selected={r.id === selectedId} onSelect={() => setSelectedId(r.id)} units={settings.units} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RouteCard({ r, selected, onSelect, units }: { r: RouteOption; selected: boolean; onSelect: () => void; units: "km" | "mi" }) {
  const total = r.distanceMeters || 1;
  const pct = (m: number) => `${(m / total) * 100}%`;
  const critical = r.warnings.filter((w) => w.level === "critical");
  const other = r.warnings.filter((w) => w.level !== "critical");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "panel flex flex-col gap-3 p-4 text-left transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/50",
        r.suitabilityStatus === "unsuitable" && "border-danger/50",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="whitespace-nowrap font-display text-lg font-semibold">{r.label}</span>
        {r.recommended && <Pill t="success">Recommended</Pill>}
      </div>
      <div className="[&>span]:whitespace-normal"><SuitabilityBadge status={r.suitabilityStatus} /></div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div><div className="eyebrow">Distance</div>{formatDistance(r.distanceMeters, units)}</div>
        <div><div className="eyebrow">Time</div>{formatDuration(r.durationSeconds)}</div>
        <div><div className="eyebrow">Hazards</div>{r.knownHazards.length} <span className="text-xs text-muted-foreground">({r.severeHazardCount} severe)</span></div>
      </div>
      <div>
        <div className="eyebrow mb-1">Surface (demo)</div>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          <span className="bg-success" style={{ width: pct(r.surfaceMeters.good) }} />
          <span className="bg-warning" style={{ width: pct(r.surfaceMeters.fair) }} />
          <span className="bg-danger" style={{ width: pct(r.surfaceMeters.poor) }} />
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Good {Math.round((r.surfaceMeters.good / total) * 100)}% · Fair {Math.round((r.surfaceMeters.fair / total) * 100)}% · Poor{" "}
          {Math.round((r.surfaceMeters.poor / total) * 100)}% · Unknown {Math.round((r.surfaceMeters.unknown / total) * 100)}%
        </div>
      </div>
      {critical.length > 0 && (
        <ul className="space-y-1 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
          {critical.map((w, i) => <li key={i}>⛔ {w.message}</li>)}
        </ul>
      )}
      {other.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {other.slice(0, 4).map((w, i) => (
            <li key={i} className={w.level === "warning" ? "text-warning" : ""}>• {w.message}</li>
          ))}
          {other.length > 4 && <li>+{other.length - 4} more</li>}
        </ul>
      )}
      {r.missingData.length > 0 && (
        <div className="text-xs">
          <div className="eyebrow mb-0.5">Missing / uncertain data</div>
          <ul className="text-muted-foreground">{r.missingData.map((m, i) => <li key={i}>– {m}</li>)}</ul>
        </div>
      )}
    </button>
  );
}
