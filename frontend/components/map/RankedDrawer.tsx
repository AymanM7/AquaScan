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
        size: 36,
      }),
      col.accessor("name", { header: "Building" }),
      col.accessor("final_score", {
        header: "Score",
        cell: (c) => c.getValue().toFixed(1),
        size: 72,
      }),
      col.accessor("wrai", {
        header: "WRAI",
        cell: (c) => c.getValue().toFixed(0),
        size: 64,
      }),
      col.accessor("genome_archetype", { header: "Genome" }),
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
    <div className="absolute right-4 top-20 z-20 flex h-[min(70vh,640px)] w-[min(520px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-edge bg-bg-surface/95 shadow-teal-glow backdrop-blur">
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
