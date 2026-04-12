"use client";

import { useEffect } from "react";

import { AlertTicker } from "@/components/map/AlertTicker";
import { FilterSidebar } from "@/components/map/FilterSidebar";
import { MapCanvas } from "@/components/map/MapCanvas";
import { RankedDrawer } from "@/components/map/RankedDrawer";
import { AppNav } from "@/components/shared/AppNav";
import { apiJson } from "@/lib/api";
import { useBuildingStore } from "@/store/buildingStore";
import type { BuildingSummary } from "@/types/building";

export default function MapPage() {
  const selectedState = useBuildingStore((s) => s.selectedState);
  const setBuildings = useBuildingStore((s) => s.setBuildings);
  const applyFilters = useBuildingStore((s) => s.applyFilters);
  const setLoading = useBuildingStore((s) => s.setLoadingBuildings);
  const isLoading = useBuildingStore((s) => s.isLoadingBuildings);
  const count = useBuildingStore((s) => s.filteredBuildings.length);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiJson<{ data: BuildingSummary[] }>(
          `/api/buildings?state=${selectedState}&limit=500`,
        );
        if (cancelled) return;
        setBuildings(res.data);
        applyFilters();
      } catch {
        if (!cancelled) {
          setBuildings([]);
          applyFilters();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyFilters, selectedState, setBuildings, setLoading]);

  return (
    <div className="flex h-screen flex-col bg-bg-primary text-content-primary">
      <AppNav />
      <div className="relative min-h-0 flex-1">
        <AlertTicker state={selectedState} />
        <MapCanvas />
        <FilterSidebar />
        <RankedDrawer />
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-edge bg-bg-surface/90 px-4 py-2 text-xs text-content-secondary backdrop-blur">
          {isLoading ? "Loading buildings…" : `${count} buildings match filters`}
        </div>
      </div>
    </div>
  );
}
