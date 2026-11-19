# 接入并验收提交校验

Status: resolved

Type: task

Blocked by: none

如何用同一份 Commitlint 配置校验本地提交和指定提交区间，并保留官方预设支持的中英文标题、可选 scope、警告和默认豁免行为？

## 验收

- 依照[规格](../spec.md)接入根开发依赖、提交钩子、区间命令和 README 说明。
- 在临时克隆用冻结安装、真实 Git 提交和区间命令验证通过、告警和拦截，并运行现有 `pnpm test`。

## Answer

- `51626a0` 接入 Commitlint 21.2.4 和 Husky 9.1.7，提交钩子与区间命令共用官方预设。冻结安装自动启用钩子，手动运行 `pnpm run prepare` 可恢复钩子。
- 在独立临时克隆中用真实 Git 提交验证了中英文标题、可选 scope、默认豁免和警告。无效类型与缺少标题被拦截，含错误的区间返回非零。
- `44a707b` 在 README 明确了 `BASE..HEAD` 的边界。两端解析到同一提交时，Commitlint 返回退出码 9。
- `NX_DAEMON=false pnpm test` 和 `NX_DAEMON=false pnpm build` 均通过。仓库约定和规格审查未发现阻塞问题。
