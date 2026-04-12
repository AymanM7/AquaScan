/** Gemini-backed routes — voice script + satellite vision (Phase 06). */

import { apiJson } from "./api";

export async function fetchVoiceScript(buildingId: string) {
  return apiJson<{ script: string }>(`/api/building/${buildingId}/voice-script`, {
    method: "POST",
  });
}

export async function fetchSatelliteAnalysis(buildingId: string, force = false) {
  const q = force ? "?force=true" : "";
  return apiJson<{ analysis: string | null; cached: boolean }>(
    `/api/building/${buildingId}/analyze-image${q}`,
    { method: "POST" },
  );
}
