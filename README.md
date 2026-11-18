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

## 选址业务

Agent 基础版可以协助梳理搜索范围、项目类型、资料和待核实事项。地图工作台与候选区筛选随空间工具接入，工程概算和财务原型也按业务需要逐步作为工具接入。[选址方案](docs/early-stage-siting-agent.md) · [Agent 基础版规格](.scratch/agent-foundation/spec.md)
