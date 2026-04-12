/** Water Twin — mirrors `backend/services/hydrology.py` (PHASE_02 §5). */

export function computeIrr(capex: number, annualCashflow: number, years = 20): number {
  if (annualCashflow <= 0) return 0;
  let rate = 0.1;
  for (let i = 0; i < 100; i += 1) {
    let pv = 0;
    for (let yr = 1; yr <= years; yr += 1) {
      pv += annualCashflow / (1 + rate) ** yr;
    }
    const f = pv - capex;
    let df = 0;
    for (let yr = 1; yr <= years; yr += 1) {
      df += (-yr * annualCashflow) / (1 + rate) ** (yr + 1);
    }
    if (Math.abs(df) < 1e-10) break;
    rate -= f / df;
    rate = Math.max(-0.99, Math.min(rate, 10));
  }
  return rate;
}

export type HarvestOutput = {
  annual_gallons: number;
  annual_savings_usd: number;
  payback_years: number;
  irr_pct: number;
  stormwater_fee_avoidance: number;
  incentives_captured: number;
  npv_20yr: number;
  savings_curve: { year: number; cumulative_savings: number }[];
};

export function computeWaterTwin(params: {
  roof_sqft: number;
  annual_rain_inches: number;
  water_rate_per_kgal: number;
  sewer_rate_per_kgal: number;
  stormwater_fee_annual: number;
  rebate_usd: number;
  sales_tax_exempt: boolean;
  property_tax_exempt: boolean;
  rainfall_adj?: number;
  rate_multiplier?: number;
  reuse_fraction?: number;
  runoff_coefficient?: number;
}): HarvestOutput {
  const {
    roof_sqft,
    annual_rain_inches,
    water_rate_per_kgal,
    sewer_rate_per_kgal,
    stormwater_fee_annual,
    rebate_usd,
    sales_tax_exempt,
    property_tax_exempt,
    rainfall_adj = 0,
    rate_multiplier = 1,
    reuse_fraction = 0.85,
    runoff_coefficient = 0.85,
  } = params;

  const adjRain = annual_rain_inches * (1 + rainfall_adj);
  const annualGallons = roof_sqft * adjRain * 0.623 * runoff_coefficient;
  const reusedGallons = annualGallons * reuse_fraction;

  const combinedRate = (water_rate_per_kgal + sewer_rate_per_kgal) * rate_multiplier;
  const annualSavings = (reusedGallons / 1000) * combinedRate;

  const denom = roof_sqft * adjRain * 0.623;
  const captureRatio = denom > 0 ? Math.min(annualGallons / denom, 1) : 0;
  const stormwaterAvoidance = stormwater_fee_annual * captureRatio * 0.6;

  const capex = roof_sqft * 0.018;

  let incentives = rebate_usd || 0;
  if (sales_tax_exempt) incentives += capex * 0.0825;
  if (property_tax_exempt) incentives += capex * 0.012;

  const netCapex = Math.max(capex - incentives, capex * 0.5);
  const annualBenefit = annualSavings + stormwaterAvoidance;
  const paybackYears = annualBenefit > 0 ? netCapex / annualBenefit : 99;

  const irr = computeIrr(netCapex, annualBenefit, 20);
  const discountRate = 0.08;
  let npv = -netCapex;
  for (let yr = 1; yr <= 20; yr += 1) {
    npv += annualBenefit / (1 + discountRate) ** yr;
  }

  const savingsCurve: { year: number; cumulative_savings: number }[] = [];
  let cumulative = -netCapex;
  for (let yr = 1; yr <= 20; yr += 1) {
    cumulative += annualBenefit;
    savingsCurve.push({ year: yr, cumulative_savings: Math.round(cumulative) });
  }

  return {
    annual_gallons: Math.round(annualGallons),
    annual_savings_usd: Math.round(annualSavings * 100) / 100,
    payback_years: Math.round(paybackYears * 10) / 10,
    irr_pct: Math.round(irr * 1000) / 10,
    stormwater_fee_avoidance: Math.round(stormwaterAvoidance * 100) / 100,
    incentives_captured: Math.round(incentives * 100) / 100,
    npv_20yr: Math.round(npv),
    savings_curve: savingsCurve,
  };
}
