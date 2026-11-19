# 01 · 增加 CodeQL 工作流

Status: resolved
Type: task
Blocked by: 无

按[规格](../spec.md)添加独立的 CodeQL GitHub Actions 工作流并更新 README。

## 验收条件

- JavaScript/TypeScript、Python 和 GitHub Actions 三类分析按规格触发，使用默认查询套件、源码扫描及任务级最小权限。
- `actionlint` 通过。实施 PR 的 `Agent checks` 和三类 CodeQL 分析均通过，三类结果均已上传。
- 交付实施 PR 供维护者审阅和合并。

## Answer

- 已创建独立 CodeQL 工作流并更新 README。`actionlint`、格式检查和 ESLint 通过。仓库规范和规格两路审查均无待修复项。
- [实施 PR #2](https://github.com/Jonnytoshen/REZoningAI/pull/2) 的 [Agent checks](https://github.com/Jonnytoshen/REZoningAI/actions/runs/44473522623) 和 [CodeQL 运行](https://github.com/Jonnytoshen/REZoningAI/actions/runs/44473522627) 均通过。GitHub 代码扫描 API 确认待合入提交有三类成功上传的分析结果。
- 维护者合并实施 PR 后进入[工单 02](02-enable-codeql-merge-protection.md)，验证 `main` 基线并启用门禁。
