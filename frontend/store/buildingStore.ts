import { create } from "zustand";

type BuildingState = {
  selectedBuildingId: string | null;
  setSelectedBuildingId: (id: string | null) => void;
};

export const useBuildingStore = create<BuildingState>((set) => ({
  selectedBuildingId: null,
  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),
}));
