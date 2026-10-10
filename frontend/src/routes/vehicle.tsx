import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/AppShell";
import { DemoTag, Pill, SpecBadge } from "@/components/StatusBadges";
import { useAppStore } from "@/hooks/use-app-store";
import { lookupVehicle } from "@/lib/api";
import { CATEGORY_LABEL, SPEC_LABEL, formatDateTime, missingCriticalSpecs, vehicleName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SpecKey, SpecStatus, VehicleCategory, VehicleProfile } from "@/types";

export const Route = createFileRoute("/vehicle")({
  head: () => ({
    meta: [
      { title: "My Vehicle — RouteWise AI" },
      { name: "description", content: "Look up, review and save vehicle dimensions and weight used for route checks." },
      { property: "og:title", content: "My Vehicle — RouteWise AI" },
      { property: "og:description", content: "Manage vehicle profiles for vehicle-aware routing." },
    ],
  }),
  component: VehiclePage,
});

const SPEC_FIELDS: { key: SpecKey; label: string; unit: string }[] = [
  { key: "lengthM", label: "Overall length", unit: "m" },
  { key: "widthM", label: "Width", unit: "m" },
  { key: "heightM", label: "Height", unit: "m" },
  { key: "grossVehicleWeightKg", label: "Gross vehicle weight", unit: "kg" },
  { key: "currentLoadedWeightKg", label: "Current / loaded weight", unit: "kg" },
];

const emptyVehicle = (): VehicleProfile => ({
  id: "",
  make: "",
  model: "",
  year: null,
  variant: "",
  category: "small_car",
  lengthM: null,
  widthM: null,
  heightM: null,
  grossVehicleWeightKg: null,
  currentLoadedWeightKg: null,
  specStatus: { lengthM: "unknown", widthM: "unknown", heightM: "unknown", grossVehicleWeightKg: "unknown", currentLoadedWeightKg: "unknown" },
  verificationStatus: "unknown",
  sources: [],
  isIllustrative: false,
  updatedAt: new Date().toISOString(),
  lastVerifiedAt: null,
});

