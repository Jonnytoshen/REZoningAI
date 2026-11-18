# REZoningAI

面向陆上风电和集中式地面光伏项目的前期选址助手。当前交付 Agent 基础版，支持本地 Web 聊天、Qwen 流式回复、工具调用和历史会话。

## 在本机启动

需要 Node.js 24 或更新版本。先在仓库根目录安装依赖并生成本地配置文件。

```sh
npm ci
cp .env.example .env
```

在 `.env` 中填写阿里云百炼华北 2（北京）工作空间的 OpenAI 兼容接入地址和 API Key，模型默认使用 `qwen-plus`。连接地址以百炼控制台显示的值为准。[百炼接入文档](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)

```sh
npm run build
npm start
```

打开 [http://127.0.0.1:3000](http://127.0.0.1:3000)。开发时可以运行 `npm run dev`，在 [http://127.0.0.1:5173](http://127.0.0.1:5173) 打开开发界面。

## 验收

- 在同一会话先提供项目类型，再让助手复述。两轮回复都应流式显示。
- 点击「读取当前时间」将问题填入输入框，再发送。聊天页显示工具执行状态和北京时间。
- 新建两段会话，刷新页面或重启应用，分别从聊天历史打开。会话数据默认保存在 `.data/chat.sqlite`。
- 回复生成时点击「停止」。原消息保留，状态显示为中断，可在同一条消息上重试。

`npm test` 通过本机模拟的 Chat Completions 接口检查流式工具调用、多轮上下文、中断重试和 SQLite 恢复。真实模型的验收使用上面的百炼配置。

## 选址业务

Agent 基础版可以协助梳理搜索范围、项目类型、资料和待核实事项。地图工作台与候选区筛选随空间工具接入，工程概算和财务原型也按业务需要逐步作为工具接入。[选址方案](docs/early-stage-siting-agent.md) · [Agent 基础版规格](.scratch/agent-foundation/spec.md)
