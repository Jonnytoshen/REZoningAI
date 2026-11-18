# 用 React 和 NestJS 构建 Agent 应用

Agent 基础版采用 React 和 NestJS，前后端使用 TypeScript 共享聊天消息和流式事件类型。NestJS 持有会话并执行工具，现有 Python 计算模型保留在 Python 中，接入业务时通过工具接口调用。相比由 Python 后端直接调用原型，这一选择在接入时增加了跨进程接口和输入输出校验，换来 Agent 应用与业务模型可以独立演进。
