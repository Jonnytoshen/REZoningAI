"""从工程概算和独立经营输入计算陆上风电项目财务。"""

import argparse
import json
from decimal import Decimal
from pathlib import Path

from engineering_estimate.model import calculate_estimate
from finance.wtg1 import FinancialAssumptions, ProjectInvestment, calculate_from_investment


def calculate_project_finance(engineering_input: dict, finance_input: dict) -> dict:
    """Run the engineering estimate and use its reconciled construction investment."""
    estimate = calculate_estimate(engineering_input)
    handoff = estimate["finance_handoff"]
    if handoff["status"] != "reconciled":
        reasons = list(handoff["issues"])
        reasons.extend(
            f"{metric} 差额 {check['difference']}"
            for metric, check in estimate["reported_checks"].items()
            if check["matches"] is False
        )
        raise ValueError(f"工程概算待核对（{estimate['project']}）。{'；'.join(reasons)}")

    if not isinstance(finance_input, dict):
        raise ValueError("财务输入须为 JSON 对象")
    project = finance_input.get("project")
    if not isinstance(project, str) or project.strip() != estimate["project"]:
        raise ValueError(f"财务输入的 project 须与工程概算项目一致（{estimate['project']}）")
    if handoff["tax_basis"] != "tax_inclusive":
        raise ValueError("当前财务模型需要含税工程概算和明确的可抵扣建设期进项税")
    annual_capex = handoff["annual_static_capex_wan"]
    if annual_capex is not None and len(annual_capex) != 1:
        raise ValueError("当前财务模型只支持一个建设年度")
    price_contingency = estimate["price_contingency_wan"]
    if price_contingency is None:
        raise ValueError("工程概算须明确 price_contingency_wan（价差预备费），不计取时填 0")

    if "construction_input_vat_wan" not in finance_input:
        raise ValueError("财务输入须明确 construction_input_vat_wan（可抵扣建设期进项税金额）")
    investment = ProjectInvestment(
        capacity_mw=float(handoff["capacity_mw"]),
        static_capex_wan=float(handoff["static_investment_wan"]),
        price_contingency_wan=float(price_contingency),
        construction_input_vat_wan=finance_input["construction_input_vat_wan"],
    )
    finance = calculate_from_investment(
        FinancialAssumptions(**finance_input["financial_assumptions"]),
        investment,
        annual_grid_energy_mwh=finance_input["annual_grid_energy_mwh"],
        operating_land_rent_wan=finance_input["operating_land_rent_wan"],
    )
    engineering_interest = estimate["construction_interest_wan"]
    finance_interest = finance["metrics"]["construction_interest_wan"]
    return {
        "project": estimate["project"],
        "engineering_estimate": estimate,
        "finance": finance,
        "construction_interest_comparison": {
            "engineering_reference_wan": engineering_interest,
            "finance_calculated_wan": finance_interest,
            "finance_minus_reference_wan": (
                float(Decimal(str(finance_interest)) - engineering_interest)
                if engineering_interest is not None else None
            ),
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("engineering_input", type=Path, help="工程概算原始输入 JSON")
    parser.add_argument("finance_input", type=Path, help="同一项目的财务和经营输入 JSON")
    parser.add_argument("--summary", action="store_true", help="显示概算交接、财务指标与核对结果")
    args = parser.parse_args()
    try:
        engineering_input = json.loads(args.engineering_input.read_text(encoding="utf-8"), parse_float=Decimal)
        finance_input = json.loads(args.finance_input.read_text(encoding="utf-8"))
        result = calculate_project_finance(engineering_input, finance_input)
        if args.summary:
            estimate = result["engineering_estimate"]
            result["engineering_estimate"] = {"model_version": estimate["model_version"], **estimate["finance_handoff"]}
            result["finance"] = {
                field: result["finance"][field] for field in ("model_version", "metrics", "checks")
            }
        payload = json.dumps(result, ensure_ascii=False, default=str, allow_nan=False, indent=2)
    except (OSError, KeyError, TypeError, ValueError, ArithmeticError) as error:
        parser.error(str(error))
    print(payload)


if __name__ == "__main__":
    main()
