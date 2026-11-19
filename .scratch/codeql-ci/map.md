# CodeQL CI 工单路线图

- [规格](spec.md)
- [01 · 增加 CodeQL 工作流](issues/01-add-codeql-workflow.md)
- [02 · 启用 CodeQL 合并门禁](issues/02-enable-codeql-merge-protection.md)

## Decisions-so-far

- [规格](spec.md)确定三类扫描、触发条件和高危及以上告警门禁。维护者合并实施 PR 后，先验证 `main` 扫描基线，再启用独立规则集。
- [工单 01](issues/01-add-codeql-workflow.md)已解决。[实施 PR #2](https://github.com/Jonnytoshen/REZoningAI/pull/2) 已通过 Agent 检查和三类 CodeQL 扫描，待维护者审阅并合并。
