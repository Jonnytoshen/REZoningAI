# 工单跟踪

每个功能使用一个 `.scratch/<feature-slug>/` 目录。

- 规格放在 `.scratch/<feature-slug>/spec.md`。
- 实施工单放在 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 起编号，每张工单独立成文件。
- 工单状态写在文件开头附近的 `Status:` 行，评论按顺序追加到 `## Comments` 下。

技能要求发布规格或工单时，在对应路径创建文件。读取工单时，按用户提供的路径定位，或在当前功能目录下按工单编号查找。

## Wayfinding

- 路线图放在 `.scratch/<effort>/map.md`，子工单放在 `.scratch/<effort>/issues/`，从 `01` 起编号。
- 子工单正文说明待回答的问题。用 `Type:` 记录 `research`、`prototype`、`grilling` 或 `task`，用 `Blocked by:` 列出前置工单编号。
- 按编号选取首张开放、未认领且所有前置工单均已解决的工单。开始工作前保存 `Status: claimed`。
- 解决后将结论写到 `## Answer`，更新为 `Status: resolved`，并在路线图的 Decisions-so-far 部分追加摘要和工单链接。
