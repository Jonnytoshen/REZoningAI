# 陆上风电工程概算模型

模型实现了工程概算汇总和国电投造价对标的参数化计算。工程概算使用项目工程量、单价和已确认的费用金额。造价对标使用外部提供的基准值和项目调整模块。适用类型、地区、容量、计价基期和各模块适用性以输入数据来源为准。集团正式基准表和现有报告后台算法尚待核验，相关版本和查核入口见[参考文献与确认清单](参考文献.md)。

## 运行

在项目根目录运行以下命令。模型使用 Python 标准库。

```bash
python3 engineering_estimate/model.py engineering_estimate/rongxian-example.json
python3 engineering_estimate/model.py --benchmark engineering_estimate/benchmark-example.json
python3 -m unittest discover -s engineering_estimate -v
```

Python 调用入口为 `engineering_estimate.model.calculate_estimate(data)` 和 `calculate_benchmark(capacity_mw, data)`。金额计算使用 28 位有效数字的 `Decimal`，CLI 将十进制值写为 JSON 字符串。使用结果做数值计算时，调用方按目标模型的数据类型解析这些字段。

## 工程概算流程

1. 确定项目、容量、概算版本、含税口径和计价范围。各分项沿用同一金额口径。用地补偿、预付租金、送出和储能等是否纳入投资，由概算明细或合同决定。
2. 根据工程量和有来源的综合单价计算分项合价。单位为元/工程量单位时，合价（万元）= 工程量 × 单价 ÷ 10,000。也可直接使用已审核的合价。
3. 按施工辅助工程、设备及安装工程、建筑工程、其他费用归集。基本预备费可采用已列金额，或按前四类合计乘本项目已确认的费率。详细取费及收费基数由相应标准或项目文件提供。 [国家发展改革委风电场工程设计概算编制办法](https://zfxxgk.ndrc.gov.cn/web/iteminfo.jsp?id=19759)
4. 静态投资 = 前四类费用 + 基本预备费。动态投资 = 静态投资 + 价差预备费 + 建设期利息。单位造价（元/kW）= 投资（万元）× 10 ÷ 容量（MW）。价差预备费和建设期利息分别传入，资料明确不计时填零，缺一项时动态投资显示为 `null`。 [国家能源局风电场工程投资估算编制办法](https://www.nea.gov.cn/2015-12/13/c_131051545.htm)
5. 将计算值与报告总额、单位造价及分年投资合计勾稽。输出各分项、差值、费用覆盖情况和财务交接记录。

| 工程概算输入 | 说明 |
| --- | --- |
| `project`、`source`、`capacity_mw`、`tax_basis` | 项目名、来源及版本、容量和含税口径。税口径填 `tax_inclusive`、`tax_exclusive` 或 `unconfirmed`。 |
| `line_items` | 每项包含唯一 `id`、名称 `name`、`category` 和 `source`。金额模式填 `amount_wan`。工程量模式填写 `quantity`、`unit`、`unit_price_cny`。每个前四类都需有一项，可以明确填 0。 |
| `basic_contingency` | 按比例估算时，提供 `rate_pct` 和 `source`，例如费率 3% 填 `3`。采用报告金额时，列入 `line_items` 的 `basic_contingency` 类别。 |
| `price_contingency_wan`、`construction_interest_wan` | 价差预备费、建设期利息。资料未给出时省略或填 `null`。 |
| `reported` | 可对照的原报告静态或动态投资和单位造价。键名使用 `static_investment_wan`、`static_unit_cost_cny_per_kw`、`dynamic_investment_wan`、`dynamic_unit_cost_cny_per_kw`。本模型的比对容差为 0.01 万元及 0.01 元/kW。 |
| `coverage` | 永久征地、临时用地、建设期地租、前期及建设管理、地方支持、送出、储能是否已含。键见代码中的 `COVERAGE_ITEMS`，各项用 `included`、`excluded`、`unknown`。省略的项按未知处理。 |
| `annual_static_capex_wan` | 可选，按建设年度排列的静态投资金额。提供时与静态投资总额核对。 |

费用类别依次为 `construction_support`、`equipment_and_installation`、`civil_works`、`other_costs`、`basic_contingency`。同一笔费用使用同一标识，模型拒绝重复标识。合价、工程量计价和预备费金额或费率的互斥规则用于避免同一金额重复计入。业务上仍需核对同一笔费用有没有以不同名称列入多个分项。

现有服务的 `budget_details` 可作为 `line_items` 的来源。客户端中按名称提取五类建设费用、另取建设期贷款利息，并独立读取接口的静态与动态单位造价。本模型建议把独立的单位造价放入 `reported` 勾稽，由同一概算结果驱动财务和报告。 [自动报告的概算服务](</Users/chao/Documents/Coding/wind-power-auto-report/libs/services/src/lib/cost-estimation.service.ts:23>)

## 造价对标流程

1. 根据正式版本选择匹配项目类型、区域、地形和容量的基准方案。输入 `scenario`、`source`、`tax_basis` 和投资口径 `investment_basis`（`static` 或 `dynamic`）。
2. 录入 `base_unit_cost_cny_per_kw`，或录入同一方案的 `base_points` 容量表。容量表每项包含 `capacity_mw` 与 `unit_cost_cny_per_kw`。优先取精确容量点。所用版本允许区间插值时，方可设置 `interpolate: true` 并填写 `interpolation_source`。模型在相邻点之间线性插值，区间之外需要适用的基准值。
3. 在 `adjustments` 中录入适用的增减项。每项带唯一 `id`、名称 `name`、来源 `source` 和有符号的 `delta_cny_per_kw`。选中的基本方案与调整项采用同一容量和投资口径。
4. 对标单位造价 = 基准值 + 各调整值。相应对标金额（万元）= 对标单位造价（元/kW）× 容量（MW）÷ 10。公开的国电投旗下公司公告验证了“基准值 + 调整值”用于对标。 [电投能源公告 2024075，第 2 页](https://static.cninfo.com.cn/finalpage/2024-10-24/1221489698.PDF)

[对标样例](benchmark-example.json)使用合成参数，50 MW 的基准 4,300 元/kW，加 180、减 30，得到 **4,450 元/kW、22,250 万元**。集团实际参数、表格选型和调整项适用规则需依据原件填写。

## 容县样本与财务交接

[容县样例](rongxian-example.json)采用可研第 12 章的概算分项和汇总值。该章说明暂不计列价差预备费，故样例填 0。基本预备费直接取分项表 366 万元。按该章文字的 3% 乘前四项 24,379 万元将得到 731.37 万元，两者需核对。见[容县武威可研报告第 12 章](</Users/chao/Desktop/容县武威 50MW 风电项目/AutoReport/Result/Xihe_Auto_Report_容县武威 50MW 风电项目_可研报告_报批版.docx>)。

| 指标 | 复算值 | 第 12 章汇总 | 差额 |
| --- | ---: | ---: | ---: |
| 静态投资（万元） | 24,745.00 | 22,763.35 | 1,981.65 |
| 单位静态造价（元/kW） | 4,949.00 | 4,552.67 | 396.33 |
| 动态投资（万元） | 25,109.21 | 23,127.56 | 1,981.65 |

复算动态投资使用第 12 章列出的 364.21 万元建设期利息。可研机型技术经济比较另列 391 万元利息，对应 25,136 万元动态投资，属于另一套对照数据。

`finance_handoff` 返回静态投资、换算后的 `static_capex_cny_per_w`、含税口径、建设投资分期和费用范围。容县样例返回 `requires_review`。状态 `reconciled` 表示已提供静态参考值、提供的对照项一致且口径和范围已填写。接入时，可直接将概算输入及同项目的财务输入交给 `finance.project_finance.calculate_project_finance`。该入口负责运行概算、校验交接条件，并将含税静态投资和价差预备费传入财务模型。建设期利息和流动资金按财务假设另算。运行命令和输入说明见 [WTG1 财务模型说明](../finance/WTG1-财务模型说明.md)。
