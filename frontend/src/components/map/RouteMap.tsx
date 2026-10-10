import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { MapViewProps } from "./MapView";
import { cn } from "@/lib/utils";

const MapView = lazy(() => import("./MapView"));

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface text-sm text-muted-foreground">
      Loading map…
    </div>
  );
}

/** SSR-safe wrapper: Leaflet is only imported in the browser. */
export function RouteMap({ className, ...props }: MapViewProps & { className?: string }) {
  return (
    <div className={cn("relative isolate overflow-hidden rounded-xl border border-border", className)}>
      <ClientOnly fallback={<MapSkeleton />}>
        <Suspense fallback={<MapSkeleton />}>
          <MapView {...props} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
