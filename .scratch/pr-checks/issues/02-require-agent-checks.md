# 02 · 启用 main 合并门禁

Status: open
Type: task
Blocked by: 01

## 目标

在维护者合入实施 PR 后，按[规格](../spec.md)启用并验证 `main` 的必需状态检查。

## 验收标准

- 从实施 PR 确认已有 GitHub Actions 报告的成功检查，且工作流已进入 `main`。
- `main` 的生效规则要求 `Agent checks` 通过，来源为 GitHub Actions，并要求 PR 与最新 `main` 同步。规则没有绕过条目，现有分支规则一并保留。
- 核对远端生效设置，并记录规则和验收结果。
