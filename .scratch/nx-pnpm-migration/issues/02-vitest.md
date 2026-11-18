# 将 API 集成测试迁移到 Vitest

Status: resolved

Type: task

Blocked by: 01

如何让 `pnpm test` 通过 Nx 推断目标运行现有四个集成场景？保留模拟模型接口、临时 SQLite、场景顺序和断言，并验证构建共享包之前可以运行测试。

## Answer

Vitest 迁移已合入 `d551a49`。四个 API 集成场景保留流式回复、工具调用、中断重试、会话隔离和 SQLite 恢复的断言。冻结安装后、共享包构建前，`pnpm test` 通过。审查修复 `3b003b1` 关闭了集成测试缓存，连续两次均实际运行 Vitest 并通过全部场景。
