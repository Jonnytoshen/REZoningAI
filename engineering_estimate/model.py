"""陆上风电工程概算和造价对标的参数化模型。"""

import argparse
import json
from decimal import Context, Decimal, InvalidOperation, localcontext
from pathlib import Path


MODEL_VERSION = "wind-engineering-estimate-0.1.0"
ZERO = Decimal(0)
REPORTED_TOLERANCE = Decimal("0.01")
CALCULATION_PRECISION = 28
CONSTRUCTION_CATEGORIES = (
    "construction_support",
    "equipment_and_installation",
    "civil_works",
    "other_costs",
)
STATIC_CATEGORIES = (*CONSTRUCTION_CATEGORIES, "basic_contingency")
COVERAGE_ITEMS = (
    "permanent_land",
    "temporary_land",
    "construction_land_rent",
    "development_and_construction_management",
    "local_support",
    "grid_export",
    "storage",
)
COVERAGE_STATES = ("included", "excluded", "unknown")
TAX_BASES = ("tax_inclusive", "tax_exclusive", "unconfirmed")


def _object(value, field):
    if not isinstance(value, dict):
        raise ValueError(f"{field} 必须是 JSON 对象")
    return value


def _list(value, field):
    if not isinstance(value, list):
        raise ValueError(f"{field} 必须是数组")
    return value


def _text(data, field):
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} 必须填写")
    return value.strip()


def _number(value, field, *, signed=False):
    if type(value) not in (str, int, float, Decimal):
        raise ValueError(f"{field} 必须填写数值")
    try:
        number = Decimal(str(value))
    except InvalidOperation as error:
        raise ValueError(f"{field} 必须填写有效数值") from error
    if not number.is_finite() or (not signed and number < 0):
        raise ValueError(f"{field} 需要有效{'有符号' if signed else '非负'}数值")
    return number


def _optional_amount(data, field):
    value = data.get(field)
    return None if value is None else _number(value, field)


def _positive(value, field):
    number = _number(value, field)
    if number == 0:
        raise ValueError(f"{field} 必须大于零")
    return number


def _tax_basis(data):
    basis = data.get("tax_basis")
    if basis not in TAX_BASES:
        raise ValueError(f"tax_basis 需要选择 {', '.join(TAX_BASES)}")
    return basis


def _unit_cost(amount_wan, capacity_mw):
    return amount_wan * 10 / capacity_mw


def _cost_lines(data):
    items = []
    seen = set()
    for index, raw_line in enumerate(_list(data.get("line_items"), "line_items"), 1):
        item = _object(raw_line, f"line_items 第 {index} 项")
        item_id = _text(item, "id")
        if item_id in seen:
            raise ValueError(f"重复的费用 ID: {item_id}")
        seen.add(item_id)
        category = item.get("category")
        if category not in STATIC_CATEGORIES:
            raise ValueError(f"{item_id} 的费用类别无效: {category}")
        line = {
            "id": item_id,
            "name": _text(item, "name"),
            "category": category,
            "source": _text(item, "source"),
        }
        if "amount_wan" in item:
            if {"quantity", "unit", "unit_price_cny"} & item.keys():
                raise ValueError(f"{item_id} 同时提供了合价和工程量计价")
            amount = _number(item["amount_wan"], f"{item_id}.amount_wan")
        else:
            quantity = _number(item.get("quantity"), f"{item_id}.quantity")
            unit_price = _number(item.get("unit_price_cny"), f"{item_id}.unit_price_cny")
            line.update(quantity=quantity, unit=_text(item, "unit"), unit_price_cny=unit_price)
            amount = quantity * unit_price / 10_000
        line["amount_wan"] = amount
        items.append(line)
    return items


def calculate_benchmark(capacity_mw, data):
    """按给定的基准线和适用模块计算造价对标，单位为元/kW。"""
    with localcontext(Context(prec=CALCULATION_PRECISION)):
        return _calculate_benchmark(capacity_mw, data)


