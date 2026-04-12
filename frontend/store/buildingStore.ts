import { create } from "zustand";

import type { BuildingSummary } from "@/types/building";

export type FilterState = {
  minScore: number;
  maxScore: number;
  minRoofSqft: number;
  sectors: string[];
  coolingTower: "all" | "detected" | "not_required";
  minDrought: number;
  wraiLevel: "any" | "monitor" | "high" | "act_now";
  incentiveRequired: boolean;
};

const defaultFilters: FilterState = {
  minScore: 0,
  maxScore: 100,
  minRoofSqft: 100_000,
  sectors: [],
  coolingTower: "all",
  minDrought: 0,
  wraiLevel: "any",
  incentiveRequired: false,
};

function droughtRank(label: string): number {
  const m: Record<string, number> = { None: 0, D0: 1, D1: 2, D2: 3, D3: 4, D4: 5 };
  return m[label] ?? 0;
}

function wraiMatches(level: FilterState["wraiLevel"], wrai: number): boolean {
  if (level === "any") return true;
  if (level === "monitor") return wrai >= 40 && wrai < 60;
  if (level === "high") return wrai >= 60 && wrai < 80;
  if (level === "act_now") return wrai >= 80;
  return true;
}

function passesFilters(b: BuildingSummary, f: FilterState): boolean {
  if (b.final_score < f.minScore || b.final_score > f.maxScore) return false;
  if (b.roof_sqft < f.minRoofSqft) return false;
  if (f.sectors.length && !f.sectors.includes(b.sector)) return false;
  if (f.coolingTower === "detected" && !b.ct_detected) return false;
  if (f.coolingTower === "not_required" && b.ct_detected) return false;
  if (droughtRank(b.drought_label) < f.minDrought) return false;
  if (!wraiMatches(f.wraiLevel, b.wrai)) return false;
  if (f.incentiveRequired && b.payback_years > 6) return false;
  return true;
}

export type BuildingStore = {
  selectedState: string;
  activeFilters: FilterState;
  selectedBuildingId: string | null;
  mapViewport: { lat: number; lng: number; zoom: number; pitch: number; bearing: number };
  buildings: BuildingSummary[];
  filteredBuildings: BuildingSummary[];
  isLoadingBuildings: boolean;
  isSidebarOpen: boolean;
  isRankedTableOpen: boolean;
  setSelectedState: (state: string) => void;
  setFilter: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;
  resetFilters: () => void;
  selectBuilding: (id: string | null) => void;
  setBuildings: (buildings: BuildingSummary[]) => void;
  applyFilters: () => void;
  setMapViewport: (v: BuildingStore["mapViewport"]) => void;
  toggleSidebar: () => void;
  toggleRankedTable: () => void;
  setLoadingBuildings: (v: boolean) => void;
};

export const useBuildingStore = create<BuildingStore>((set, get) => ({
  selectedState: "TX",
  activeFilters: { ...defaultFilters },
  selectedBuildingId: null,
  mapViewport: { lat: 32.89, lng: -97.03, zoom: 9, pitch: 0, bearing: 0 },
  buildings: [],
  filteredBuildings: [],
  isLoadingBuildings: false,
  isSidebarOpen: true,
  isRankedTableOpen: false,
  setSelectedState: (state) => set({ selectedState: state.toUpperCase() }),
  setFilter: (key, value) =>
    set((s) => ({
      activeFilters: { ...s.activeFilters, [key]: value } as FilterState,
    })),
  resetFilters: () => set({ activeFilters: { ...defaultFilters } }),
  selectBuilding: (id) => set({ selectedBuildingId: id }),
  setBuildings: (buildings) => set({ buildings }),
  applyFilters: () => {
    const { buildings, activeFilters } = get();
    set({ filteredBuildings: buildings.filter((b) => passesFilters(b, activeFilters)) });
  },
  setMapViewport: (mapViewport) => set({ mapViewport }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleRankedTable: () => set((s) => ({ isRankedTableOpen: !s.isRankedTableOpen })),
  setLoadingBuildings: (isLoadingBuildings) => set({ isLoadingBuildings }),
}));
