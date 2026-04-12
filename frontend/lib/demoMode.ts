/** Phase 12 — demo / judge mode flags */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_REP_ID =
  process.env.NEXT_PUBLIC_DEMO_REP_ID?.trim() || "rep@grundfos.com";
