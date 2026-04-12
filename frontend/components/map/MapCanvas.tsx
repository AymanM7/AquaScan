"use client";

import DeckGL from "@deck.gl/react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import Map from "react-map-gl";

import { RainParticleOverlay } from "@/components/map/RainParticleOverlay";
import {
  createBuildingPolygonLayer,
  createCoolingTowerLayer,
  createOpportunityHeatmap,
} from "@/components/map/layers";
import { useBuildingStore } from "@/store/buildingStore";

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

export function MapCanvas() {
  const router = useRouter();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const filteredBuildings = useBuildingStore((s) => s.filteredBuildings);
  const selectedBuildingId = useBuildingStore((s) => s.selectedBuildingId);
  const selectBuilding = useBuildingStore((s) => s.selectBuilding);
  const mapViewport = useBuildingStore((s) => s.mapViewport);
  const setMapViewport = useBuildingStore((s) => s.setMapViewport);

  const onSelect = useCallback(
    (id: string) => {
      selectBuilding(id);
      router.push(`/building/${id}`);
    },
    [router, selectBuilding],
  );

  const layers = useMemo(() => {
    if (!filteredBuildings.length) return [];
    return [
      createOpportunityHeatmap(filteredBuildings),
      createBuildingPolygonLayer(filteredBuildings, selectedBuildingId, onSelect),
      createCoolingTowerLayer(filteredBuildings),
    ];
  }, [filteredBuildings, onSelect, selectedBuildingId]);

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg-surface p-6 text-center text-content-secondary">
        Set <span className="font-mono text-content-mono">NEXT_PUBLIC_MAPBOX_TOKEN</span> to render
        the map (see <code className="font-mono">PHASE_04_MAP_DASHBOARD.md</code>).
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <DeckGL
        initialViewState={{
          longitude: mapViewport.lng,
          latitude: mapViewport.lat,
          zoom: mapViewport.zoom,
          pitch: mapViewport.pitch,
          bearing: mapViewport.bearing,
        }}
        controller
        layers={layers}
        onViewStateChange={({ viewState }: { viewState: Record<string, number> }) => {
          setMapViewport({
            lat: viewState.latitude,
            lng: viewState.longitude,
            zoom: viewState.zoom,
            pitch: viewState.pitch ?? 0,
            bearing: viewState.bearing ?? 0,
          });
        }}
        onClick={(info: { object?: unknown }) => {
          if (!info.object) selectBuilding(null);
        }}
      >
        <Map mapboxAccessToken={token} mapStyle={MAP_STYLE} reuseMaps />
      </DeckGL>
      <RainParticleOverlay />
    </div>
  );
}
