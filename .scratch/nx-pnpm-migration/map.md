# Nx 和 pnpm 迁移路线图

规格见 [Nx 和 pnpm 迁移](spec.md)。

| 工单 | 交付 | 前置工单 |
| --- | --- | --- |
| [01](issues/01-workspace.md) | pnpm 工作区与 Nx 构建、开发和启动 | 无 |
| [02](issues/02-vitest.md) | API 集成测试迁移到 Vitest | 01 |
| [03](issues/03-docs.md) | 使用说明与架构决策 | 无 |

## Decisions-so-far

- [工单 03](issues/03-docs.md)记录了本地使用命令及共享聊天包的开发和生产入口决策。
- [工单 01](issues/01-workspace.md)完成了三个工作区包、依赖图、本地构建缓存和开发及生产入口。
- [工单 02](issues/02-vitest.md)完成了迁移至 Vitest 的四个 API 集成场景。每次 `pnpm test` 都执行测试。
