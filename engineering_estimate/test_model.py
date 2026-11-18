import json
import unittest
from decimal import Decimal, localcontext
from pathlib import Path

from engineering_estimate.model import COVERAGE_ITEMS, calculate_benchmark, calculate_estimate


SAMPLES = Path(__file__).parent


class EngineeringEstimateTest(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((SAMPLES / "rongxian-example.json").read_text(encoding="utf-8"))

    def test_rongxian_flags_static_and_dynamic_inconsistencies(self):
        result = calculate_estimate(self.data)
        self.assertEqual(result["static_investment_wan"], Decimal("24745"))
        self.assertEqual(result["static_unit_cost_cny_per_kw"], Decimal("4949"))
        self.assertEqual(result["dynamic_investment_wan"], Decimal("25109.21"))
        checks = result["reported_checks"]
        self.assertEqual(checks["static_investment_wan"]["difference"], Decimal("1981.65"))
        self.assertFalse(checks["static_unit_cost_cny_per_kw"]["matches"])
        self.assertEqual(checks["dynamic_investment_wan"]["difference"], Decimal("1981.65"))
        self.assertEqual(result["finance_handoff"]["status"], "requires_review")

    def test_quantity_price_and_explicit_reserve_rate(self):
        self.data["line_items"].pop()
        land = self.data["line_items"][-1]
        del land["amount_wan"]
        land.update(
            name="示例建设用地费", quantity="11", unit="亩",
            unit_price_cny="40000", source="测试假设",
        )
        self.data["basic_contingency"] = {"rate_pct": "3", "source": "测试假设"}
        result = calculate_estimate(self.data)
        self.assertEqual(result["static_subtotals_wan"]["other_costs"], Decimal("44"))
        self.assertEqual(result["basic_contingency_calculation"]["basis_wan"], Decimal("20819"))
        self.assertEqual(result["static_subtotals_wan"]["basic_contingency"], Decimal("624.57"))
        self.assertEqual(result["static_investment_wan"], Decimal("21443.57"))

    def test_contingency_and_lines_cannot_be_double_counted(self):
        self.data["basic_contingency"] = {"rate_pct": "3", "source": "测试假设"}
        with self.assertRaisesRegex(ValueError, "金额与费率重复"):
            calculate_estimate(self.data)
        del self.data["basic_contingency"]
        self.data["line_items"].append(self.data["line_items"][0])
        with self.assertRaisesRegex(ValueError, "重复的费用 ID"):
            calculate_estimate(self.data)

    def test_unknown_escalation_is_distinct_from_zero(self):
        self.data.pop("price_contingency_wan")
        result = calculate_estimate(self.data)
        self.assertIsNone(result["dynamic_investment_wan"])
        self.assertIsNone(result["reported_checks"]["dynamic_investment_wan"]["matches"])

    def test_missing_static_reference_is_reported(self):
        self.data.update(tax_basis="tax_inclusive", coverage=dict.fromkeys(COVERAGE_ITEMS, "included"))
        del self.data["reported"]
        result = calculate_estimate(self.data)["finance_handoff"]
        self.assertEqual(result["status"], "requires_review")
        self.assertIn("未提供可对照的静态投资总额或单位静态造价", result["issues"])

    def test_unknown_reported_key_is_rejected(self):
        self.data["reported"]["dynamic_unit_cost_cny_per_kW"] = 4625.51
        with self.assertRaisesRegex(ValueError, "dynamic_unit_cost_cny_per_kW"):
            calculate_estimate(self.data)

    def test_caller_decimal_context_does_not_change_results(self):
        reference = calculate_estimate(self.data)
        with localcontext() as context:
            context.prec = 3
            self.assertEqual(calculate_estimate(self.data), reference)

    def test_handoff_checks_annual_totals_and_records_coverage(self):
        self.data.update(
            tax_basis="tax_inclusive",
            coverage=dict.fromkeys(COVERAGE_ITEMS, "included"),
            reported={"static_investment_wan": 24745},
            annual_static_capex_wan=[24000, 745],
        )
        result = calculate_estimate(self.data)["finance_handoff"]
        self.assertEqual(result["status"], "reconciled")
        self.assertEqual(result["static_capex_cny_per_w"], Decimal("4.949"))
        self.assertEqual(result["coverage"]["permanent_land"], "included")
        self.data["annual_static_capex_wan"] = [24000, 700]
        result = calculate_estimate(self.data)["finance_handoff"]
        self.assertEqual(result["status"], "requires_review")

    def test_invalid_amounts_and_incomplete_categories(self):
        self.data["line_items"][0]["amount_wan"] = "未提供"
        with self.assertRaisesRegex(ValueError, "temporary-works.amount_wan"):
            calculate_estimate(self.data)
        self.data["line_items"].pop(0)
        with self.assertRaisesRegex(ValueError, "construction_support"):
            calculate_estimate(self.data)


class BenchmarkTest(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((SAMPLES / "benchmark-example.json").read_text(encoding="utf-8"))["benchmark"]

    def test_base_value_plus_signed_adjustments(self):
        result = calculate_benchmark(50, self.data)
        self.assertEqual(result["adjusted_unit_cost_cny_per_kw"], Decimal("4450"))
        self.assertEqual(result["benchmark_investment_wan"], Decimal("22250"))

    def test_exact_reference_value_and_explicit_interpolation(self):
        del self.data["base_unit_cost_cny_per_kw"]
        self.data["base_points"] = [
            {"capacity_mw": 100, "unit_cost_cny_per_kw": 4000},
            {"capacity_mw": 50, "unit_cost_cny_per_kw": 4400},
        ]
        self.assertEqual(calculate_benchmark(50, self.data)["base_unit_cost_cny_per_kw"], Decimal("4400"))
        with self.assertRaisesRegex(ValueError, "显式启用"):
            calculate_benchmark(75, self.data)
        self.data["interpolate"] = True
        with self.assertRaisesRegex(ValueError, "interpolation_source"):
            calculate_benchmark(75, self.data)
        self.data["interpolation_source"] = "测试假设"
        fitted = calculate_benchmark(75, self.data)
        self.assertEqual(fitted["base_reference_capacities_mw"], [Decimal(50), Decimal(100)])
        self.assertEqual(fitted["base_unit_cost_cny_per_kw"], Decimal("4200"))
        with self.assertRaisesRegex(ValueError, "超出给定基准容量"):
            calculate_benchmark(150, self.data)

    def test_duplicate_adjustment_id_is_rejected(self):
        self.data["adjustments"].append(self.data["adjustments"][0])
        with self.assertRaisesRegex(ValueError, "重复的调整模块"):
            calculate_benchmark(50, self.data)


if __name__ == "__main__":
    unittest.main()
