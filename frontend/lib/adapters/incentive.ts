import dallasTx from "@/lib/data/dallas_tx.json";
import generic from "@/lib/data/generic.json";

export type IncentiveAdapter = Record<string, unknown> & {
  city_id: string;
  programs?: { rebate_usd?: number; name?: string }[];
  sales_tax_exempt?: boolean;
  property_tax_exempt?: boolean;
  stormwater_credit_pct?: number;
  green_infra_grant_max?: number;
};

const ADAPTERS: Record<string, IncentiveAdapter> = {
  dallas_tx: dallasTx as IncentiveAdapter,
  generic: generic as IncentiveAdapter,
};

export function loadAdapter(cityId: string): IncentiveAdapter {
  return ADAPTERS[cityId] ?? generic;
}

export function computeIncentiveValue(
  adapter: IncentiveAdapter,
  roofSqft: number,
  capex: number,
): {
  rebate_usd: number;
  sales_tax_savings: number;
  property_tax_savings_est: number;
  grant_eligible: number;
  total_incentive_estimate: number;
  sales_tax_exempt: boolean;
  property_tax_exempt: boolean;
  stormwater_credit_pct: number;
  program_name: string;
} {
  const programs = adapter.programs ?? [];
  const totalRebate = programs.reduce((s, p) => s + (Number(p.rebate_usd) || 0), 0);
  const salesTaxSavings = adapter.sales_tax_exempt ? capex * 0.0825 : 0;
  const propertyTaxSavings = adapter.property_tax_exempt ? capex * 0.015 * 10 : 0;
  const grant = Math.min(Number(adapter.green_infra_grant_max || 0), capex * 0.3);
  const total =
    totalRebate + salesTaxSavings + propertyTaxSavings + grant;
  return {
    rebate_usd: totalRebate,
    sales_tax_savings: salesTaxSavings,
    property_tax_savings_est: propertyTaxSavings,
    grant_eligible: grant,
    total_incentive_estimate: total,
    sales_tax_exempt: Boolean(adapter.sales_tax_exempt),
    property_tax_exempt: Boolean(adapter.property_tax_exempt),
    stormwater_credit_pct: Number(adapter.stormwater_credit_pct ?? 0) || 0,
    program_name: (programs[0]?.name as string) || "",
  };
}
