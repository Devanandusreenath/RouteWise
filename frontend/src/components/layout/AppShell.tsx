import { Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, Car, Map, Menu, Navigation, Settings, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppStore } from "@/hooks/use-app-store";
import { vehicleName } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Navigate", icon: Navigation },
  { to: "/vehicle", label: "My Vehicle", icon: Car },
  { to: "/report-road", label: "Report a Road", icon: AlertTriangle },
  { to: "/road-intelligence", label: "Road Intelligence", icon: Map },
  { to: "/maintenance", label: "Maintenance Dashboard", icon: Wrench },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path d="M9 25 C 9 16, 23 18, 23 8" className="stroke-primary-foreground" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M9 25 C 9 16, 23 18, 23 8" className="stroke-primary" strokeWidth="1" strokeDasharray="2 3" fill="none" />
        <circle cx="23" cy="8" r="3" className="fill-primary-foreground" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight">
        RouteWise <span className="text-primary">AI</span>
      </span>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--primary)]"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <n.icon className={cn("size-4", active && "text-primary")} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { demo, selectedVehicle } = useAppStore();
  return (
    <div className="mt-auto space-y-3 text-xs">
      <div className="rounded-lg border border-sidebar-border p-3">
        <div className="eyebrow mb-1">Active vehicle</div>
        <div className="text-sidebar-foreground">{selectedVehicle ? vehicleName(selectedVehicle) : "None selected"}</div>
      </div>
      <div className={cn("flex items-center gap-2 rounded-lg border p-3", demo ? "border-info/30 text-info" : "border-success/30 text-success")}>
        <BarChart3 className="size-3.5" />
        {demo ? "Demo mode · local sample data" : "Live backend connected"}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { loadError } = useAppStore();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Logo />
        <NavLinks />
        <SidebarFooter />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[1100] flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 lg:hidden">
          <Logo />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="rounded-md border border-border p-2" aria-label="Open menu">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="z-[1200] flex w-72 flex-col gap-6 border-sidebar-border bg-sidebar">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Logo />
              <NavLinks onNavigate={() => setOpen(false)} />
              <SidebarFooter />
            </SheetContent>
          </Sheet>
        </header>
        {loadError && (
          <div className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
            Could not load data from the RouteWise backend: {loadError}. No demo data has been substituted.
          </div>
        )}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