def _calculate_benchmark(capacity_mw, data):
    mw = _positive(capacity_mw, "capacity_mw")
    data = _object(data, "benchmark")
    basis = data.get("investment_basis")
    if basis not in ("static", "dynamic"):
        raise ValueError("investment_basis 需要选择 static 或 dynamic")
    source = _text(data, "source")
    scenario = _text(data, "scenario")
    tax_basis = _tax_basis(data)
    interpolation_source = None
    if ("base_unit_cost_cny_per_kw" in data) == ("base_points" in data):
        raise ValueError("benchmark 需要提供一种基准输入：基准值或基准容量表")
    if "base_unit_cost_cny_per_kw" in data:
        base = _positive(data["base_unit_cost_cny_per_kw"], "base_unit_cost_cny_per_kw")
        reference_capacities = []
    else:
        points = {}
        for raw_point in _list(data["base_points"], "base_points"):
            point = _object(raw_point, "base_points 项")
            ref_mw = _positive(point.get("capacity_mw"), "base_points.capacity_mw")
            if ref_mw in points:
                raise ValueError(f"重复的基准容量: {ref_mw} MW")
            points[ref_mw] = _positive(point.get("unit_cost_cny_per_kw"), "base_points.unit_cost_cny_per_kw")
        if mw in points:
            base = points[mw]
            reference_capacities = [mw]
        else:
            if data.get("interpolate") is not True:
                raise ValueError(f"无 {mw} MW 基准值，需要确认版本允许插值并显式启用")
            lower = max((point for point in points if point < mw), default=None)
            upper = min((point for point in points if point > mw), default=None)
            if lower is None or upper is None:
                raise ValueError(f"{mw} MW 超出给定基准容量包络")
            interpolation_source = _text(data, "interpolation_source")
            base = points[lower] + (points[upper] - points[lower]) * (mw - lower) / (upper - lower)
            reference_capacities = [lower, upper]

    adjustments = []
    seen = set()
    for raw_module in _list(data.get("adjustments", []), "adjustments"):
        module = _object(raw_module, "adjustments 项")
        module_id = _text(module, "id")
        if module_id in seen:
            raise ValueError(f"重复的调整模块: {module_id}")
        seen.add(module_id)
        adjustments.append({
            "id": module_id,
            "name": _text(module, "name"),
            "source": _text(module, "source"),
            "delta_cny_per_kw": _number(module.get("delta_cny_per_kw"), "delta_cny_per_kw", signed=True),
        })

    adjusted = base + sum((row["delta_cny_per_kw"] for row in adjustments), ZERO)
    if adjusted <= 0:
        raise ValueError("基准值加调整值后的单位造价必须大于零")
    return {
        "model_version": MODEL_VERSION,
        "source": source,
        "scenario": scenario,
        "capacity_mw": mw,
        "tax_basis": tax_basis,
        "investment_basis": basis,
        "base_reference_capacities_mw": reference_capacities,
        "interpolation_source": interpolation_source,
        "base_unit_cost_cny_per_kw": base,
        "adjustments": adjustments,
        "adjusted_unit_cost_cny_per_kw": adjusted,
        "benchmark_investment_wan": adjusted * mw / 10,
    }


def calculate_estimate(data):
    """按项目工程量或概算分项计算投资并核对交接数据。"""
    with localcontext(Context(prec=CALCULATION_PRECISION)):
        return _calculate_estimate(data)


