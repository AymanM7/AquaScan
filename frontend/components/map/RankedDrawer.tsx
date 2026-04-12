"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ListNumbers, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";

import { useBuildingStore } from "@/store/buildingStore";
import type { BuildingSummary } from "@/types/building";

const col = createColumnHelper<BuildingSummary>();

export function RankedDrawer() {
  const open = useBuildingStore((s) => s.isRankedTableOpen);
  const toggle = useBuildingStore((s) => s.toggleRankedTable);
  const rows = useBuildingStore((s) => s.filteredBuildings);
  const selectBuilding = useBuildingStore((s) => s.selectBuilding);

  const data = useMemo(
    () => [...rows].sort((a, b) => b.final_score - a.final_score).slice(0, 100),
    [rows],
  );

  const table = useReactTable({
    data,
    columns: [
      col.display({
        id: "rank",
        header: "#",
        cell: (ctx) => ctx.row.index + 1,
        size: 32,
      }),
      col.accessor("name", {
        header: "Building",
        cell: (c) => (
          <span className="max-w-[120px] truncate block" title={c.getValue()}>
            {c.getValue()}
          </span>
        ),
      }),
      col.accessor("final_score", {
        header: "Score",
        cell: (c) => {
          const s = c.getValue();
          const color = s >= 80 ? "text-accent-teal" : s >= 60 ? "text-accent-blue" : "text-content-secondary";
          return <span className={`font-mono font-semibold ${color}`}>{s.toFixed(0)}</span>;
        },
        size: 56,
      }),
      col.accessor("genome_archetype", {
        header: "Genome",
        cell: (c) => (
          <span className="rounded-full bg-bg-surface-2 px-1.5 py-0.5 text-[9px]">
            {c.getValue()?.split(" ").map(w => w[0]).join("") || "—"}
          </span>
        ),
        size: 56,
      }),
      col.accessor("roof_sqft", {
        header: "Roof",
        cell: (c) => `${(c.getValue() / 1000).toFixed(0)}k`,
        size: 52,
      }),
      col.accessor("ct_demand_tier", {
        header: "CT",
        cell: (c) => {
          const t = c.getValue();
          if (t === "High") return <span className="text-red-400">🔴</span>;
          if (t === "Medium") return <span className="text-amber-400">🟡</span>;
          return <span className="text-content-secondary/40">—</span>;
        },
        size: 32,
      }),
      col.accessor("annual_gallons", {
        header: "Gal/yr",
        cell: (c) => `${(c.getValue() / 1_000_000).toFixed(1)}M`,
        size: 56,
      }),
      col.accessor("payback_years", {
        header: "PB",
        cell: (c) => `${c.getValue().toFixed(1)}`,
        size: 40,
      }),
      col.accessor("wrai", {
        header: "WRAI",
        cell: (c) => {
          const w = c.getValue();
          const color = w >= 80 ? "text-red-400" : w >= 60 ? "text-amber-400" : "text-blue-400";
          return <span className={`font-mono ${color}`}>{w.toFixed(0)}</span>;
        },
        size: 48,
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-20 z-20 flex items-center gap-2 rounded-lg border border-edge bg-bg-surface/90 px-3 py-2 text-sm text-content-primary backdrop-blur"
      >
        <ListNumbers className="h-4 w-4 text-accent-teal" />
        Ranked
      </button>
    );
  }

  return (
    <div className="absolute right-4 top-20 z-20 flex h-[min(70vh,640px)] w-[min(680px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-edge bg-bg-surface/95 shadow-teal-glow backdrop-blur">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <div className="font-display text-sm font-semibold">Ranked targets</div>
        <button
          type="button"
          onClick={toggle}
          className="rounded p-1 text-content-secondary hover:bg-bg-surface-2"
          aria-label="Close ranked table"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto text-xs">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-bg-surface-2 text-left text-content-secondary">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-2 py-2 font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-edge hover:bg-bg-surface-2/80"
                onClick={() => selectBuilding(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-2 align-top text-content-primary">
                    {cell.column.id === "name" ? (
                      <Link
                        href={`/building/${row.original.id}`}
                        className="text-accent-teal underline-offset-2 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Link>
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length && (
          <div className="p-4 text-content-secondary">No buildings match the current filters.</div>
        )}
      </div>
    </div>
  );
}
