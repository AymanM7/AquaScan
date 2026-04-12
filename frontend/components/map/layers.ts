import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";

import type { BuildingSummary } from "@/types/building";

function scoreColor(b: BuildingSummary, selectedId: string | null): [number, number, number, number] {
  if (b.id === selectedId) return [255, 255, 255, 255];
  const s = b.final_score;
  if (s >= 80) return [0, 229, 204, 255];
  if (s >= 60) return [55, 138, 221, 220];
  if (s >= 40) return [29, 158, 117, 200];
  return [40, 50, 60, 180];
}

export function createOpportunityHeatmap(buildings: BuildingSummary[]) {
  return new HeatmapLayer({
    id: "opportunity-heatmap",
    data: buildings.map((b) => ({
      coordinates: [b.centroid_lng, b.centroid_lat] as [number, number],
      weight: b.final_score / 100,
    })),
    getPosition: (d: { coordinates: [number, number] }) => d.coordinates,
    getWeight: (d: { weight: number }) => d.weight,
    radiusPixels: 60,
    intensity: 1.2,
    threshold: 0.1,
    colorRange: [
      [0, 40, 60, 0],
      [0, 100, 150, 80],
      [0, 229, 204, 140],
      [245, 166, 35, 180],
      [255, 200, 100, 220],
    ],
  });
}

export function createBuildingPolygonLayer(
  buildings: BuildingSummary[],
  selectedId: string | null,
  onSelect: (id: string) => void,
) {
  const features = buildings
    .filter((b) => {
      const g = b.polygon_geojson as { type?: string; coordinates?: unknown };
      return g?.type === "Polygon" && Array.isArray(g.coordinates);
    })
    .map((b) => ({
      type: "Feature" as const,
      geometry: b.polygon_geojson,
      properties: { id: b.id, score: b.final_score },
    }));

  return new GeoJsonLayer({
    id: "building-polygons",
    data: { type: "FeatureCollection" as const, features },
    pickable: true,
    filled: true,
    stroked: true,
    getFillColor: (f: { properties: { id: string } }) => {
      const b = buildings.find((x) => x.id === f.properties.id);
      return b ? scoreColor(b, selectedId) : [40, 50, 60, 120];
    },
    getLineColor: [0, 229, 204, 120],
    getLineWidth: 1,
    onClick: (info: { object?: unknown }) => {
      const feat = info.object as { properties?: { id?: string } } | undefined;
      const id = feat?.properties?.id;
      if (id) onSelect(id);
    },
  });
}

export function createCoolingTowerLayer(buildings: BuildingSummary[]) {
  const data = buildings.filter((b) => b.ct_detected);
  return new ScatterplotLayer({
    id: "cooling-towers",
    data,
    getPosition: (d: BuildingSummary) => [d.centroid_lng, d.centroid_lat],
    getRadius: 14,
    radiusUnits: "pixels",
    getFillColor: [245, 166, 35, 230],
    pickable: true,
  });
}
