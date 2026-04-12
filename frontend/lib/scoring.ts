/** Viability scoring — mirrors `backend/services/scoring.py` (PHASE_02). */

export function roofScore(roofSqft: number): number {
  if (roofSqft < 100_000) return 0;
  if (roofSqft < 150_000) return 5;
  if (roofSqft < 250_000) return 7;
  if (roofSqft < 350_000) return 9;
  return 10;
}

export function ctScore(ctDetected: boolean, ctConfidence: number): number {
  if (!ctDetected) return 3;
  const c = ctConfidence || 0;
  if (c >= 0.5 && c < 0.7) return 6;
  if (c >= 0.7 && c < 0.85) return 8;
  if (c >= 0.85) return 10;
  return 6;
}

export function cvConfScore(roofConfidence: number, areaConfidence: number): number {
  return (roofConfidence * 0.6 + areaConfidence * 0.4) * 10;
}

export function computePhysicalScore(
  roofSqft: number,
  ctDetected: boolean,
  ctConfidence: number,
  roofConfidence: number,
  areaConfidence: number,
): number {
  const rs = roofScore(roofSqft);
  const cs = ctScore(ctDetected, ctConfidence);
  const cv = cvConfScore(roofConfidence, areaConfidence);
  const physicalRaw = rs * 0.5 + cs * 0.3 + cv * 0.2;
  return physicalRaw * 4;
}

export function waterRateScore(combinedRate: number): number {
  if (combinedRate < 8) return 3;
  if (combinedRate < 11) return 5;
  if (combinedRate < 14) return 7;
  if (combinedRate <= 18) return 9;
  return 10;
}

export function stormwaterScore(feeAnnual: number): number {
  if (feeAnnual < 500) return 2;
  if (feeAnnual <= 2000) return 5;
  if (feeAnnual <= 5000) return 7;
  return 10;
}

export function incentiveScore(totalIncentive: number): number {
  if (totalIncentive <= 0) return 0;
  if (totalIncentive <= 5000) return 4;
  if (totalIncentive <= 25_000) return 6;
  if (totalIncentive <= 100_000) return 8;
  return 10;
}

export function paybackScore(paybackYears: number): number {
  if (paybackYears > 10) return 2;
  if (paybackYears > 7) return 4;
  if (paybackYears > 5) return 6;
  if (paybackYears > 3) return 8;
  return 10;
}

export function computeEconomicScore(
  waterRatePerKgal: number,
  sewerRatePerKgal: number,
  stormwaterFeeAnnual: number,
  totalIncentiveEstimate: number,
  paybackYears: number,
): number {
  const combined = (waterRatePerKgal || 0) + (sewerRatePerKgal || 0);
  const rateScore = waterRateScore(combined);
  const stormScore = stormwaterScore(stormwaterFeeAnnual || 0);
  const incScore = incentiveScore(totalIncentiveEstimate);
  const pbScore = paybackScore(paybackYears);
  const economicRaw = rateScore * 0.35 + stormScore * 0.3 + incScore * 0.2 + pbScore * 0.15;
  return economicRaw * 3.5;
}

export function esgScore(waterMentions: number, leedCertified: boolean): number {
  const m = Math.floor(waterMentions || 0);
  let s = 1;
  if (m === 0) s = 1;
  else if (m <= 2) s = 3;
  else if (m <= 5) s = 5;
  else if (m <= 9) s = 7;
  else s = 10;
  if (leedCertified) s = Math.min(10, s + 2);
  return s;
}

export function droughtScoreFromLabel(droughtLabel: string | null | undefined): number {
  const label = (droughtLabel || "None").trim();
  const mapping: Record<string, number> = {
    None: 0,
    D0: 3,
    D1: 5,
    D2: 7,
    D3: 9,
    D4: 10,
  };
  return mapping[label] ?? 0;
}

export function floodScore(floodZone: string | null | undefined, femaFloodRisk: number): number {
  const z = (floodZone || "").toUpperCase();
  if (z === "X") return 3;
  if (z === "AO") return 5;
  if (z === "AE") return 8;
  if (z === "VE") return 10;
  const r = femaFloodRisk || 0;
  return Math.max(0, Math.min(10, r * 10));
}

export function leedScore(leedCertified: boolean, leedLevel: string | null | undefined): number {
  if (!leedCertified) return 2;
  const lvl = (leedLevel || "").trim().toLowerCase();
  if (lvl === "certified") return 5;
  if (lvl === "silver") return 6;
  if (lvl === "gold") return 8;
  if (lvl === "platinum") return 10;
  return 5;
}

export function computeStrategicScore(
  waterMentions: number,
  leedCertified: boolean,
  leedLevel: string | null | undefined,
  droughtLabel: string | null | undefined,
  floodZone: string | null | undefined,
  femaFloodRisk: number,
): number {
  const esg = esgScore(waterMentions, leedCertified);
  const drt = droughtScoreFromLabel(droughtLabel);
  const fld = floodScore(floodZone, femaFloodRisk);
  const leed = leedScore(leedCertified, leedLevel);
  const strategicRaw = esg * 0.3 + drt * 0.3 + fld * 0.2 + leed * 0.2;
  return strategicRaw * 2.5;
}

