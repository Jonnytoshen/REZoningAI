"""Annual finance prototype for the WTG1 source workbook's 1+20 year case."""

import argparse
import json
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from math import isfinite
from pathlib import Path


MODEL_VERSION = "wtg1-source-0.2.0"
PROJECT_MODEL_VERSION = "wtg1-engineering-0.1.0"
OPERATING_YEARS = 20


@dataclass(frozen=True)
class FinancialAssumptions:
    construction_equity_pct: float
    working_capital_cny_per_kw: float
    working_capital_equity_pct: float
    working_capital_interest_pct: float
    long_term_interest_pct: float
    loan_years: int
    equity_discount_pct: float
    project_pre_tax_discount_pct: float
    project_post_tax_discount_pct: float
    gross_tariff_cny_per_kwh: float
    vat_pct: float
    vat_surcharge_pct: float
    actual_income_tax_pct: tuple[float, ...]
    adjusted_income_tax_pct: tuple[float, ...]
    taxable_subsidy_wan: tuple[float, ...]
    tax_exempt_subsidy_wan: tuple[float, ...]
    residual_pct: float
    depreciation_years: int
    maintenance_pct: tuple[float, ...]
    worker_count: int
    worker_salary_wan: float
    worker_benefits_pct: float
    technician_count: int
    technician_salary_wan: float
    technician_benefits_pct: float
    insurance_pct: float
    materials_cny_per_kw: float
    dividend_pct_of_equity: float
    statutory_reserve_pct: float
    discretionary_reserve_pct: float

    def __post_init__(self):
        _validate_assumption_values(self)


@dataclass(frozen=True)
class Assumptions:
    capacity_mw: float
    static_capex_cny_per_w: float
    construction_input_vat_pct: float
    construction_equity_pct: float
    working_capital_cny_per_kw: float
    working_capital_equity_pct: float
    working_capital_interest_pct: float
    long_term_interest_pct: float
    loan_years: int
    equity_discount_pct: float
    project_pre_tax_discount_pct: float
    project_post_tax_discount_pct: float
    gross_tariff_cny_per_kwh: float
    vat_pct: float
    vat_surcharge_pct: float
    actual_income_tax_pct: tuple[float, ...]
    adjusted_income_tax_pct: tuple[float, ...]
    taxable_subsidy_wan: tuple[float, ...]
    tax_exempt_subsidy_wan: tuple[float, ...]
    residual_pct: float
    depreciation_years: int
    maintenance_pct: tuple[float, ...]
    worker_count: int
    worker_salary_wan: float
    worker_benefits_pct: float
    technician_count: int
    technician_salary_wan: float
    technician_benefits_pct: float
    insurance_pct: float
    materials_cny_per_kw: float
    construction_other_cny_per_kw: float
    local_support_wan: float
    permanent_land_mu: float
    permanent_land_cny_per_mu: float
    lease_land_mu: float
    construction_lease_cny_per_mu: float
    operating_lease_cny_per_mu: float
    temporary_land_mu: float
    temporary_land_cny_per_mu: float
    dividend_pct_of_equity: float
    statutory_reserve_pct: float
    discretionary_reserve_pct: float

    def __post_init__(self):
        _validate_assumption_values(self)
        if self.capacity_mw <= 0 or self.static_capex_cny_per_w <= 0:
            raise ValueError("Capacity and unit capex must be positive")


def _validate_assumption_values(assumptions):
    for name, value in vars(assumptions).items():
        if isinstance(value, (tuple, list)):
            if name not in {
                "actual_income_tax_pct", "adjusted_income_tax_pct",
                "taxable_subsidy_wan", "tax_exempt_subsidy_wan", "maintenance_pct",
            } or len(value) != OPERATING_YEARS:
                raise ValueError(f"{name} must have the expected scalar or 20-year shape")
            object.__setattr__(assumptions, name, tuple(value))
            values = value
        else:
            values = (value,)
        for item in values:
            if type(item) not in (float, int) or not isfinite(item) or item < 0:
                raise ValueError(f"{name} requires finite, nonnegative numbers")
            if ("_pct" in name) and item > 100:
                raise ValueError(f"{name} uses percentages from 0 to 100")
    for name in (
        "actual_income_tax_pct", "adjusted_income_tax_pct",
        "taxable_subsidy_wan", "tax_exempt_subsidy_wan", "maintenance_pct",
    ):
        if not isinstance(getattr(assumptions, name), tuple):
            raise ValueError(f"{name} requires 20 operating-year values")
    for name in ("loan_years", "depreciation_years"):
        value = getattr(assumptions, name)
        if type(value) is not int or not 1 <= value <= OPERATING_YEARS:
            raise ValueError(f"{name} must be an integer from 1 to 20")
    for name in ("worker_count", "technician_count"):
        if type(getattr(assumptions, name)) is not int:
            raise ValueError(f"{name} requires an integer")


