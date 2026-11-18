import json
import subprocess
import sys
import unittest
from pathlib import Path

from finance.project_finance import calculate_project_finance
from finance.wtg1 import Assumptions, calculate


ROOT = Path(__file__).resolve().parent.parent
ENGINEERING_EXAMPLE = ROOT / "engineering_estimate" / "finance-integration-example.json"
FINANCE_EXAMPLE = ROOT / "finance" / "project-finance-example.json"
RONGXIAN_EXAMPLE = ROOT / "engineering_estimate" / "rongxian-example.json"


def example(path):
    return json.loads(path.read_text(encoding="utf-8"))


class ProjectFinanceTest(unittest.TestCase):
    def setUp(self):
        self.estimate = example(ENGINEERING_EXAMPLE)
        self.request = example(FINANCE_EXAMPLE)

    def test_estimate_drives_capex_funding_depreciation_and_vat(self):
        result = calculate_project_finance(self.estimate, self.request)
        finance = result["finance"]
        metrics = finance["metrics"]
        self.assertEqual(result["engineering_estimate"]["finance_handoff"]["status"], "reconciled")
        self.assertEqual(metrics["static_capex_wan"], 24000)
        self.assertEqual(metrics["price_contingency_wan"], 100)
        self.assertEqual(metrics["construction_spend_wan"], 24100)
        self.assertAlmostEqual(metrics["construction_interest_wan"], 385.6)
        self.assertAlmostEqual(metrics["dynamic_capex_wan"], 24485.6)
        self.assertAlmostEqual(metrics["total_investment_wan"], 24635.6)
        self.assertAlmostEqual(metrics["construction_loan_wan"], 19588.48)
        comparison = result["construction_interest_comparison"]
        self.assertEqual(comparison["engineering_reference_wan"], 500)
        self.assertAlmostEqual(comparison["finance_minus_reference_wan"], -114.4)
        construction, first_operation = finance["annual"][:2]
        self.assertAlmostEqual(construction["project_pre_tax_cash_flow_wan"], -24100)
        self.assertEqual(construction["vat_credit_remaining_wan"], 2000)
        self.assertAlmostEqual(first_operation["depreciation_wan"], (24485.6 - 2000) * 0.95 / 20)
        self.assertAlmostEqual(finance["checks"]["funding_gap_wan"], 0)
        self.assertLess(finance["checks"]["max_abs_balance_sheet_gap_wan"], 1e-7)

    def test_construction_rent_stays_in_capex_and_operating_rent_follows_schedule(self):
        self.request["operating_land_rent_wan"][0] = 0  # Prepaid in the estimate scope.
        self.request["operating_land_rent_wan"][2] = 1.5
        annual = calculate_project_finance(self.estimate, self.request)["finance"]["annual"]
        self.assertEqual([row["other_cost_wan"] for row in annual[:4]], [0, 0, 1.2, 1.5])
        self.assertEqual(annual[0]["construction_capex_wan"], 24100)

    def test_inconsistent_rongxian_estimate_flags_actual_difference(self):
        with self.assertRaisesRegex(ValueError, r"工程概算待核对.*1981\.65"):
            calculate_project_finance(example(RONGXIAN_EXAMPLE), self.request)

    def test_project_scope_tax_basis_and_schedule_are_checked(self):
        self.request["project"] = "另一项目"
        with self.assertRaisesRegex(ValueError, "project 须与工程概算项目一致"):
            calculate_project_finance(self.estimate, self.request)
        self.request["project"] = self.estimate["project"]
        self.estimate["tax_basis"] = "tax_exclusive"
        with self.assertRaisesRegex(ValueError, "需要含税"):
            calculate_project_finance(self.estimate, self.request)
        self.estimate["tax_basis"] = "tax_inclusive"
        self.estimate["annual_static_capex_wan"] = [10000, 14000]
        with self.assertRaisesRegex(ValueError, "只支持一个建设年度"):
            calculate_project_finance(self.estimate, self.request)

    def test_unknown_price_contingency_or_bad_vat_cannot_produce_returns(self):
        self.estimate["reported"].pop("dynamic_investment_wan")
        del self.estimate["price_contingency_wan"]
        with self.assertRaisesRegex(ValueError, "须明确 price_contingency_wan"):
            calculate_project_finance(self.estimate, self.request)
        self.estimate["price_contingency_wan"] = 0
        del self.request["construction_input_vat_wan"]
        with self.assertRaisesRegex(ValueError, "须明确 construction_input_vat_wan"):
            calculate_project_finance(self.estimate, self.request)
        self.request["construction_input_vat_wan"] = 24001
        with self.assertRaisesRegex(ValueError, "可抵扣建设期进项税不得超过"):
            calculate_project_finance(self.estimate, self.request)

    def test_upstream_owned_assumptions_cannot_be_supplied_by_finance(self):
        self.request["financial_assumptions"]["static_capex_cny_per_w"] = 4.55
        with self.assertRaisesRegex(TypeError, "static_capex_cny_per_w"):
            calculate_project_finance(self.estimate, self.request)

    def test_bad_annual_land_rent_is_rejected(self):
        self.request["operating_land_rent_wan"] = [1.2]
        with self.assertRaisesRegex(ValueError, "operating_land_rent_wan"):
            calculate_project_finance(self.estimate, self.request)

    def test_subsidy_cash_and_retained_reserves_reconcile(self):
        no_subsidy = calculate_project_finance(self.estimate, self.request)["finance"]
        self.request["financial_assumptions"]["taxable_subsidy_wan"][0] = 100
        self.request["financial_assumptions"]["discretionary_reserve_pct"] = 5
        result = calculate_project_finance(self.estimate, self.request)["finance"]
        for key in ("project_pre_tax_cash_flow_wan", "equity_cash_flow_wan", "financial_plan_cash_flow_wan"):
            self.assertAlmostEqual(result["annual"][1][key] - no_subsidy["annual"][1][key], 100)
        self.assertLess(result["checks"]["max_abs_balance_sheet_gap_wan"], 1e-7)

    def test_example_cli_and_legacy_base(self):
        completed = subprocess.run(
            [sys.executable, "-m", "finance.project_finance", str(ENGINEERING_EXAMPLE), str(FINANCE_EXAMPLE),
             "--summary"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
        result = json.loads(completed.stdout)
        self.assertAlmostEqual(result["finance"]["metrics"]["project_post_tax_irr_pct"], 9.9680490879)
        old = example(ROOT / "finance" / "wtg1-base.json")
        self.assertEqual(
            Assumptions(*old["financial_assumptions"].values()),
            Assumptions(**old["financial_assumptions"]),
        )
        finance = calculate(
            Assumptions(**old["financial_assumptions"]),
            annual_grid_energy_mwh=old["annual_grid_energy_mwh"],
        )
        self.assertAlmostEqual(finance["metrics"]["project_post_tax_irr_pct"], 10.9079606611)
        self.assertAlmostEqual(finance["annual"][0]["other_cost_wan"], 172.55996)


if __name__ == "__main__":
    unittest.main()
