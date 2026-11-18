# 接入并验收提交校验

Status: claimed

Type: task

Blocked by: none

如何用同一份 Commitlint 配置校验本地提交和指定提交区间，并保留官方预设支持的中英文标题、可选 scope、警告和默认豁免行为？

## 验收

- 依照[规格](../spec.md)接入根开发依赖、提交钩子、区间命令和 README 说明。
- 在临时克隆用冻结安装、真实 Git 提交和区间命令验证通过、告警和拦截，并运行现有 `pnpm test`。