@dataclass(frozen=True)
class ProjectInvestment:
    capacity_mw: float
    static_capex_wan: float
    price_contingency_wan: float
    construction_input_vat_wan: float

    def __post_init__(self):
        for name, value in vars(self).items():
            if type(value) not in (float, int) or not isfinite(value) or value < 0:
                raise ValueError(f"{name} 需要有限的非负数值")
        if self.capacity_mw == 0 or self.static_capex_wan == 0:
            raise ValueError("装机容量和静态投资须大于零")
        if self.construction_input_vat_wan > self.static_capex_wan + self.price_contingency_wan:
            raise ValueError("可抵扣建设期进项税不得超过含税建设支出")


def _ratio(numerator, denominator):
    return numerator / denominator if denominator else None


def _npv(rate, flows):
    """Excel NPV convention: discount the first listed value by one period."""
    return sum(value / (1 + rate) ** period for period, value in enumerate(flows, 1))


def _irr_pct(flows):
    signs = [value > 0 for value in flows if value != 0]
    if sum(left != right for left, right in zip(signs, signs[1:])) != 1:
        return None
    low, high = -0.999999, 1.0
    low_npv = _npv(low, flows)
    while (low_npv > 0) == (_npv(high, flows) > 0) and high < 1_000_000:
        high = high * 2 + 1
    if (low_npv > 0) == (_npv(high, flows) > 0):
        return None
    for _ in range(90):
        mid = (low + high) / 2
        if (low_npv > 0) == (_npv(mid, flows) > 0):
            low = mid
        else:
            high = mid
    return (low + high) / 2 * 100


def _payback_years(flows):
    cumulative = flows[0]
    for previous_year, flow in enumerate(flows[1:], 1):
        if cumulative < 0 <= cumulative + flow:
            return previous_year - cumulative / flow
        cumulative += flow
    return None


def calculate(a: Assumptions, *, annual_grid_energy_mwh: Sequence[float]) -> dict:
    """Reproduce WTG1 with the source workbook's investment and rent treatment."""
    static_capex = a.capacity_mw * a.static_capex_cny_per_w * 100
    annual_lease = a.lease_land_mu * a.operating_lease_cny_per_mu / 10_000
    construction_other = a.capacity_mw * a.construction_other_cny_per_kw / 10 + (
        a.permanent_land_mu * a.permanent_land_cny_per_mu
        + a.lease_land_mu * a.construction_lease_cny_per_mu
        + a.temporary_land_mu * a.temporary_land_cny_per_mu
    ) / 10_000 + a.local_support_wan
    investment = ProjectInvestment(
        a.capacity_mw, static_capex, 0.0, static_capex * a.construction_input_vat_pct / 100
    )
    result = _calculate(
        a, investment, annual_grid_energy_mwh, (annual_lease,) * OPERATING_YEARS,
        construction_opex=construction_other + annual_lease, workbook_compatibility=True,
    )
    return {"model_version": MODEL_VERSION, **result}


def calculate_from_investment(
    a: FinancialAssumptions,
    investment: ProjectInvestment,
    *,
    annual_grid_energy_mwh: Sequence[float],
    operating_land_rent_wan: Sequence[float],
) -> dict:
    """Calculate finance with construction costs capitalized in the supplied investment."""
    rent = _annual_values(operating_land_rent_wan, "operating_land_rent_wan")
    result = _calculate(a, investment, annual_grid_energy_mwh, rent)
    result["inputs"]["investment"] = asdict(investment)
    result["inputs"]["operating_land_rent_wan"] = rent
    result["metrics"]["price_contingency_wan"] = investment.price_contingency_wan
    result["metrics"]["construction_spend_wan"] = investment.static_capex_wan + investment.price_contingency_wan
    return {"model_version": PROJECT_MODEL_VERSION, **result}


def _annual_values(values, field):
    if not isinstance(values, Sequence) or len(values) != OPERATING_YEARS:
        raise ValueError(f"{field} requires 20 operating-year values")
    values = tuple(values)
    if any(type(value) not in (int, float) or not isfinite(value) or value < 0 for value in values):
        raise ValueError(f"{field} requires finite, nonnegative values")
    return values