function VehiclePage() {
  const { vehicles, selectedVehicle, selectVehicle, deleteVehicle } = useAppStore();
  const [q, setQ] = useState({ make: "", model: "", year: "", variant: "", category: "" as VehicleCategory | "" });
  const [results, setResults] = useState<VehicleProfile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<VehicleProfile | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchErr(null);
    try {
      setResults(await lookupVehicle({ ...q, year: q.year ? Number(q.year) : null }));
    } catch (err) {
      setSearchErr((err as Error).message);
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      <PageHeader
        title="My Vehicle"
        subtitle="Specifications drive restriction checks. Review every value — unknown values stay unknown and are never filled in automatically."
        actions={<Button onClick={() => setEditing(emptyVehicle())}><Plus className="size-4" /> New profile</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Vehicle lookup</h2>
            <DemoTag />
          </div>
          <form onSubmit={search} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="q-make">Manufacturer</Label><Input id="q-make" value={q.make} onChange={(e) => setQ({ ...q, make: e.target.value })} placeholder="e.g. Tata" /></div>
            <div className="space-y-1"><Label htmlFor="q-model">Model</Label><Input id="q-model" value={q.model} onChange={(e) => setQ({ ...q, model: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="q-year">Model year</Label><Input id="q-year" inputMode="numeric" value={q.year} onChange={(e) => setQ({ ...q, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></div>
            <div className="space-y-1"><Label htmlFor="q-var">Variant</Label><Input id="q-var" value={q.variant} onChange={(e) => setQ({ ...q, variant: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="q-cat">Category</Label>
              <select id="q-cat" className="field" value={q.category} onChange={(e) => setQ({ ...q, category: e.target.value as VehicleCategory | "" })}>
                <option value="">Any category</option>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Button type="submit" className="sm:col-span-2" disabled={searching}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search
            </Button>
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Prototype uses a sample catalogue. The future backend will look up manufacturer specifications server-side; no API keys are used in the browser.
          </p>
          <div className="mt-4 space-y-2">
            {searchErr && <p className="text-sm text-danger">{searchErr}</p>}
            {results?.length === 0 && <p className="text-sm text-muted-foreground">No matching vehicles. Try fewer filters or create a profile manually.</p>}
            {results?.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3">
                <div>
                  <div className="text-sm font-medium">{vehicleName(v)}</div>
                  <div className="text-xs text-muted-foreground">{CATEGORY_LABEL[v.category]} · illustrative specs</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditing({ ...v, id: "", isIllustrative: true })}>Review & save</Button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="mb-3 font-semibold">Saved profiles</h2>
          {vehicles.length === 0 && <p className="text-sm text-muted-foreground">No saved vehicles yet.</p>}
          <div className="space-y-2">
            {vehicles.map((v) => {
              const miss = missingCriticalSpecs(v);
              const active = selectedVehicle?.id === v.id;
              return (
                <div key={v.id} className={cn("rounded-lg border p-3", active ? "border-primary bg-primary/5" : "border-border bg-surface")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{vehicleName(v)}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {CATEGORY_LABEL[v.category]} · {v.lengthM ?? "?"} × {v.widthM ?? "?"} × {v.heightM ?? "?"} m · {v.grossVehicleWeightKg ?? "?"} kg GVW
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <SpecBadge status={v.verificationStatus} />
                        {v.isIllustrative && <Pill t="info">Illustrative test data</Pill>}
                        {miss.length > 0 && <Pill t="warning"><AlertTriangle className="size-3" />Missing {miss.join(", ")}</Pill>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant={active ? "default" : "secondary"} onClick={() => selectVehicle(v.id)}>
                        {active ? <><CheckCircle2 className="size-4" /> Selected</> : "Use for routing"}
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(v)}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => { deleteVehicle(v.id); toast.success("Vehicle removed"); }}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {editing && <VehicleEditor initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function VehicleEditor({ initial, onClose }: { initial: VehicleProfile; onClose: () => void }) {
  const { saveVehicle, selectVehicle } = useAppStore();
  const [v, setV] = useState<VehicleProfile>(initial);
  const [sourcesText, setSourcesText] = useState(initial.sources.join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const miss = missingCriticalSpecs(v);

  const setSpec = (key: SpecKey, raw: string) => {
    const num = raw === "" ? null : Number(raw);
    setV((p) => ({
      ...p,
      [key]: num,
      specStatus: { ...p.specStatus, [key]: num == null ? "unknown" : p.specStatus[key] === "unknown" ? "user_confirmed" : p.specStatus[key] },
    }));
  };

  async function submit(andSelect: boolean) {
    const e: Record<string, string> = {};
    if (!v.make.trim()) e.make = "Manufacturer is required";
    if (!v.model.trim()) e.model = "Model is required";
    if (v.year != null && (v.year < 1950 || v.year > 2030)) e.year = "Enter a valid year";
    for (const f of SPEC_FIELDS) {
      const val = v[f.key];
      if (val != null && (Number.isNaN(val) || val <= 0)) e[f.key] = "Must be a positive number";
    }
    if (v.heightM != null && v.heightM > 6) e.heightM = "Height over 6 m looks wrong";
    const sources = sourcesText.split("\n").map((s) => s.trim()).filter(Boolean);
    const bad = sources.find((s) => { try { return !/^https?:/.test(new URL(s).protocol); } catch { return true; } });
    if (bad) e.sources = `Not a valid URL: ${bad}`;
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const statuses = Object.values(v.specStatus).filter((_, i) => i < 4);
    const overall: SpecStatus = statuses.every((s) => s === "verified") ? "verified" : statuses.some((s) => s === "unknown") ? "unknown" : statuses.every((s) => s === "verified" || s === "user_confirmed") ? "user_confirmed" : "estimated";
    const saved = await saveVehicle({
      ...v,
      id: v.id || `veh-${crypto.randomUUID().slice(0, 8)}`,
      sources,
      verificationStatus: overall,
      lastVerifiedAt: overall === "verified" ? new Date().toISOString() : v.lastVerifiedAt,
    });
    setSaving(false);
    if (saved) {
      if (andSelect) selectVehicle(saved.id);
      toast.success(andSelect ? "Vehicle saved and selected for routing" : "Vehicle saved");
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal aria-label="Edit vehicle">
      <div className="panel max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial.id ? "Edit vehicle" : "Review & save vehicle"}</h2>
          {v.isIllustrative && <Pill t="info">Illustrative test data — verify against a real source</Pill>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Manufacturer" err={errors.make}><Input value={v.make} onChange={(e) => setV({ ...v, make: e.target.value })} /></Field>
          <Field label="Model" err={errors.model}><Input value={v.model} onChange={(e) => setV({ ...v, model: e.target.value })} /></Field>
          <Field label="Model year" err={errors.year}><Input inputMode="numeric" value={v.year ?? ""} onChange={(e) => setV({ ...v, year: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} /></Field>
          <Field label="Variant"><Input value={v.variant} onChange={(e) => setV({ ...v, variant: e.target.value })} /></Field>
          <Field label="Category">
            <select className="field" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as VehicleCategory })}>
              {Object.entries(CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        </div>
        <h3 className="mb-2 mt-5 text-sm font-semibold">Specifications</h3>
        <div className="space-y-2">
          {SPEC_FIELDS.map((f) => (
            <div key={f.key} className="grid grid-cols-[1fr_110px_140px] items-center gap-2">
              <Label className="text-sm">{f.label} <span className="text-muted-foreground">({f.unit})</span>{errors[f.key] && <span className="block text-xs text-danger">{errors[f.key]}</span>}</Label>
              <Input type="number" step="any" placeholder="Unknown" value={v[f.key] ?? ""} onChange={(e) => setSpec(f.key, e.target.value)} />
              <select
                className="field"
                aria-label={`${f.label} status`}
                value={v.specStatus[f.key]}
                disabled={v[f.key] == null}
                onChange={(e) => setV({ ...v, specStatus: { ...v.specStatus, [f.key]: e.target.value as SpecStatus } })}
              >
                {(Object.keys(SPEC_LABEL) as SpecStatus[]).filter((s) => (v[f.key] == null ? s === "unknown" : s !== "unknown")).map((s) => (
                  <option key={s} value={s}>{SPEC_LABEL[s]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {miss.length > 0 && (
          <div className="mt-3 flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="size-4 shrink-0" />
            Missing {miss.join(", ")}. Routes with matching restrictions will be flagged as unconfirmed rather than assumed safe.
          </div>
        )}
        <Field label="Specification source URLs (one per line)" err={errors.sources} className="mt-4">
          <Textarea rows={2} value={sourcesText} onChange={(e) => setSourcesText(e.target.value)} placeholder="https://manufacturer.example/spec-sheet" />
        </Field>
        <p className="mt-2 text-xs text-muted-foreground">Last verified: {v.lastVerifiedAt ? formatDateTime(v.lastVerifiedAt) : "never"}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" disabled={saving} onClick={() => submit(false)}>Save</Button>
          <Button disabled={saving} onClick={() => submit(true)}>{saving && <Loader2 className="size-4 animate-spin" />}Save & use for routing</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, err, children, className }: { label: string; err?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label>{label}</Label>
      {children}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
