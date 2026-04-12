export type BuildingSummary = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  sector: string;
  roof_sqft: number;
  effective_catchment_sqft: number;
  usable_footprint_sqft: number;
  centroid_lat: number;
  centroid_lng: number;
  polygon_geojson: Record<string, unknown>;
  final_score: number;
  wrai: number;
  genome_archetype: string;
  ct_detected: boolean;
  ct_confidence: number;
  ct_count: number;
  ct_demand_tier: string;
  annual_gallons: number;
  payback_years: number;
  drought_label: string;
};

export type AlertEvent = {
  id: string;
  type: string;
  state: string;
  city: string | null;
  building_ids: string[];
  score_delta: number | null;
  description: string | null;
  source: string;
  event_timestamp: string;
};

export type IncentiveProgram = {
  program_name: string;
  type: string;
  value: string;
  eligibility: "confirmed" | "likely" | "case_by_case" | "not_applicable";
  source_url: string;
  description: string;
};

export type TexasReferenceCase = {
  project_name: string;
  project_value_usd: number;
  abatement_pct: number;
  abatement_years: number;
  county_tax_rate: number;
  annual_savings_usd: number;
  total_savings_usd: number;
  description: string;
};

export type BuildingDetail = BuildingSummary & {
  area_confidence: number;
  roof_confidence: number;
  drought_score: number;
  roof_mask_url: string | null;
  raw_chip_url: string | null;
  masked_chip_url: string | null;
  effective_mask_url: string | null;
  usable_mask_url: string | null;
  ct_boxes: Record<string, unknown>[];
  ct_type: string;
  ct_arrangement: string;
  est_cooling_consumption_gal_yr: number;
  water_rate_per_kgal: number;
  sewer_rate_per_kgal: number;
  stormwater_fee_annual: number;
  rebate_usd: number;
  sales_tax_exempt: boolean;
  property_tax_exempt: boolean;
  stormwater_credit_pct: number;
  program_name: string;
  owner_name: string;
  sec_cik: string;
  esg_score: number;
  water_mentions: number;
  leed_certified: boolean;
  leed_level: string;
  esg_accelerator: boolean;
  ticker: string;
  corporate_parent: string;
  annual_rain_inches: number;
  flood_zone: string;
  fema_flood_risk: number;
  physical_score: number;
  economic_score: number;
  strategic_score: number;
  confidence_composite: number;
  alert_events: AlertEvent[];
  wrai_badge: string;
  irr_pct: number;
  annual_savings_usd: number;
  npv_20yr: number;
  stormwater_fee_avoidance: number;
  savings_curve: { year: number; cumulative_savings: number }[];
  hydro_thesis: string;
  incentive_stack: IncentiveProgram[];
  combined_incentive_estimate: number;
  texas_reference_case: TexasReferenceCase | null;
};

export type BoardroomMessage = {
  persona: string;
  text?: string;
  verdict?: string;
  confidence?: number;
};
