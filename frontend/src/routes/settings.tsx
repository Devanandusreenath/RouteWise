import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/AppShell";
import { useAppStore } from "@/hooks/use-app-store";
import { vehicleName } from "@/lib/format";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RouteWise AI" },
      { name: "description", content: "Units, map display, preferred vehicle and demo-data settings." },
      { property: "og:title", content: "Settings — RouteWise AI" },
      { property: "og:description", content: "Configure RouteWise AI preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings, vehicles, demo, resetDemo } = useAppStore();
  const Row = ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <div><Label htmlFor={id}>{label}</Label>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      <div className="w-48 shrink-0 text-right">{children}</div>
    </div>
  );
  return (
    <>
      <PageHeader title="Settings" subtitle="Preferences are saved in this browser." />
      <div className="grid max-w-4xl gap-4">
        <section className="panel px-4 py-1">
          <Row id="pv" label="Preferred vehicle">
            <select id="pv" className="field" value={settings.preferredVehicleId ?? ""} onChange={(e) => updateSettings({ preferredVehicleId: e.target.value || null })}>
              <option value="">None</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleName(v)}</option>)}
            </select>
          </Row>
          <Row id="units" label="Distance units">
            <select id="units" className="field" value={settings.units} onChange={(e) => updateSettings({ units: e.target.value as "km" | "mi" })}>
              <option value="km">Kilometres</option><option value="mi">Miles</option>
            </select>
          </Row>
          <Row id="ms" label="Map style">
            <select id="ms" className="field" value={settings.mapStyle} onChange={(e) => updateSettings({ mapStyle: e.target.value as "dark" | "standard" })}>
              <option value="dark">Dark</option><option value="standard">Standard (OpenStreetMap)</option>
            </select>
          </Row>
          <Row id="cl" label="Group overlapping markers"><Switch id="cl" checked={settings.clusterMarkers} onCheckedChange={(v) => updateSettings({ clusterMarkers: v })} /></Row>
          <Row id="rs" label="Show road restrictions on maps"><Switch id="rs" checked={settings.showRestrictions} onCheckedChange={(v) => updateSettings({ showRestrictions: v })} /></Row>
          <Row id="nt" label="Road-defect notifications" hint="Prototype only — shows a confirmation, no real alerts are sent.">
            <Switch id="nt" checked={settings.defectNotifications} onCheckedChange={(v) => { updateSettings({ defectNotifications: v }); toast(v ? "Notifications enabled (prototype)" : "Notifications disabled"); }} />
          </Row>
          <Row id="th" label="Theme" hint="This prototype uses a single dark theme."><span className="text-sm text-muted-foreground">Dark</span></Row>
        </section>
        <section className="panel space-y-3 p-4">
          <h2 className="font-semibold">Data & demo mode</h2>
          <p className="text-sm text-muted-foreground">
            {demo
              ? "No backend is configured, so RouteWise AI is running in demo mode. All vehicles, defects, restrictions and routes are illustrative sample data for a Kochi pilot area and are stored only in this browser."
              : "Connected to the RouteWise backend. Data shown comes from the live service; failures are reported, never replaced with sample data."}
          </p>
          <p className="text-xs text-muted-foreground">Map data © OpenStreetMap contributors. Route lines are demonstration geometry, not surveyed alignments.</p>
          {demo && (
            <Button variant="secondary" onClick={() => { resetDemo(); toast.success("Demo data reset"); }}>Reset demo data</Button>
          )}
        </section>
      </div>
    </>
  );
}
