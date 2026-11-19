# 统一发布 Agent 应用

Web、API 和共享聊天包通过同一次构建交付，由 Nest 在同一个端口提供服务，因此使用 Nx Release 的固定发布组同步这三个私有包和根清单的版本。发布通过本地 Git 版本提交、附注 tag 和根变更日志交付，维护者可以用一个 tag 检出可复现的源码。工程概算和财务 Python 原型保留独立的开发周期。[ADR 0007](0007-use-nx-and-pnpm-workspace.md)
