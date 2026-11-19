# 为 REZoningAI 增加 CodeQL CI 和合并门禁

Status: accepted
Labels: ready-for-agent

## 问题陈述

`main` 已要求 `Agent checks` 通过。该检查验证 Agent 的格式、ESLint、API 测试和构建。维护者还需要在 PR 中看到 Web、API、共享聊天包、Python 原型及 GitHub Actions 工作流的静态安全扫描结果，并在 PR 引入高危安全告警时阻止合并。

维护者也需要看到 `main` 的扫描基线，并在查询更新后复扫已合入的代码，以便发现和跟踪已有风险。

## 解决方案

用独立的 GitHub Actions 工作流运行 CodeQL，扫描 JavaScript/TypeScript、Python 和 GitHub Actions 工作流。在 PR 中展示待合入提交的扫描结果，在仓库的 Security 页面跟踪 `main` 的告警。PR 事件、`main` 更新和每周定时任务触发扫描，维护者也可手动补跑。

先在实施 PR 和 `main` 确认三类结果均能上传，再为 `main` 启用 GitHub 原生代码扫描规则。门禁要求 CodeQL 结果可用，并阻止引入高危或严重安全告警的 PR。`Agent checks` 继续独立作为必需状态检查。

## 用户故事

1. 作为 PR 作者，我希望打开指向 `main` 的 PR 时自动扫描待合入的提交，以便在审阅开始时看到安全结果。
2. 作为 PR 作者，我希望推送新提交后重新扫描，以便确认修复已反映在最新结果中。
3. 作为 PR 作者，我希望重新打开 PR 或改投 `main` 时触发扫描，以便继续满足 `main` 的合并条件。
4. 作为 fork 贡献者，我希望 PR 在符合仓库现有审批策略后能运行扫描，以便在上游 PR 中看到结果。
5. 作为文档贡献者，我希望纯文档 PR 也能产生扫描结果，以便满足必需的代码扫描规则。
6. 作为 Agent 开发者，我希望扫描覆盖 Web、API 和共享聊天包，以便在合入前发现 JavaScript 和 TypeScript 代码中的安全问题。
7. 作为 Python 原型维护者，我希望工程概算和财务原型也经过扫描，以便在 PR 中看到相关告警。
8. 作为 CI 维护者，我希望扫描 GitHub Actions 工作流，以便在审阅工作流变更时发现安全问题。
9. 作为 PR 审阅者，我希望三类扫描分别产生结果，以便定位扫描失败或告警所属的类别。
10. 作为 PR 审阅者，我希望在 GitHub PR 中看到新告警，以便对照具体改动审阅。
11. 作为仓库维护者，我希望 `main` 更新后自动扫描，以便建立并更新仓库的告警基线。
12. 作为仓库维护者，我希望每周定时复扫，以便在代码没有变动时也能应用更新的查询。
13. 作为仓库维护者，我希望在 Actions 中手动补跑，以便重新验证扫描和上传。
14. 作为仓库维护者，我希望使用 CodeQL 默认查询套件，以便首版门禁采用 GitHub 维护的高置信度查询。
15. 作为仓库维护者，我希望扫描结果尚未就绪时暂缓合并，以便审阅的是当前 PR 的分析结果。
16. 作为仓库维护者，我希望 PR 引入高危或严重安全告警时阻止合并，以便要求作者先处理风险。
17. 作为 PR 审阅者，我希望其余告警仍可查看，以便按风险跟进，同时让合并门禁聚焦高危及以上安全告警。
18. 作为仓库管理员，我希望管理员也受 CodeQL 规则约束，以便日常变更和发布 PR 走同一套门禁。
19. 作为仓库维护者，我希望先审阅并合并实施 PR，再确认 `main` 已收到全部扫描结果后启用门禁，以便合入工作流与强制执行有明确的先后顺序。
20. 作为新贡献者，我希望从 README 知道扫描何时运行、去哪里看结果以及什么会阻止合并，以便自行定位 CI 问题。

## 实施决策

- 采用 GitHub CodeQL Advanced setup，将独立工作流纳入版本控制。矩阵包含 `javascript-typescript`、`python` 和 `actions`，使用 `ubuntu-latest`、默认查询套件和 `build-mode: none`。关闭矩阵的 fail-fast，各任务按稳定的语言类别分别上传结果。
- PR 扫描使用以 `main` 为目标的 `pull_request` 事件，覆盖 `opened`、`reopened`、`synchronize` 和 `edited`，分析 GitHub 生成的待合入提交。所有符合条件的 PR 都执行扫描，包括纯文档 PR。fork PR 沿用仓库现有的 GitHub Actions 审批策略。
- 对 `main` 的每次推送运行扫描。定时任务设为每周一 02:23 UTC，即北京时间周一 10:23，并提供 `workflow_dispatch` 手动触发入口。
- 沿用现有 CI 的 `actions/checkout@v7.0.1`，关闭检出凭据持久化，使用 `github/codeql-action` 的 `init@v4` 和 `analyze@v4`。扫描任务仅声明 `contents: read` 与 `security-events: write`，使用 GitHub 提供的令牌上传结果。三个分析任务直接处理检出的源码。
- 交付独立实施 PR，并更新 README 中的扫描范围、触发方式、PR 与 Security 页面入口以及合并条件。实施 PR 由仓库维护者审阅并合并。
- 实施 PR 合入且 `main` 的三类扫描结果均成功上传后，创建仅针对 `main` 的独立规则集。启用 **Require code scanning results**，工具选 **CodeQL**。安全告警阈值为 **High or higher**，普通告警阈值为 **None**，规则集无绕过条目。既有分支规则和 `Agent checks` 继续生效。 [GitHub 代码扫描合并保护](https://docs.github.com/en/code-security/concepts/code-scanning/merge-protection)

## 测试决策

- 以 GitHub PR、Actions 运行记录、Security 中的分析结果和 `main` 生效规则为验收入口。沿用现有 `Agent checks` 的线上验收方式，检查触发事件、任务结论、结果上传和 PR 的合并状态。
- 在提交前用 `actionlint` 校验工作流。核对 PR 事件及活动类型、`main` 推送、定时和手动入口、三类矩阵及任务权限，确认没有路径过滤。
- 在实施 PR 中确认 `Agent checks` 通过，三类 CodeQL 任务均由 PR 事件触发并成功上传结果。实施 PR 合入后，确认 `main` 的推送触发扫描，三类分析均出现在仓库的代码扫描结果中。
- 启用规则后，从 `main` 的生效规则核对 CodeQL 工具、告警阈值、目标分支及绕过列表，并确认 `Agent checks` 仍为必需检查。用下一张正常 PR 验证扫描待定时门禁等待，结果通过且没有达到阈值的新告警时，CodeQL 门禁允许合并。

## 范围之外

- Agent、共享聊天协议、选址业务、工程概算与财务原型的实现变更。
- 调整既有 `Agent checks`、Python 单元测试入口或 Agent 发布流程。
- 自定义 CodeQL 查询、额外安全扫描器与存量安全告警的批量治理。

## 补充说明

- 规划阶段确认 `Jonnytoshen/REZoningAI` 是公开仓库，默认分支为 `main`，CodeQL Default setup 尚未启用。启用 Advanced setup 时以 GitHub 的实际配置为准。 [GitHub CodeQL 配置方式](https://docs.github.com/en/code-security/concepts/code-scanning/setup-types)
- 现有 `Agent checks` 和发布 PR 的约定见 [PR 检查规格](../pr-checks/spec.md)。
