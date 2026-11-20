---
name: REZoningAI Agent 工作台
description: 面向前期选址咨询的奶白与墨黑工作台。
colors:
  primary: '#1b1b1b'
  cream: '#fbf8f3'
  surface: '#ffffff'
  surface-dark: '#242322'
  secondary: '#eee9e1'
  secondary-dark: '#32302d'
  muted: '#f0ece5'
  text-muted: '#5a5650'
  text-muted-dark: '#c7beb4'
  line: '#d3cbc0'
  line-dark: '#45403b'
  field-outline: '#93877c'
  field-outline-dark: '#7b7268'
  focus: '#62574b'
  brand-marker: '#3964fe'
  brand-marker-dark: '#7c9aff'
  destructive: '#962d23'
  destructive-dark: '#ffb2a6'
typography:
  display:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: '3.75rem'
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: '-0.01em'
  headline:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: '1.875rem'
    fontWeight: 700
    lineHeight: 1.2
  lead:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: '1.75rem'
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: '0.025em'
  title:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: '1.75rem'
  body:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: '1.75rem'
  label:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: '1.25rem'
  caption:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif"
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: '1rem'
rounded:
  control: '0.5rem'
  bubble: '0.75rem'
  panel: '1rem'
  badge: '2rem'
spacing:
  base: '0.25rem'
  compact: '0.5rem'
  control: '0.75rem'
  gutter: '1rem'
  roomy: '1.5rem'
  section: '2.5rem'
components:
  send-button:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.cream}'
    rounded: '{rounded.control}'
    height: '2.75rem'
    padding: '0 1rem'
  send-button-dark:
    backgroundColor: '{colors.cream}'
    textColor: '{colors.primary}'
  outline-button:
    backgroundColor: '{colors.cream}'
    textColor: '{colors.primary}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    height: '2.75rem'
  ghost-button:
    backgroundColor: transparent
    textColor: '{colors.primary}'
    rounded: '{rounded.control}'
    size: '2.75rem'
  composer:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.primary}'
    rounded: '{rounded.panel}'
  composer-dark:
    backgroundColor: '{colors.surface-dark}'
    textColor: '{colors.cream}'
  starter-prompts:
    textColor: '{colors.primary}'
    rounded: '{rounded.panel}'
  history-row-selected:
    backgroundColor: '{colors.secondary}'
    textColor: '{colors.primary}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '0.5rem 0.75rem'
  model-badge:
    backgroundColor: '{colors.secondary}'
    textColor: '{colors.primary}'
    typography: '{typography.caption}'
    rounded: '{rounded.badge}'
    height: '1.25rem'
    padding: '0.125rem 0.5rem'
  user-bubble:
    backgroundColor: '{colors.secondary}'
    textColor: '{colors.primary}'
    rounded: '{rounded.bubble}'
    padding: '0.75rem 1rem'
  tool-trace:
    textColor: '{colors.text-muted}'
---

# Design System: REZoningAI Agent 工作台

## Overview

**Creative North Star: "选址登记页"**

把选址咨询做成一张容易填写、便于回读的登记页。标题交代要填写的信息，输入框承载主要操作。进入会话后，助手回复沿阅读列展开，输入框接续追问。

暖奶白工作面、墨黑文字、系统中文无衬线和细边界形成安静的工作环境。浅色用官方主字标，深色用官方反白字标。消息头像和 favicon 使用墨黑底应用图标。

**Key Characteristics**

- 单列阅读与输入，常用问题贴近输入区。
- 填写区域以独立表面和一圈细边界识别。
- 亮蓝留在官方字标和小面积标记。

## Colors

| 用途 | 浅色 | 深色 |
| --- | --- | --- |
| 工作面 | 奶白 `cream` | 墨黑 `primary` |
| 正文与主操作底色 | 墨黑 `primary` | 奶白 `cream` |
| 输入与提示表面 | 白色 `surface` | 深灰 `surface-dark` |
| 用户消息、选中会话与标签 | 暖灰 `secondary` | 深灰 `secondary-dark` |
| 悬停和加载占位 | `muted` | `secondary-dark` |
| 说明与时间 | `text-muted` | `text-muted-dark` |
| 分隔线、控件边界和焦点 | `line`、`field-outline`、`focus` | `line-dark`、`field-outline-dark`、`text-muted-dark` |
| 标记圆点 | `brand-marker` | `brand-marker-dark` |
| 错误文字与图标 | `destructive` | `destructive-dark` |

