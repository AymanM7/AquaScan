/**
 * Typed helpers for Claude-backed endpoints (memo stream, boardroom JSON).
 * Keys are relative to `NEXT_PUBLIC_API_URL` — see `lib/api.ts`.
 */

import { apiJson, apiUrl } from "./api";

export type MemoMode = "Sales" | "Engineering" | "Executive";

export function memoStreamUrl(buildingId: string, _mode: MemoMode) {
  void _mode;
  return apiUrl(`/api/building/${buildingId}/memo`);
}

export async function fetchBoardroomDialogue(buildingId: string) {
  return apiJson<{ dialogue: unknown[] }>(`/api/building/${buildingId}/boardroom`, {
    method: "POST",
  });
}
