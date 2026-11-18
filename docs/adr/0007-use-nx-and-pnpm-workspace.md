# 用 Nx 和 pnpm 管理 Agent 工作区

沿用 ADR 0006 的 React 和 NestJS 应用结构，将 Web、API 和共享聊天模块拆成三个私有 pnpm 工作区包，由两个应用显式依赖 `@rezoning-ai/chat`，并由 Nx 管理项目依赖图、任务顺序和本地构建缓存。开发和 Vitest 直接读取共享包的 TypeScript 源码，使初次启动无需先构建共享包，修改共享代码也能随应用更新。生产入口使用编译后的 JavaScript，让 Nest 通过 Node.js 直接启动，继续在一个端口提供 Web 页面和 API。[ADR 0006](0006-use-react-and-nestjs-for-agent.md)
