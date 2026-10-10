import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crosshair, ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/AppShell";
import { RouteMap } from "@/components/map/RouteMap";
import { DemoTag } from "@/components/StatusBadges";
import { useAppStore } from "@/hooks/use-app-store";
import { segmentById } from "@/data/pilot";
import { nearestSegment } from "@/lib/routing";
import { DEFECT_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DefectType, LatLng } from "@/types";

export const Route = createFileRoute("/report-road")({
  head: () => ({
    meta: [
      { title: "Report a Road — RouteWise AI" },
      { name: "description", content: "Report potholes, waterlogging and other road defects with location and photo." },
      { property: "og:title", content: "Report a Road — RouteWise AI" },
      { property: "og:description", content: "Submit a road-defect report on the map." },
    ],
  }),
  component: ReportPage,
});

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

function localInputValue(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function ReportPage() {
  const { addDefect, defects, settings } = useAppStore();
  const [type, setType] = useState<DefectType | "">("");
  const [point, setPoint] = useState<LatLng | null>(null);
  const [locText, setLocText] = useState("");
  const [severity, setSeverity] = useState(3);
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [observed, setObserved] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  useEffect(() => setObserved(localInputValue(new Date())), []);

  const seg = point ? segmentById(nearestSegment(point)) : undefined;

  function onFile(f: File | undefined) {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) return setErrors((e) => ({ ...e, photo: "Use a JPG, PNG or WebP image." }));
    if (f.size > MAX_BYTES) return setErrors((e) => ({ ...e, photo: "Image must be 2 MB or smaller." }));
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
    setErrors((e) => ({ ...e, photo: "" }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Location isn't available in this browser.");
    navigator.geolocation.getCurrentPosition(
      (p) => setPoint([p.coords.latitude, p.coords.longitude]),
      () => toast.error("Couldn't get your location. Pick it on the map instead."),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!type) err.type = "Choose a defect type";
    if (!point) err.point = "Pick the location on the map or enter coordinates";
    if (desc.trim().length < 10) err.desc = "Describe the problem (at least 10 characters)";
    if (!observed) err.observed = "Enter when you saw it";
    else if (new Date(observed).getTime() > Date.now() + 60000) err.observed = "Observation time can't be in the future";
    setErrors(err);
    if (Object.keys(err).length) return;
    setSubmitting(true);
    const d = await addDefect({
      defectType: type as DefectType,
      latitude: point![0],
      longitude: point![1],
      severity: severity as 1 | 2 | 3 | 4 | 5,
      description: `${locText ? `[${locText}] ` : ""}${desc.trim()}`,
      photoUrl: photo,
      observedAt: new Date(observed).toISOString(),
    });
    setSubmitting(false);
    if (d) {
      toast.success("Report saved to this demo", { description: "It now appears on the Road Intelligence map and Maintenance Dashboard." });
      setLastId(d.id);
      setType(""); setPoint(null); setLocText(""); setSeverity(3); setDesc(""); setPhoto(null);
      setObserved(localInputValue(new Date()));
    }
  }

  return (
    <>
      <PageHeader
        title="Report a Road"
        subtitle="Reports are stored in this demo only — they are not sent to any road authority."
        actions={<DemoTag />}
      />
      {lastId && (
        <div className="mb-4 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
          Report {lastId} added. <Link to="/road-intelligence" className="underline">View on map</Link> ·{" "}
          <Link to="/maintenance" className="underline">Open in dashboard</Link>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="panel space-y-4 p-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="type">Defect type *</Label>
            <select id="type" className="field" value={type} onChange={(e) => setType(e.target.value as DefectType)}>
              <option value="">Select…</option>
              {Object.entries(DEFECT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {errors.type && <p className="text-xs text-danger">{errors.type}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc">Location description</Label>
            <Input id="loc" value={locText} onChange={(e) => setLocText(e.target.value)} placeholder="e.g. Near Vyttila signal, left lane" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="lat">Latitude *</Label>
              <Input id="lat" type="number" step="any" value={point?.[0] ?? ""} onChange={(e) => setPoint(e.target.value ? [Number(e.target.value), point?.[1] ?? 76.3] : null)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lng">Longitude *</Label>
              <Input id="lng" type="number" step="any" value={point?.[1] ?? ""} onChange={(e) => setPoint(e.target.value ? [point?.[0] ?? 10, Number(e.target.value)] : null)} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{point ? (seg ? `Nearest road: ${seg.name}` : "Outside the pilot road network") : "Tap the map to set the location"}</span>
            <Button type="button" size="sm" variant="ghost" onClick={useMyLocation}><Crosshair className="size-4" /> My location</Button>
          </div>
          {errors.point && <p className="text-xs text-danger">{errors.point}</p>}
          <div className="space-y-1.5">
            <Label>Severity *</Label>
            <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Severity">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={severity === s}
                  onClick={() => setSeverity(s)}
                  className={cn("flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm", severity === s ? "border-primary bg-primary/10" : "border-border bg-surface")}
                >
                  <span className={`sev-dot-${s} size-2.5 rounded-full`} />{s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">1 = minor, 5 = dangerous / impassable</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description *</Label>
            <Textarea id="desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            {errors.desc && <p className="text-xs text-danger">{errors.desc}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="photo">Photograph (JPG/PNG/WebP, max 2 MB)</Label>
            {photo ? (
              <div className="relative">
                <img src={photo} alt="Preview of uploaded defect photo" className="max-h-44 w-full rounded-md object-cover" />
                <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2" aria-label="Remove photo" onClick={() => setPhoto(null)}><X className="size-4" /></Button>
              </div>
            ) : (
              <label htmlFor="photo" className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-surface p-4 text-sm text-muted-foreground">
                <ImagePlus className="size-4" /> Choose photo
              </label>
            )}
            <input id="photo" type="file" accept={ACCEPT.join(",")} className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            {errors.photo && <p className="text-xs text-danger">{errors.photo}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obs">Date & time observed *</Label>
            <Input id="obs" type="datetime-local" value={observed} onChange={(e) => setObserved(e.target.value)} />
            {errors.observed && <p className="text-xs text-danger">{errors.observed}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit report
          </Button>
        </form>
        <RouteMap
          className="h-[60vh] min-h-[380px] lg:h-auto"
          defects={defects.filter((d) => d.maintenanceStatus !== "resolved")}
          picked={point}
          onPick={setPoint}
          mapStyle={settings.mapStyle}
          cluster={settings.clusterMarkers}
        />
      </div>
    </>
  );
}
