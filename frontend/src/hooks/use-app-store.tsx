import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { MOCK_DEFECTS, MOCK_RESTRICTIONS, MOCK_VEHICLES } from "@/data/mock";
import * as api from "@/lib/api";
import type { AppSettings, MaintenanceStatus, NewDefectInput, RoadDefect, RoadRestriction, VehicleProfile } from "@/types";

const KEY = "routewise.demo.v1";

const DEFAULT_SETTINGS: AppSettings = {
  preferredVehicleId: "veh-ecomet",
  units: "km",
  mapStyle: "dark",
  clusterMarkers: true,
  showRestrictions: true,
  defectNotifications: false,
};

interface Store {
  demo: boolean;
  ready: boolean;
  loadError: string | null;
  vehicles: VehicleProfile[];
  defects: RoadDefect[];
  restrictions: RoadRestriction[];
  settings: AppSettings;
  selectedVehicle: VehicleProfile | null;
  selectVehicle: (id: string | null) => void;
  saveVehicle: (v: VehicleProfile) => Promise<VehicleProfile | null>;
  deleteVehicle: (id: string) => void;
  addDefect: (input: NewDefectInput) => Promise<RoadDefect | null>;
  setDefectStatus: (id: string, s: MaintenanceStatus) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const demo = api.isDemoMode;
  // Demo data is seeded synchronously so server and client render the same first frame.
  const [vehicles, setVehicles] = useState<VehicleProfile[]>(demo ? MOCK_VEHICLES : []);
  const [defects, setDefects] = useState<RoadDefect[]>(demo ? MOCK_DEFECTS : []);
  const [restrictions, setRestrictions] = useState<RoadRestriction[]>(demo ? MOCK_RESTRICTIONS : []);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (demo) {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.vehicles) setVehicles(s.vehicles);
          if (s.defects) setDefects(s.defects);
          if (s.settings) setSettings({ ...DEFAULT_SETTINGS, ...s.settings });
        }
      } catch {
        /* ignore corrupt storage */
      }
      setReady(true);
      return;
    }
    Promise.all([api.getVehicles(), api.getRoadDefects(), api.getRoadRestrictions()])
      .then(([v, d, r]) => {
        setVehicles(v);
        setDefects(d);
        setRestrictions(r);
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setReady(true));
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw).settings });
    } catch {
      /* ignore */
    }
  }, [demo]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(demo ? { vehicles, defects, settings } : { settings }));
    } catch {
      toast.error("Local storage is full — recent demo changes may not persist after reload.");
    }
  }, [ready, demo, vehicles, defects, settings]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === settings.preferredVehicleId) ?? null,
    [vehicles, settings.preferredVehicleId],
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const selectVehicle = useCallback((id: string | null) => updateSettings({ preferredVehicleId: id }), [updateSettings]);

  const saveVehicle = useCallback(async (v: VehicleProfile) => {
    try {
      const saved = await api.saveVehicle(v);
      setVehicles((list) => (list.some((x) => x.id === saved.id) ? list.map((x) => (x.id === saved.id ? saved : x)) : [...list, saved]));
      return saved;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  }, []);

  const deleteVehicle = useCallback((id: string) => {
    setVehicles((l) => l.filter((v) => v.id !== id));
    setSettings((s) => (s.preferredVehicleId === id ? { ...s, preferredVehicleId: null } : s));
  }, []);

  const addDefect = useCallback(async (input: NewDefectInput) => {
    try {
      const d = await api.createRoadDefect(input);
      setDefects((l) => [d, ...l]);
      return d;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  }, []);

  const setDefectStatus = useCallback(async (id: string, s: MaintenanceStatus) => {
    try {
      await api.updateDefectStatus(id, s);
      setDefects((l) => l.map((d) => (d.id === id ? { ...d, maintenanceStatus: s } : d)));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  const resetDemo = useCallback(() => {
    setVehicles(MOCK_VEHICLES);
    setDefects(MOCK_DEFECTS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value: Store = {
    demo,
    ready,
    loadError,
    vehicles,
    defects,
    restrictions,
    settings,
    selectedVehicle,
    selectVehicle,
    saveVehicle,
    deleteVehicle,
    addDefect,
    setDefectStatus,
    updateSettings,
    resetDemo,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppStore must be used inside AppStoreProvider");
  return c;
}
