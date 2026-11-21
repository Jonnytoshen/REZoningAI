---
version: 1
slug: "src-app-tsx"
primary_target: "src/app.tsx"
related_targets: ["src/styles.css"]
---

# Agent 工作台

模式为 Operate。中国大陆风电和地面光伏项目的开发人员打开工作台，先提一个选址准备问题，再通过对话补充信息。常用问题填入可编辑的草稿，已有草稿时追加。聊天历史从顶栏打开，可按标题或最近提问摘要搜索。时间工具通过提问调用，回复支持流式显示、停止和同一条消息重试。

## Direction contract

### THESIS
把咨询当成编辑一份选址登记。打开页面时，视线能从开始提示自然落到输入区，然后扫到常用问题。

### OWN-WORLD
奶白工作面、墨黑操作、白色输入区及一条细边界。使用官方字标，品牌亮蓝留在标识和圆点。深色切换使用对应的反白标识。系统中文无衬线负责阅读和操作。

### STORY
用户输入项目类型和区域，或选择常用问题填写草稿。首次发送后，回复进入可滚动的会话区，同一输入框用于追问。

### FIRST VIEWPORT
顶栏放字标、工作台名称、聊天历史和新建会话。下方为左对齐的单列，依次显示提问提示、宽输入框和一行三项的常用问题。窄屏叠放三项。选择常用问题后输入框获得焦点。消息首次落位使用轻微淡入，按系统减弱动效设置降级。

### FORM
选址登记页单列输入。候选排序第 1，用户选定 model-pick 后选择 layout-2。种子 4b310613。批准稿 `.impeccable/mocks/workbench-2.png`。

### FINISH
unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
