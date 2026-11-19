# REZoningAI

面向陆上风电和集中式地面光伏项目的前期选址助手。当前交付 Agent 基础版，支持本地 Web 聊天、Qwen 流式回复、工具调用和历史会话。

## 在本机启动

需要 Node.js 24 或更新版本，以及 pnpm 12.10.1。以下命令均在仓库根目录运行。

```sh
pnpm install --frozen-lockfile
```

首次配置时运行 `cp .env.example .env`。从 npm 迁移的开发者可以继续使用已有的 `.env` 和本地聊天数据库。

在 `.env` 中填写阿里云百炼华北 2（北京）工作空间的 OpenAI 兼容接入地址和 API Key，模型默认使用 `qwen-plus`。连接地址以百炼控制台显示的值为准。[百炼接入文档](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)

### 开发

运行 `pnpm dev` 同时启动 API 和 Web，然后打开开发界面。单独开发时可以运行 `pnpm dev:api` 或 `pnpm dev:web`，Web 开发服务通过代理访问 API。[打开开发界面](http://127.0.0.1:5173)

### 构建与运行

```sh
pnpm build
pnpm start
```

构建完成后，Nest 从同一个端口提供 Web 页面和 API。可在根目录的 `.env` 中通过 `PORT` 调整 API 端口。[打开应用](http://127.0.0.1:3000)

## 验收

- 在同一会话先提供项目类型，再让助手复述。两轮回复都应流式显示。
- 点击「读取当前时间」将问题填入输入框，再发送。聊天页显示工具执行状态和北京时间。
- 新建两段会话，刷新页面或重启应用，分别从聊天历史打开。会话数据默认保存在 `.data/chat.sqlite`。
- 回复生成时点击「停止」。原消息保留，状态显示为中断，可在同一条消息上重试。

`pnpm test` 通过 Nx 运行一次 Vitest。测试使用本机模拟的 Chat Completions 接口和临时 SQLite 数据库，覆盖流式工具调用、多轮上下文、中断重试和会话恢复。真实模型的验收使用上面的百炼配置。

## 代码检查

```sh
pnpm format:check  # 列出需要格式化的文件
pnpm format:write  # 格式化工作区文件
```

Nx 使用根 Prettier 配置，覆盖 Web、API 和共享聊天包的源码、测试、HTML、CSS，以及项目内和根目录的工具配置。JavaScript 和 TypeScript 使用单引号，换行目标宽度为 100 列。格式化跳过 Markdown、本地工单、独立 Python 原型及其样例、pnpm 锁文件、构建产物、覆盖率报告、缓存和本地数据。

运行 `pnpm lint`，用 Nx 和 ESLint 检查 Web、API 和共享聊天包的源码、测试及项目内 JS/TS 配置。各项目沿用 Nx 官方默认规则，React 规则只用于 Web。单独检查时可运行 `pnpm exec nx lint <project>`，其中 `<project>` 为 `web`、`api` 或 `chat`。

安装依赖时会自动启用 Husky。每次提交前先运行 `pnpm format:check`，通过后再运行 `pnpm lint`。即使本次只提交文档，两项检查也会读取各自覆盖范围内的文件，包括未暂存的改动。格式问题或 ESLint 错误会阻止提交，ESLint 警告可以通过。钩子只报告问题，由提交者修复和暂存文件。如需恢复钩子，运行 `pnpm run prepare`。

### PR 检查

指向 `main` 的所有 PR 都会运行 GitHub Actions 的 `Agent checks`，包括纯文档改动。检查在 Linux 上使用 Node.js 24 和仓库声明的 pnpm 版本，按锁文件安装依赖后，依次执行 `pnpm format:check`、`pnpm lint`、`pnpm test` 和 `pnpm build`。API 测试使用模拟模型接口，无需配置真实模型凭据。

`main` 启用必需检查后，PR 分支须与最新的 `main` 同步，且 `Agent checks` 通过才能合并。若检查失败，可在 PR 的 Checks 页查看失败步骤和日志。

### CodeQL 安全扫描

CodeQL 分别扫描 Agent 和共享聊天包的 JavaScript/TypeScript、工程概算与财务原型的 Python，以及 GitHub Actions 工作流。对于所有指向 `main` 的 PR（包括纯文档改动），工作流扫描 GitHub 生成的待合入提交。fork PR 沿用仓库现有的 Actions 审批策略。

`main` 每次更新后都会扫描，另在每周一北京时间 10:23 定时复扫。维护者也可以在 Actions 的 **CodeQL** 工作流中选择 **Run workflow** 手动补跑。PR 的 Checks 页显示扫描状态和新告警，`main` 的告警可在仓库的 **Security** → **Code scanning** 页面查看。

CodeQL 合并规则启用后，GitHub 会等待扫描结果，并在 PR 引入高危或严重安全告警时阻止合并。其余告警继续在报告中供维护者审阅。

## Git 提交规范

安装依赖时会自动启用提交消息校验。提交标题用 `type: subject` 或 `type(scope): subject`。scope 可选，可用 `api`、`web` 或 `chat` 标明改动范围。标题可用中文或英文，例如 `docs: 更新启动说明`、`fix(api): handle empty input`。

Commitlint 会在提交时提示规则违规。错误会阻止提交，警告允许提交。Git 自动生成的合并、回退及 `fixup!` 等消息按预设规则豁免。[Conventional Commits 规范](https://www.conventionalcommits.org/zh-hans/v1.0.0/)

如需重新启用钩子，在仓库根目录运行 `pnpm run prepare`。检查已有提交时，将 `BASE` 换成基准提交的 SHA 或分支名，运行 `pnpm run lint:commits --from BASE --to HEAD`。命令按 Git 的 `BASE..HEAD` 区间检查提交，区间两端应指向不同的提交。

## 发布 Agent

Web、API 和共享聊天包统一升版。Nx Release 在本地 Git 创建版本提交和 `v{version}` 附注 tag，并将发布条目写入根目录的 `CHANGELOG.md`。工程概算和财务 Python 原型独立维护，当发布区间内有符合 Nx 日志分类的原型提交时，根日志也会收录。

| 场景 | 预演 | 正式发布 |
| --- | --- | --- |
| 首次发布 | `pnpm release 0.1.0 --first-release --dry-run` | `pnpm release 0.1.0 --first-release` |
| 后续发布 | `pnpm release --dry-run` | `pnpm release` |
| 指定版本 | `pnpm release 1.0.0 --dry-run` | `pnpm release 1.0.0` |

后续发布由 Nx 根据上一个发布 tag 之后的 Conventional Commits 推导版本。在 `0.x` 阶段，功能和修复升补丁，破坏性变更升次版本。只有文档或独立原型的提交时，自动升版不产生新版本。[Nx Release 文档](https://nx.dev/docs/features/manage-releases)

1. 安装锁定依赖后，在仓库根目录预演。预演可以在开发分支运行。核对版本和日志，用 `git tag --list vX.Y.Z` 确认目标 tag 可用，将 `vX.Y.Z` 替换为预演显示的 tag。
2. 获取远端最新提交和 tag，将干净的本地 `main` 同步到 `origin/main`，确认两者指向同一提交后正式发布。命令会依次检查 Git 状态、代码格式、ESLint、测试和构建。需要查看检查详情时加 `--verbose`。
3. 用 `git log -1 --oneline` 核对版本提交，用 `git show --no-patch vX.Y.Z` 确认附注 tag 指向该提交。
4. 用 `git push --no-follow-tags origin HEAD:refs/heads/release/vX.Y.Z` 将版本提交推到发布分支，再创建指向 `main` 的 PR。等待 `Agent checks` 通过后，在 GitHub 选择 **Create a merge commit** 合入，以保留原始版本提交。
5. 合入后运行 `git fetch origin main`，再用 `git merge-base --is-ancestor 'vX.Y.Z^{commit}' origin/main` 确认 tag 指向的提交已进入远端 `main`。确认成功后，用 `git push --no-follow-tags origin refs/tags/vX.Y.Z` 单独推送附注 tag。使用者可按 tag 检出源码并按上文构建和运行。

如果 `main` 在发布 PR 等待期间前进，先确认本次 tag 尚未推送，再在新的临时克隆中从最新的 `main` 重新安装锁定依赖、预演并生成版本提交和附注 tag。用 `git push --no-follow-tags --force-with-lease=<发布分支引用>:<旧提交SHA> origin HEAD:<发布分支引用>` 更新现有发布分支。将 `<发布分支引用>` 替换为步骤 4 使用的完整引用，将 `<旧提交SHA>` 替换为原发布提交的 SHA。等 PR 重新通过检查并合入，再用新生成的 tag 执行步骤 5。

若版本提交失败，用 `git status`、`git diff --cached` 和 `git log -1` 确认进度。修复失败原因，只撤回本次生成的清单、锁文件和日志改动，再从干净的 `main` 预演和重试。若版本提交已生成但 tag 创建失败，先检查该提交中的版本和日志。确认目标 tag 仍空缺后，可用 `git tag -a vX.Y.Z <版本提交SHA> -m vX.Y.Z` 补建。目标 tag 已存在时，先核对其指向的提交再处理冲突。

## 选址业务

Agent 基础版可以协助梳理搜索范围、项目类型、资料和待核实事项。地图工作台与候选区筛选随空间工具接入，工程概算和财务原型也按业务需要逐步作为工具接入。[选址方案](docs/early-stage-siting-agent.md) · [Agent 基础版规格](.scratch/agent-foundation/spec.md)
