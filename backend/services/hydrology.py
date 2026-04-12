"""Water Twin hydrology — aligned with PHASE_02 §5."""

from dataclasses import dataclass


def compute_irr(capex: float, annual_cashflow: float, years: int = 20) -> float:
    if annual_cashflow <= 0:
        return 0.0

    rate = 0.10
    for _ in range(100):
        pv = sum(annual_cashflow / (1 + rate) ** yr for yr in range(1, years + 1))
        f = pv - capex
        df = sum(
            -yr * annual_cashflow / (1 + rate) ** (yr + 1) for yr in range(1, years + 1)
        )
        if abs(df) < 1e-10:
            break
        rate -= f / df
        rate = max(-0.99, min(rate, 10.0))

    return rate


@dataclass
class HarvestOutputData:
    annual_gallons: float
    annual_savings_usd: float
    payback_years: float
    irr_pct: float
    stormwater_fee_avoidance: float
    incentives_captured: float
    npv_20yr: float
    savings_curve: list[dict]


def compute_water_twin(
    roof_sqft: float,
    annual_rain_inches: float,
    water_rate_per_kgal: float,
    sewer_rate_per_kgal: float,
    stormwater_fee_annual: float,
    rebate_usd: float,
    sales_tax_exempt: bool,
    property_tax_exempt: bool,
    rainfall_adj: float = 0.0,
    rate_multiplier: float = 1.0,
    reuse_fraction: float = 0.85,
    runoff_coefficient: float = 0.85,
) -> HarvestOutputData:
    adj_rain = annual_rain_inches * (1 + rainfall_adj)
    annual_gallons = roof_sqft * adj_rain * 0.623 * runoff_coefficient
    reused_gallons = annual_gallons * reuse_fraction

    combined_rate = (water_rate_per_kgal + sewer_rate_per_kgal) * rate_multiplier
    annual_savings = (reused_gallons / 1000) * combined_rate

    denom = roof_sqft * adj_rain * 0.623
    capture_ratio = min(annual_gallons / denom, 1.0) if denom > 0 else 0.0
    stormwater_avoidance = stormwater_fee_annual * capture_ratio * 0.6

    capex = roof_sqft * 0.018

    incentives = float(rebate_usd or 0)
    if sales_tax_exempt:
        incentives += capex * 0.0825
    if property_tax_exempt:
        incentives += capex * 0.012

    net_capex = max(capex - incentives, capex * 0.5)
    annual_benefit = annual_savings + stormwater_avoidance
    payback_years = net_capex / annual_benefit if annual_benefit > 0 else 99.0

    irr = compute_irr(net_capex, annual_benefit, years=20)
    discount_rate = 0.08
    npv = (
        sum(annual_benefit / (1 + discount_rate) ** yr for yr in range(1, 21))
        - net_capex
    )

    savings_curve: list[dict] = []
    cumulative = -net_capex
    for yr in range(1, 21):
        cumulative += annual_benefit
        savings_curve.append({"year": yr, "cumulative_savings": round(cumulative, 0)})

    return HarvestOutputData(
        annual_gallons=round(annual_gallons, 0),
        annual_savings_usd=round(annual_savings, 2),
        payback_years=round(payback_years, 1),
        irr_pct=round(irr * 100, 1),
        stormwater_fee_avoidance=round(stormwater_avoidance, 2),
        incentives_captured=round(incentives, 2),
        npv_20yr=round(npv, 0),
        savings_curve=savings_curve,
    )