export function computeConfidence(
  roofConfidence: number,
  ctConfidence: number,
  areaConfidence: number,
  ctDetected: boolean,
): number {
  const ctC = ctDetected ? ctConfidence || 0 : 0.8;
  return (roofConfidence || 0) * 0.4 + ctC * 0.35 + (areaConfidence || 0) * 0.25;
}

function droughtNormalized(droughtLabel: string | null | undefined): number {
  const label = (droughtLabel || "None").trim();
  const m: Record<string, number> = { None: 0, D0: 0.2, D1: 0.4, D2: 0.6, D3: 0.8, D4: 1 };
  return m[label] ?? 0;
}

function peerEsgPressure(sector: string | null | undefined): number {
  const table: Record<string, number> = {
    "Data Center": 85,
    Manufacturing: 70,
    Logistics: 65,
    Hospital: 60,
    University: 75,
  };
  return table[sector || ""] ?? 50;
}

function rateTrajectory(city: string, state: string): number {
  const c = (city || "").toLowerCase();
  const st = (state || "").toUpperCase();
  if (st === "TX" && c.includes("austin")) return 78;
  if (st === "TX") return 72;
  if (c.includes("philadelphia") || st === "PA") return 65;
  if (c.includes("tucson") || st === "AZ") return 88;
  return 70;
}

export type AdapterRowLike = {
  rebate_usd?: number | null;
  program_name?: string | null;
  mandate_threshold_sqft?: number | null;
  description?: string | null;
} | null;

function regulatoryMomentum(adapterRow: AdapterRowLike): number {
  if (!adapterRow) return 20;
  let score = 20;
  if ((adapterRow.rebate_usd || 0) > 0 || adapterRow.program_name) score = 40;
  if (adapterRow.mandate_threshold_sqft) score = Math.max(score, 70);
  const desc = (adapterRow.description || "").toLowerCase();
  if (desc.includes("penalt") || desc.includes("enforcement")) score = Math.max(score, 100);
  else if (desc.includes("pending") && desc.includes("mandate")) score = Math.max(score, 90);
  else if (desc.includes("mandate") || desc.includes("reuse")) score = Math.max(score, 70);
  return Math.min(100, score);
}

export function computeWrai(params: {
  drought_label: string | null | undefined;
  fema_flood_risk: number;
  sector: string | null | undefined;
  city: string;
  state: string;
  adapter_row: AdapterRowLike;
}): number {
  const climateAcc =
    (droughtNormalized(params.drought_label) * 0.6 + (params.fema_flood_risk || 0) * 0.4) * 100;
  const reg = regulatoryMomentum(params.adapter_row);
  const peer = peerEsgPressure(params.sector);
  const rate = rateTrajectory(params.city, params.state);
  return reg * 0.3 + climateAcc * 0.25 + peer * 0.25 + rate * 0.2;
}

export function classifyGenome(
  physical: number,
  economic: number,
  strategic: number,
  ctDetected: boolean,
  wrai: number,
): string {
  const physNorm = (physical / 40) * 100;
  const econNorm = (economic / 35) * 100;
  const stratNorm = (strategic / 25) * 100;
  void wrai;

  if (ctDetected && physNorm >= 75) return "Cooling-Driven Reuse Giant";
  if (physNorm >= 80 && econNorm >= 70) return "Storm-Value Titan";
  if (stratNorm >= 80 && econNorm >= 60) return "ESG Mandate Accelerator";
  if (econNorm >= 80 && physNorm >= 60 && stratNorm < 50) return "Hidden High-ROI Candidate";
  if (stratNorm >= 70 && physNorm >= 55) return "Flood-Resilience Priority";

  const maxPillar = Math.max(physNorm, econNorm, stratNorm);
  if (maxPillar === physNorm) return "Storm-Value Titan";
  if (maxPillar === econNorm) return "Hidden High-ROI Candidate";
  return "ESG Mandate Accelerator";
}

export function wraiBadgeLabel(wrai: number): string {
  if (wrai >= 80) return "Act Now";
  if (wrai >= 60) return "High Priority";
  if (wrai >= 40) return "Monitor";
  return "Standard";
}

export function hydroDeliberationClass(building: {
  ct_detected: boolean;
  ct_confidence: number;
  flood_zone: string;
  fema_flood_risk: number;
}): "cooling_reuse" | "resilience_flood" | "rain_roi" {
  if (building.ct_detected && (building.ct_confidence || 0) >= 0.7) return "cooling_reuse";
  const fz = (building.flood_zone || "").toUpperCase();
  if (fz === "AE" || fz === "VE" || (building.fema_flood_risk || 0) >= 0.35) return "resilience_flood";
  return "rain_roi";
}