def _calculate(a, investment, annual_grid_energy_mwh, operating_rent, *,
               construction_opex=0.0, workbook_compatibility=False):
    grid_sales = _annual_values(annual_grid_energy_mwh, "annual_grid_energy_mwh")
    capacity_mw = investment.capacity_mw
    static_capex = investment.static_capex_wan
    construction_spend = static_capex + investment.price_contingency_wan
    construction_interest = construction_spend * a.long_term_interest_pct / 100 * (
        1 - a.construction_equity_pct / 100
    ) / 2
    dynamic_capex = construction_spend + construction_interest
    working_capital = capacity_mw * a.working_capital_cny_per_kw / 10
    total_investment = dynamic_capex + working_capital
    construction_equity = dynamic_capex * a.construction_equity_pct / 100
    working_equity = working_capital * a.working_capital_equity_pct / 100
    total_equity = construction_equity + working_equity
    long_loan = dynamic_capex - construction_equity
    working_loan = working_capital - working_equity
    initial_vat_credit = investment.construction_input_vat_wan
    maintenance_base = construction_spend - initial_vat_credit
    fixed_asset_base = dynamic_capex - initial_vat_credit
    residual = fixed_asset_base * a.residual_pct / 100
    annual_depreciation = (fixed_asset_base - residual) / a.depreciation_years
    annual_payroll = a.worker_count * a.worker_salary_wan * (
        1 + a.worker_benefits_pct / 100
    ) + a.technician_count * a.technician_salary_wan * (1 + a.technician_benefits_pct / 100)
    net_tariff = a.gross_tariff_cny_per_kwh / (1 + a.vat_pct / 100)

    annual = []
    long_balance = long_loan
    vat_credit = initial_vat_credit
    accumulated_cash = accumulated_reserve = retained_profit = fixed_depreciation = 0.0
    for operation_year in range(OPERATING_YEARS + 1):
        operating = operation_year > 0
        index = operation_year - 1
        terminal = operation_year == OPERATING_YEARS
        energy = grid_sales[index] if operating else 0.0
        gross_revenue = energy * a.gross_tariff_cny_per_kwh / 10
        revenue = energy * net_tariff / 10
        output_vat = gross_revenue - revenue
        vat_offset = min(output_vat, vat_credit)
        vat_credit -= vat_offset
        vat_due = output_vat - vat_offset
        surcharge = vat_due * a.vat_surcharge_pct / 100

        long_interest = long_balance * a.long_term_interest_pct / 100 if operating else 0.0
        working_interest = working_loan * a.working_capital_interest_pct / 100 if operating else 0.0
        interest = long_interest + working_interest
        principal = long_loan / a.loan_years if 1 <= operation_year <= a.loan_years else 0.0
        long_balance = max(0.0, long_balance - principal)
        if operation_year == a.loan_years:
            long_balance = 0.0

        depreciation = annual_depreciation if 1 <= operation_year <= a.depreciation_years else 0.0
        fixed_depreciation += depreciation
        maintenance = maintenance_base * a.maintenance_pct[index] / 100 if operating else 0.0
        payroll = annual_payroll if operating else 0.0
        insurance = maintenance_base * a.insurance_pct / 100 if operating else 0.0
        materials = capacity_mw * a.materials_cny_per_kw / 10 if operating else 0.0
        other_cost = operating_rent[index] if operating else construction_opex
        opex = maintenance + payroll + insurance + materials + other_cost
        total_cost = opex + depreciation + interest
        taxable_subsidy = a.taxable_subsidy_wan[index] if operating else 0.0
        exempt_subsidy = a.tax_exempt_subsidy_wan[index] if operating else 0.0
        subsidy_inflow = exempt_subsidy + (0.0 if workbook_compatibility else taxable_subsidy)
        profit = revenue - surcharge - total_cost + taxable_subsidy
        # WTG1 row 17 looks at the profit from exactly five calculation years earlier.
        prior_loss = max(0.0, -annual[-5]["pre_tax_profit_wan"]) if operation_year >= 5 else 0.0
        loss_offset = min(max(0.0, profit), prior_loss)
        income_tax = (max(0.0, profit) - loss_offset) * a.actual_income_tax_pct[index] / 100 if operating else 0.0
        net_profit = profit - income_tax + exempt_subsidy
        ebit = profit + interest
        ebitda = ebit + depreciation
        adjusted_tax = ebit * a.adjusted_income_tax_pct[index] / 100 if operating else 0.0
        dividend = total_equity * a.dividend_pct_of_equity / 100 if operating else 0.0
        statutory_reserve = net_profit * a.statutory_reserve_pct / 100
        discretionary_reserve = net_profit * a.discretionary_reserve_pct / 100
        accumulated_reserve += statutory_reserve + (0.0 if workbook_compatibility else discretionary_reserve)
        retained_profit += net_profit - statutory_reserve - discretionary_reserve - dividend

        equity_in = construction_equity if not operating else working_equity if operation_year == 1 else 0.0
        capex_out = construction_spend if not operating else 0.0
        working_capital_out = working_capital if operation_year == 1 else 0.0
        period_recovery = residual + working_capital if terminal else 0.0
        project_inflow = revenue + subsidy_inflow + vat_offset + period_recovery
        operating_outflow = opex + surcharge
        project_pre_tax = project_inflow - operating_outflow - capex_out - working_capital_out
        equity_cash = project_inflow - equity_in - principal - interest - operating_outflow - income_tax

        loan_draw = long_loan - construction_interest if not operating else working_loan if operation_year == 1 else 0.0
        planning_cash = gross_revenue - operating_outflow - vat_due - income_tax + subsidy_inflow
        planning_cash += equity_in + loan_draw - principal - interest - dividend - capex_out - working_capital_out
        accumulated_cash += planning_cash
        liabilities = long_balance + (working_loan if operating else 0.0)
        asset_total = accumulated_cash + (
            working_capital + fixed_asset_base - fixed_depreciation + vat_credit
            if operating else dynamic_capex
        )
        balance_gap = asset_total - liabilities - (
            (total_equity if operating else construction_equity) + accumulated_reserve + retained_profit
        )
        annual.append({
            "calculation_year": operation_year + 1,
            "operation_year": operation_year,
            "gross_revenue_wan": gross_revenue,
            "net_revenue_wan": revenue,
            "output_vat_wan": output_vat,
            "vat_offset_wan": vat_offset,
            "vat_due_wan": vat_due,
            "vat_credit_remaining_wan": vat_credit,
            "vat_surcharge_wan": surcharge,
            "depreciation_wan": depreciation,
            "maintenance_wan": maintenance,
            "payroll_wan": payroll,
            "insurance_wan": insurance,
            "materials_wan": materials,
            "other_cost_wan": other_cost,
            "total_cost_wan": total_cost,
            "operating_cost_wan": opex,
            "long_term_interest_wan": long_interest,
            "working_capital_interest_wan": working_interest,
            "debt_principal_repaid_wan": principal,
            "long_debt_ending_wan": long_balance,
            "working_capital_debt_ending_wan": working_loan if operating else 0.0,
            "pre_tax_profit_wan": profit,
            "loss_offset_wan": loss_offset,
            "actual_income_tax_wan": income_tax,
            "adjusted_income_tax_wan": adjusted_tax,
            "net_profit_wan": net_profit,
            "ebit_wan": ebit,
            "ebitda_wan": ebitda,
            "dividend_wan": dividend,
            "construction_capex_wan": capex_out,
            "working_capital_invested_wan": working_capital_out,
            "equity_invested_wan": equity_in,
            "terminal_recovery_wan": period_recovery,
            "project_pre_tax_cash_flow_wan": project_pre_tax,
            "project_post_tax_cash_flow_wan": project_pre_tax - adjusted_tax,
            "equity_cash_flow_wan": equity_cash,
            "financial_plan_cash_flow_wan": planning_cash,
            "financial_plan_accumulated_cash_wan": accumulated_cash,
            "assets_wan": asset_total,
            "liabilities_wan": liabilities,
            "balance_sheet_gap_wan": balance_gap,
            "debt_asset_pct": _ratio(liabilities * 100, asset_total),
            "interest_coverage": _ratio(ebit, interest),
            "debt_service_coverage": _ratio(ebitda - income_tax, principal + interest),
        })

    def series(field):
        return [row[field] for row in annual]

    energy_total = sum(grid_sales)
    average_energy = energy_total / OPERATING_YEARS
    gross_total = sum(series("gross_revenue_wan"))
    net_total = sum(series("net_revenue_wan"))
    ebit_total = sum(series("ebit_wan"))
    profit_total = sum(series("net_profit_wan"))
    surcharge_total = sum(series("vat_surcharge_wan"))
    total_cost = sum(series("total_cost_wan"))
    materials_total = sum(series("materials_wan"))
    pre_tax = series("project_pre_tax_cash_flow_wan")
    post_tax = series("project_post_tax_cash_flow_wan")
    equity = series("equity_cash_flow_wan")
    breakeven_mwh = None
    if average_energy:
        unit_cost_and_tax = (materials_total + surcharge_total) * 10 / 25 / average_energy
        breakeven_mwh = _ratio((total_cost - materials_total) * 10 / 25,
                              net_tariff - unit_cost_and_tax)
    tax_shield_rate = 0.25  # 收入和税金!B30, independent of the actual tax schedule
    lcoe_cost = dynamic_capex - static_capex * a.residual_pct / 100 / 1.08**25
    lcoe_cost += _npv(0.08, [
        row["maintenance_wan"] * (1 - tax_shield_rate) - row["depreciation_wan"] * tax_shield_rate
        for row in annual[1:]
    ])
    lcoe = _ratio(lcoe_cost * 10, _npv(0.08, grid_sales))
    coverage = [row for row in annual[1:16]]

    def average_coverage(field):
        values = [row[field] for row in coverage]
        return sum(values) / len(values) if all(value is not None for value in values) else None

    return {
        "inputs": {
            "annual_grid_energy_mwh": grid_sales,
            "financial_assumptions": asdict(a),
        },
        "metrics": {
            "total_investment_wan": total_investment,
            "construction_interest_wan": construction_interest,
            "working_capital_wan": working_capital,
            "net_revenue_total_wan": net_total,
            "total_cost_wan": total_cost,
            "vat_surcharge_total_wan": surcharge_total,
            "pre_tax_profit_total_wan": sum(series("pre_tax_profit_wan")),
            "net_tariff_cny_per_kwh": net_tariff,
            "average_gross_tariff_cny_per_kwh": _ratio(gross_total * 10, energy_total),
            "project_pre_tax_payback_years": _payback_years(pre_tax),
            "project_post_tax_payback_years": _payback_years(post_tax),
            "project_pre_tax_irr_pct": _irr_pct(pre_tax),
            "project_post_tax_irr_pct": _irr_pct(post_tax),
            "project_pre_tax_npv_wan": _npv(a.project_pre_tax_discount_pct / 100, pre_tax),
            "project_post_tax_npv_wan": _npv(a.project_post_tax_discount_pct / 100, post_tax),
            "equity_irr_pct": _irr_pct(equity),
            "equity_npv_wan": _npv(a.equity_discount_pct / 100, equity),
            "roi_pct": ebit_total / OPERATING_YEARS / total_investment * 100,
            "investment_profit_and_tax_pct": (
                profit_total + surcharge_total + sum(series("actual_income_tax_wan"))
                - sum(a.tax_exempt_subsidy_wan)
            ) / OPERATING_YEARS / total_investment * 100,
            "roe_pct": _ratio(profit_total / OPERATING_YEARS * 100, total_equity),
            "peak_debt_asset_pct": max(
                value for value in series("debt_asset_pct") if value is not None
            ),
            "breakeven_utilization_pct": breakeven_mwh / average_energy * 100 if breakeven_mwh is not None else None,
            "breakeven_energy_mwh": breakeven_mwh,
            "static_capex_wan": static_capex,
            "dynamic_capex_wan": dynamic_capex,
            "construction_loan_wan": long_loan,
            "working_capital_loan_wan": working_loan,
            "total_equity_wan": total_equity,
            "legacy_lcoe_cny_per_kwh": lcoe,
            "legacy_adjusted_lcoe_cny_per_kwh": lcoe * (1 + 0.13 * 0.50) / (1 - tax_shield_rate) if lcoe is not None else None,
            "legacy_average_interest_coverage": average_coverage("interest_coverage"),
            "legacy_average_debt_service_coverage": average_coverage("debt_service_coverage"),
        },
        "annual": annual,
        "checks": {
            "funding_gap_wan": total_investment - total_equity - long_loan - working_loan,
            "max_abs_balance_sheet_gap_wan": max(abs(value) for value in series("balance_sheet_gap_wan")),
            "terminal_working_capital_debt_wan": annual[-1]["working_capital_debt_ending_wan"],
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("assumptions", type=Path)
    parser.add_argument("--summary", action="store_true", help="Print metrics and checks only")
    args = parser.parse_args()
    try:
        source = json.loads(args.assumptions.read_text(encoding="utf-8"))
        result = calculate(
            Assumptions(**source["financial_assumptions"]),
            annual_grid_energy_mwh=source["annual_grid_energy_mwh"],
        )
        if args.summary:
            result = {key: result[key] for key in ("model_version", "metrics", "checks")}
        payload = json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2)
    except (OSError, KeyError, TypeError, ValueError, ArithmeticError) as error:
        parser.error(str(error))
    print(payload)


if __name__ == "__main__":
    main()
