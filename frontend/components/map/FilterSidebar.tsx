"use client";

import * as Slider from "@radix-ui/react-slider";
import { FunnelSimple, X } from "@phosphor-icons/react";
import { useMemo } from "react";

import { cn } from "@/lib/cn";
import { useBuildingStore } from "@/store/buildingStore";

export function FilterSidebar() {
  const buildings = useBuildingStore((s) => s.buildings);
  const activeFilters = useBuildingStore((s) => s.activeFilters);
  const setFilter = useBuildingStore((s) => s.setFilter);
  const applyFilters = useBuildingStore((s) => s.applyFilters);
  const resetFilters = useBuildingStore((s) => s.resetFilters);
  const isOpen = useBuildingStore((s) => s.isSidebarOpen);
  const toggleSidebar = useBuildingStore((s) => s.toggleSidebar);

  const sectors = useMemo(() => {
    const s = new Set<string>();
    for (const b of buildings) {
      if (b.sector) s.add(b.sector);
    }
    return Array.from(s).sort();
  }, [buildings]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute left-4 top-20 z-20 flex items-center gap-2 rounded-lg border border-edge bg-bg-surface/90 px-3 py-2 text-sm text-content-primary backdrop-blur"
      >
        <FunnelSimple className="h-4 w-4 text-accent-teal" />
        Filters
      </button>
    );
  }

  return (
    <aside className="absolute left-4 top-20 z-20 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-edge bg-bg-surface/95 p-4 text-sm text-content-primary shadow-teal-glow backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-base font-semibold">Filters</div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded p-1 text-content-secondary hover:bg-bg-surface-2 hover:text-content-primary"
          aria-label="Close filters"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <div className="mb-1 text-content-secondary">Score range</div>
          <Slider.Root
            className="relative flex h-5 w-full touch-none select-none items-center"
            min={0}
            max={100}
            step={1}
            value={[activeFilters.minScore, activeFilters.maxScore]}
            onValueChange={(v) => {
              setFilter("minScore", v[0]);
              setFilter("maxScore", v[1]);
              applyFilters();
            }}
          >
            <Slider.Track className="relative h-1 grow rounded-full bg-bg-surface-2">
              <Slider.Range className="absolute h-full rounded-full bg-accent-teal" />
            </Slider.Track>
            <Slider.Thumb className="block h-4 w-4 rounded-full border border-accent-teal bg-bg-primary shadow" />
            <Slider.Thumb className="block h-4 w-4 rounded-full border border-accent-teal bg-bg-primary shadow" />
          </Slider.Root>
          <div className="mt-1 font-mono text-xs text-content-mono">
            {activeFilters.minScore} – {activeFilters.maxScore}
          </div>
        </div>

        <div>
          <div className="mb-1 text-content-secondary">Min roof (sqft)</div>
          <Slider.Root
            className="relative flex h-5 w-full touch-none select-none items-center"
            min={50_000}
            max={600_000}
            step={10_000}
            value={[activeFilters.minRoofSqft]}
            onValueChange={(v) => {
              setFilter("minRoofSqft", v[0]);
              applyFilters();
            }}
          >
            <Slider.Track className="relative h-1 grow rounded-full bg-bg-surface-2">
              <Slider.Range className="absolute h-full rounded-full bg-accent-blue" />
            </Slider.Track>
            <Slider.Thumb className="block h-4 w-4 rounded-full border border-accent-blue bg-bg-primary shadow" />
          </Slider.Root>
          <div className="mt-1 font-mono text-xs text-content-mono">
            {activeFilters.minRoofSqft.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="mb-1 text-content-secondary">Cooling tower</div>
          <select
            className="w-full rounded-md border border-edge bg-bg-primary px-2 py-2 text-content-primary"
            value={activeFilters.coolingTower}
            onChange={(e) => {
              setFilter("coolingTower", e.target.value as typeof activeFilters.coolingTower);
              applyFilters();
            }}
          >
            <option value="all">All</option>
            <option value="detected">Detected</option>
            <option value="not_required">Not required</option>
          </select>
        </div>

        <div>
          <div className="mb-1 text-content-secondary">WRAI band</div>
          <select
            className="w-full rounded-md border border-edge bg-bg-primary px-2 py-2 text-content-primary"
            value={activeFilters.wraiLevel}
            onChange={(e) => {
              setFilter("wraiLevel", e.target.value as typeof activeFilters.wraiLevel);
              applyFilters();
            }}
          >
            <option value="any">Any</option>
            <option value="monitor">Monitor (40–60)</option>
            <option value="high">High (60–80)</option>
            <option value="act_now">Act now (80+)</option>
          </select>
        </div>

        <div>
          <div className="mb-1 text-content-secondary">Min drought class</div>
          <Slider.Root
            className="relative flex h-5 w-full touch-none select-none items-center"
            min={0}
            max={5}
            step={1}
            value={[activeFilters.minDrought]}
            onValueChange={(v) => {
              setFilter("minDrought", v[0]);
              applyFilters();
            }}
          >
            <Slider.Track className="relative h-1 grow rounded-full bg-bg-surface-2">
              <Slider.Range className="absolute h-full rounded-full bg-accent-amber" />
            </Slider.Track>
            <Slider.Thumb className="block h-4 w-4 rounded-full border border-accent-amber bg-bg-primary shadow" />
          </Slider.Root>
          <div className="mt-1 text-xs text-content-secondary">
            0 = None … 5 = D4+
          </div>
        </div>

        <div>
          <div className="mb-1 text-content-secondary">Sectors</div>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-edge bg-bg-primary p-2">
            {sectors.map((sec) => {
              const checked = activeFilters.sectors.includes(sec);
              return (
                <label key={sec} className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? activeFilters.sectors.filter((s) => s !== sec)
                        : [...activeFilters.sectors, sec];
                      setFilter("sectors", next);
                      applyFilters();
                    }}
                  />
                  <span className={cn(checked && "text-accent-teal")}>{sec}</span>
                </label>
              );
            })}
            {!sectors.length && (
              <div className="text-xs text-content-secondary">Load buildings to see sectors.</div>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-content-secondary">
          <input
            type="checkbox"
            checked={activeFilters.incentiveRequired}
            onChange={(e) => {
              setFilter("incentiveRequired", e.target.checked);
              applyFilters();
            }}
          />
          Strong economics only (payback ≤ 6y)
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-md border border-edge bg-bg-surface-2 px-3 py-2 text-xs font-medium hover:border-edge-active"
            onClick={() => {
              resetFilters();
              applyFilters();
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="flex-1 rounded-md bg-accent-teal px-3 py-2 text-xs font-semibold text-bg-primary"
            onClick={() => applyFilters()}
          >
            Apply
          </button>
        </div>
      </div>
    </aside>
  );
}
