import { create } from "zustand";

export type ShockEvent = {
  id: string;
  headline: string;
};

type AlertState = {
  events: ShockEvent[];
  setEvents: (events: ShockEvent[]) => void;
};

export const useAlertStore = create<AlertState>((set) => ({
  events: [],
  setEvents: (events) => set({ events }),
}));
