# REZoningAI 项目指引

REZoningAI 是面向陆上风电和集中式地面光伏项目前期选址的助手。

## 工作区边界

- `apps/web/` 和 `apps/api/` 通过 `@rezoning-ai/chat` 共用 `packages/chat/` 中的聊天协议。修改协议时同时检查消费它的两端。调整工作区依赖或构建入口前，读 [ADR 0007](docs/adr/0007-use-nx-and-pnpm-workspace.md)。
- `engineering_estimate/` 和 `finance/` 分别是独立运行的工程概算和财务 Python 原型，使用下列 `unittest` 命令验证。

## 开发与验证

在仓库根目录运行与改动对应的命令。

| 改动 | 验证 |
| --- | --- |
| 聊天链路或共享协议 | `pnpm test` 仅运行 API 测试，使用模拟模型接口和临时 SQLite。 |
| 界面行为 | 按 [README 的验收步骤](README.md#验收)验证受影响的流程。 |
| 工程概算 | `python3 -m unittest engineering_estimate.test_model` |
| 财务模型 | `python3 -m unittest finance.test_project_finance` |

改动影响概算传给财务的结果时，两套 Python 测试都跑。启动、构建与代码检查见 [README](README.md)。

新增或修改 Agent 的环境变量时，同步更新 `.env.example`。实际配置与凭据留在本地 `.env`，个人聊天数据留在本地 `.data/`。

## 按任务查阅

- 处理规格或工单时，使用 `.scratch/` 下的本地 Markdown，见[工单指南](docs/agents/issue-tracker.md)。
- 涉及选址术语、筛选规则或业务工具时，按[领域指南](docs/agents/domain.md)先读[术语表](GLOSSARY.md)和相关 ADR。
- 调整 Agent 发布流程或版本范围时，先读 [ADR 0008](docs/adr/0008-release-agent-as-one-version.md) 和 [README 的发布流程](README.md#发布-agent)。

## 会话接续

压缩上下文时，保留用户约束、已修改的文件、验证命令与结果，以及当前进度和下一步。
