---
kind: frontend_style
name: LeapChess 前端样式体系：CSS 变量主题 + 原生 BEM 风格类名
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/css/style.css
    - frontend/index.html
    - frontend/login.html
    - frontend/admin.html
---

## 1. 使用的系统/方法

- **纯 CSS（无框架）**：前端未引入任何 UI 组件库或 CSS 预处理器，所有样式集中在 `frontend/css/style.css` 一个文件中。
- **CSS Custom Properties（设计令牌）**：通过 `:root` 集中声明颜色、圆角、字体等设计令牌，作为全站统一的视觉基线。
- **BEM 风格命名**：类名采用 `block__element--modifier` 的简化形式（如 `.nav`、`.nav-links`、`.btn-primary`、`.product-card`），语义清晰且可组合。
- **响应式策略**：使用原生 `@media` 断点（900px、720px）配合 CSS Grid 的 `auto-fill` / `minmax` 实现流式布局；移动端通过 `.nav-toggle` 切换 `.nav-links.open` 显示汉堡菜单。
- **滚动显现动画**：通过 `.reveal` + `.show` 类与 JS 配合实现淡入上移效果。

## 2. 关键文件

- `frontend/css/style.css` — 唯一样式源，包含全部主题、布局、组件和响应式规则。
- `frontend/index.html` — 首页，引用 `css/style.css`，使用 `.nav`、`.hero`、`.section`、`.product-grid` 等类构建页面结构。
- `frontend/login.html`、`frontend/admin.html` — 登录与管理后台页面，复用同一套样式。
- `frontend/js/main.js`、`admin.js`、`auth.js` — 负责动态渲染产品网格、表单交互以及 `.reveal` 滚动动画，不直接操作内联样式。

## 3. 架构与约定

### 设计令牌（Design Tokens）
在 `:root` 中定义全局令牌，形成完整的品牌色板：
- 背景/文字：`--black` (#12100e)、`--dark` (#1c1916)、`--panel` (#242019)、`--ivory` (#f3ead9)、`--ivory-dim` (#cfc4ae)
- 品牌强调：`--brown` (#7b5b3a)、`--brown-light` (#a98a63)、`--gold` (#d4af37)、`--gold-soft` (#e8cf7a)
- 状态：`--danger` (#e05b4b)、`--ok` (#6fbf73)
- 通用：`--radius: 14px`、`--serif`、`--sans`

### 组件化约定
- **按钮**：基础 `.btn` + 变体 `.btn-primary` / `.btn-ghost` / `.btn-danger` / `.btn-small` / `.btn-block`。
- **导航**：`.nav`（sticky + backdrop-filter）+ `.nav-links` + 移动端 `.nav-toggle`。
- **区块**：`.section` + `.section-head` + `.section-tag` 统一章节头部。
- **卡片**：`.why-card`、`.product-card` 共享 `background: var(--panel)` + `border` + `border-radius: var(--radius)` + hover 上浮。
- **商品卡片**：`.product-img` 使用棋盘格渐变占位，`.product-body` 用 flex 撑满高度，`.product-price` 使用金色衬线字体。
- **管理后台**：`.admin-grid` 双栏布局（左侧 380px 表单面板 + 右侧表格），`.panel` 复用卡片风格，`.admin-table` 带行 hover 高亮。
- **认证页**：`.auth-body` 居中卡片布局，输入框统一边框/聚焦态。

### 排版与视觉
- 标题使用 `var(--serif)`（Georgia/Times/Noto Serif SC），正文使用 `var(--sans)`（Segoe UI/PingFang/微软雅黑）。
- 字号使用 `clamp()` 实现流体缩放（如 hero h1、section h2）。
- 大量使用 `rgba(212, 175, 55, .xx)` 金色半透明边框营造“国际象棋高端”氛围。
- 装饰性棋盘格背景通过 `repeating-conic-gradient` 生成，避免外部图片依赖。

### 响应式约定
- 断点：`900px`（管理后台双栏变单栏）、`720px`（导航折叠为汉堡菜单）。
- 布局：优先使用 CSS Grid 的 `repeat(auto-fill, minmax(...))` 自适应列数。
- 间距：使用 `vw` 单位（如 `padding: 90px 6vw`）保持大屏留白比例一致。

## 4. 约定与约束

- **单一样式入口**：所有页面通过 `<link rel="stylesheet" href="css/style.css">` 引用同一份 CSS，不存在按页面拆分样式文件的约定。
- **类名命名规范**：遵循 BEM 风格的块-修饰符模式（`.btn-primary`、`.chip.active`、`.form-msg.ok|err`），禁止随意创建无语义的 class。
- **颜色必须走变量**：新增颜色应先在 `:root` 中声明 token，再在组件中使用 `var(--xxx)`，禁止硬编码十六进制值（除注释中的品牌色参考）。
- **圆角统一**：卡片/面板统一使用 `var(--radius)`（14px），按钮使用固定 8px，标签/徽章使用 `999px` 实现胶囊形。
- **交互反馈**：hover 动效统一使用 `transform: translateY(-6px)` 上浮 + `transition: all .25s`，保持微交互一致性。
- **无障碍**：装饰元素使用 `aria-hidden="true"`（如 `.hero-board`、`.hero-piece`），导航按钮提供 `aria-label`。
- **JS 与样式解耦**：动态行为（产品渲染、表单提交、滚动动画）通过添加/移除 `.hidden`、`.open`、`.show` 等类名控制，不在 JS 中直接写内联样式。
- **移动端优先的渐进增强**：桌面端默认展示完整导航，移动端通过 `.nav-toggle` 切换 `.nav-links.open` 显示下拉菜单。