主题默认跟随系统。用户切换后优先应用本地保存的选择。失败状态同时用文字与图标表达。

## Typography

界面使用苹方、微软雅黑、思源黑体和系统无衬线的回退顺序。官方字标直接使用 SVG。详见 [REZoningAI 品牌标识规范](../../docs/brand/brand-guidelines.md)。

- 起始页标题使用粗体（700），在 `64rem` 起用 `display`，窄屏用 `headline`。宽屏说明用 `lead`，窄屏使用正文大小（`1rem`、行高 1.625）。
- 会话标题使用 `title`，在标题栏和历史列表中换行显示。当前会话可在标题旁重命名。
- 助手正文使用 `body`，支持 Markdown 标题、段落、列表和表格。宽表格在正文内独立横向滚动。时间和模型名采用较小字号，时间用等宽数字对齐。

## Layout

- 起始页的标题、输入框和常用问题共用一个左对齐的阅读列，容器上限为 `64rem`。进入会话后，阅读列上限为 `50rem`，消息区域独立滚动，标题和输入框留在视口内。
- 宽度不足 `40rem` 时，常用问题单列排列，历史与新建会话入口使用有名称的图标按钮，输入区底部保留发送操作。自 `40rem` 起，三项常用问题并排，显示顶栏按钮文字和键盘提示。
- 自 `64rem` 起，顶栏标识旁显示工作台名称，起始页放大标题和输入区。宽度达到 `64rem` 且视口高度不超过 `48rem` 时，收紧起始页上方留白和输入区高度。`80rem` 到不足 `96rem` 的宽度区间使用 90% 的根字号。

## Elevation & Depth

工作面、输入区和消息主要靠平面色差与细线区分。历史使用原生模态对话框，打开时以 35% 的黑色遮罩形成前后层次。可键盘操作的控件用外圈标识焦点，密排的常用问题改用内圈以免裁切。

## Shapes

输入框和常用问题组使用较大的圆角（`1rem`）。常用问题组只有一圈外框，组内由细线隔开。工具栏按钮圆角较小（`0.5rem`），用户消息气泡用 `0.75rem`，模型标签用胶囊形。

## Components

### 输入和按钮

- 起始与追问共用输入组件，追问区更紧凑。文本域和底部工具区共用一圈边界，文本域获得键盘焦点时高亮外框。
- 发送使用实底按钮。缺少可发送的内容或模型未就绪时禁用。生成时，输入保留为只读，原操作位改为描边的停止按钮，停止请求发出后展示「正在停止」。
- 有文字的工具栏次操作用描边按钮，主题切换用无边框图标按钮。悬停改变底色，键盘焦点使用同一套焦点色。窄屏图标保留可读名称。
- 常用问题以图标和短文案呈现。选择后在编辑区选中待替换内容，已有草稿时将示例追加到末尾。未发送的草稿按会话保存在当前浏览器标签页。

### 聊天历史

从顶栏打开原生模态对话框。面板靠右、占满视口高度，宽度上限为 `24rem`。列表独立滚动，当前会话使用暖灰底并标出选中语义。各条目显示标题、最近提问摘要和具体更新时间，搜索匹配标题与摘要。加载、空列表、无搜索结果和读取失败各有说明。

### 会话与状态

- 用户消息靠右，用暖灰气泡承载输入。助手消息靠左，官方墨黑应用图标标记发言者，正文直接排在工作面上。模型标签仅在已配置模型的会话中显示，圆点和模型名并列。
- 工具活动以细竖线串起名称、状态图标、状态文字和可用的详情。新出现且正在生成的助手回复以 `180ms` 缓出落位，透明度由 0.8 到 1，向上移动 `4px`。开启系统减少动态效果时，取消回复入场动效，回到最新消息时直接定位。
- 回复停止与生成失败均保留已有正文，并在原回复处显示状态。符合条件的最近一轮提供重试。

## Do's and Don'ts

- **Do** 在浅深主题中分别使用官方主字标和反白字标。
- **Do** 把输入、发送和可用的键盘提示放在同一块输入表面。
- **Do** 让焦点、失败和当前会话各自有清晰可辨的状态。
- **Don't** 把标识用蓝扩展成正文色或大面积的操作底色。
- **Don't** 给每条助手消息加卡片边框或装饰阴影。
