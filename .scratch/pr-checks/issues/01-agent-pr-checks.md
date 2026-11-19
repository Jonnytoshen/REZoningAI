# 01 · 接入并验证 Agent PR 检查

Status: resolved
Type: task
Blocked by: 无

## 目标

按[规格](../spec.md)实现 `Agent checks` 工作流，更新 PR 检查与 Agent 发布说明，并将实施 PR 交给维护者审阅和合并。

## 验收标准

- 面向 `main` 的 PR 在创建、更新、重开或改投后运行工作流，覆盖纯文档改动。使用 Linux、Node.js 24、根清单指定的 pnpm、冻结锁文件和只读仓库权限。
- 工作流依次运行格式检查、ESLint、API 测试和构建，任一步失败使 `Agent checks` 失败。
- README 记录必需检查及版本提交通过 PR 合入、验证提交关系、推送附注 tag 的顺序，并说明基线前进时的处理方式。
- 本地检查工作流和现有命令，并核对实施 PR 的 Actions 结果。

## Answer

- 已添加 `Agent checks` 工作流和 README 发布说明。冻结安装、格式检查、ESLint、4 项 API 集成测试及构建均在隔离工作树通过。临时格式错误使格式检查按预期失败。
- 在临时 Git 仓库验证了发布分支推送不会附带 tag。保留原始版本提交的合并通过祖先检查，压缩合并未通过。显式推送保留了附注 tag 和提交身份。
- [实施 PR #1](https://github.com/Jonnytoshen/REZoningAI/pull/1) 的[首次 Actions 运行](https://github.com/Jonnytoshen/REZoningAI/actions/runs/44470979169)通过了冻结安装和四项检查。仓库规范与规格两路审查均无待修复项。维护者合并后进入工单 02。
