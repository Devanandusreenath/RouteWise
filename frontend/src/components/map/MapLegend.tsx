export function MapLegend({ showRoutes = false }: { showRoutes?: boolean }) {
  return (
    <div className="panel space-y-2 p-3 text-xs">
      <div className="eyebrow">Legend</div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`sev-dot-${s} inline-block size-2.5 rounded-full`} /> S{s}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full border border-dashed border-foreground" /> Unverified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-muted-foreground/50" /> Resolved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rotate-45 rounded-[2px] bg-foreground" /> Restriction
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rotate-45 rounded-[2px] bg-danger" /> Closure
        </span>
        {showRoutes && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-4 rounded bg-primary" /> Selected route
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-4 rounded bg-danger" /> Unsuitable
            </span>
          </>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Sample Kochi pilot data — not live conditions.</p>
    </div>
  );
}
