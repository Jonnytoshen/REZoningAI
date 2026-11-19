# PR 检查 CI 路线图

## 工单

- [01 · 接入并验证 Agent PR 检查](issues/01-agent-pr-checks.md)
- [02 · 启用 main 合并门禁](issues/02-require-agent-checks.md)

## 已确认决策

- [规格](spec.md)确定 `Agent checks` 只验证 Agent，并在工作流经维护者合入后成为 `main` 的必需状态检查。发布版本提交同样经过 PR。
- [工单 01](issues/01-agent-pr-checks.md)已解决。实施 PR 已在线通过 `Agent checks`，由维护者审阅和合并后启用[工单 02](issues/02-require-agent-checks.md)的门禁。