def _calculate_estimate(data):
    data = _object(data, "工程概算输入")
    project = _text(data, "project")
    source = _text(data, "source")
    mw = _positive(data.get("capacity_mw"), "capacity_mw")
    tax_basis = _tax_basis(data)
    items = _cost_lines(data)
    subtotals = dict.fromkeys(STATIC_CATEGORIES, ZERO)
    for item in items:
        subtotals[item["category"]] += item["amount_wan"]

    present = {item["category"] for item in items}
    missing = set(CONSTRUCTION_CATEGORIES) - present
    if missing:
        raise ValueError(f"缺少静态投资分项: {', '.join(sorted(missing))}")
    contingency_basis = sum((subtotals[name] for name in CONSTRUCTION_CATEGORIES), ZERO)
    reserve = data.get("basic_contingency")
    contingency_calculation = None
    if reserve is None:
        if "basic_contingency" not in present:
            raise ValueError("需要提供基本预备费金额或有依据的费率")
    else:
        if "basic_contingency" in present:
            raise ValueError("基本预备费金额与费率重复")
        reserve = _object(reserve, "basic_contingency")
        rate = _number(reserve.get("rate_pct"), "basic_contingency.rate_pct")
        contingency_calculation = {
            "basis_wan": contingency_basis,
            "rate_pct": rate,
            "source": _text(reserve, "source"),
        }
        subtotals["basic_contingency"] = contingency_basis * rate / 100

    static = _positive(sum(subtotals.values()), "工程静态投资")
    escalation = _optional_amount(data, "price_contingency_wan")
    interest = _optional_amount(data, "construction_interest_wan")
    dynamic = static + escalation + interest if escalation is not None and interest is not None else None
    reported = _object(data.get("reported", {}), "reported")
    totals_to_check = {
        "static_investment_wan": static,
        "static_unit_cost_cny_per_kw": _unit_cost(static, mw),
        "dynamic_investment_wan": dynamic,
        "dynamic_unit_cost_cny_per_kw": None if dynamic is None else _unit_cost(dynamic, mw),
    }
    unexpected = reported.keys() - totals_to_check.keys()
    if unexpected:
        raise ValueError(f"未知报告核对字段: {', '.join(sorted(unexpected))}")

    checks = {}
    issues = []
    for name, calculated in totals_to_check.items():
        given = _optional_amount(reported, name)
        if given is None:
            continue
        difference = None if calculated is None else calculated - given
        matches = None if difference is None else abs(difference) <= REPORTED_TOLERANCE
        checks[name] = {
            "reported": given,
            "calculated": calculated,
            "difference": difference,
            "matches": matches,
        }
        if matches is not True:
            issues.append(f"{name}: {'缺少动态投资分项' if matches is None else '报告值和分项计算不一致'}")

    raw_coverage = _object(data.get("coverage", {}), "coverage")
    unexpected = raw_coverage.keys() - set(COVERAGE_ITEMS)
    if unexpected:
        raise ValueError(f"未知费用范围字段: {', '.join(sorted(unexpected))}")
    coverage = {name: raw_coverage.get(name, "unknown") for name in COVERAGE_ITEMS}
    for name, state in coverage.items():
        if state not in COVERAGE_STATES:
            raise ValueError(f"coverage.{name} 需要选择 {', '.join(COVERAGE_STATES)}")
    unknown = [name for name, state in coverage.items() if state == "unknown"]
    if unknown:
        issues.append(f"费用是否已含尚待确认: {', '.join(unknown)}")
    if tax_basis == "unconfirmed":
        issues.append("概算含税口径尚待确认")

    if not {"static_investment_wan", "static_unit_cost_cny_per_kw"}.intersection(checks):
        issues.append("未提供可对照的静态投资总额或单位静态造价")

    annual = data.get("annual_static_capex_wan")
    if annual is not None:
        annual = [_number(value, "annual_static_capex_wan") for value in _list(annual, "annual_static_capex_wan")]
        if not annual:
            raise ValueError("annual_static_capex_wan 需要至少一个建设年度")
        if abs(sum(annual) - static) > REPORTED_TOLERANCE:
            issues.append("分年度建设投资合计与静态投资不一致")

    return {
        "model_version": MODEL_VERSION,
        "project": project,
        "source": source,
        "capacity_mw": mw,
        "tax_basis": tax_basis,
        "line_items": items,
        "static_subtotals_wan": subtotals,
        "basic_contingency_calculation": contingency_calculation,
        "static_investment_wan": static,
        "static_unit_cost_cny_per_kw": totals_to_check["static_unit_cost_cny_per_kw"],
        "price_contingency_wan": escalation,
        "construction_interest_wan": interest,
        "dynamic_investment_wan": dynamic,
        "dynamic_unit_cost_cny_per_kw": totals_to_check["dynamic_unit_cost_cny_per_kw"],
        "reported_checks": checks,
        "finance_handoff": {
            "status": "requires_review" if issues else "reconciled",
            "issues": issues,
            "capacity_mw": mw,
            "source": source,
            "tax_basis": tax_basis,
            "coverage": coverage,
            "annual_static_capex_wan": annual,
            "static_investment_wan": static,
            "static_capex_cny_per_w": static / mw / 100,
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="概算 JSON，或提供 capacity_mw 和 benchmark 的对标 JSON")
    parser.add_argument("--benchmark", action="store_true", help="按外部提供的基准表和模块进行造价对标")
    args = parser.parse_args()
    try:
        data = json.loads(args.input.read_text(encoding="utf-8"), parse_float=Decimal)
        if args.benchmark:
            data = _object(data, "对标输入")
            result = calculate_benchmark(data.get("capacity_mw"), data.get("benchmark"))
        else:
            result = calculate_estimate(data)
        print(json.dumps(result, ensure_ascii=False, default=str, indent=2))
    except (OSError, ValueError, ArithmeticError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
