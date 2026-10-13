# ADR-0008 · 移除双价 / MOQ / 商品标签，管理后台全中文化与布局调整

- **状态**：已采纳（Accepted）
- **日期**：2026-10-13
- **相关文档**：[proposal.md](../proposal.md)、[design.md](../design.md)、[tasks.md](../tasks.md)、[contracts/README.md](../contracts/README.md)、[ADR-0004](./ADR-0004-scope-standard-products-and-tags.md)、[ADR-0006](./ADR-0006-dual-pricing-moq-and-tag-styling.md)

## 背景（Context）

- ADR-0004 规划了商品 `tags` 标签数组，ADR-0006 规划了双价（`original_price` / `current_price`）与起订量 `moq`。经核验，三者仅在前端落地（后台表单输入、前台徽标/划线原价/MOQ 展示、`normalizeProduct` 兜底），后端 `products` 表与 `POST/PUT /api/products` 从未持久化这些字段：后台录入后即被丢弃，前台永远只显示默认值，形成“看似可配、实则无效”的误导性功能。
- 用户于 2026-10-13 决定：上述三项功能整体下线，前后端与规格中均不再保留。
- 管理后台仅供内部团队使用，ADR-0006 决策 5 将后台文案统一为英文降低了团队可用性；用户要求后台 UI（含登录页）全部改为中文，并让按钮功能、输入提示更明确。
- 后台布局存在可读性问题：主内容区受前台 `--wrap`（1160px）限制偏窄；商品表单在常规桌面宽度下存在横向溢出风险；登录卡片居中依赖收缩宽度的包裹元素，不够稳健。

## 决策（Decision）

1. **移除双价**：删除 `original_price` 与 `current_price` 契约，商品价格回归单一 `price` 字段。前台首页主推卡、瀑布流卡、详情页及后台列表不再渲染划线原价；删除 `.price-was` 样式与 `normalizeProduct` 中的双价归一。
2. **移除 MOQ**：删除 `moq` 字段、后台“起订量”输入、详情页 “Minimum order” 展示及 `.pd-moq` 样式。
3. **移除商品标签**：删除 `tags` 字段、后台标签编辑器（含建议词）、`settings.product_tags` 受控词表的前端默认值、前台徽标渲染（`ui/badges.js` 整体删除）、商品总览页的标签筛选，以及相关样式（`.badges`、`.media-badges`、`.m-tags`、`.pd-tags`、`.cell-tags`、`.tag-*`、`.filter-sep`）。通用 `.badge` 样式保留，仅供后台账号类型 / 权限展示使用。
4. **后端与数据**：后端 schema（`db.js`）、种子（`seed.js`）与商品接口（`server.js`）本就不含上述字段，无需迁移；契约文档中所有“规划字段”描述一并删除，正式 `openapi.yaml` 冻结时不得包含 `tags` / `original_price` / `current_price` / `moq`。
5. **后台全中文化**：管理后台与登录页的标签、按钮、占位符、提示、Toast、确认对话框、表头、能力项（`CAPABILITIES`）、审计动作（`AUDIT_ACTIONS`）、账号类型（`accountLabel`）及新产生的审计 detail 模板统一为中文；按钮文案以“动词 + 对象”明确功能（如“保存商品”“上传并应用 LOGO”），输入框提供示例型占位符与必要的字段说明。前台（访客可见页面）文案保持英文，不在本 ADR 范围内。ADR-0006 决策 5 中“后台表单与提示英文化”的部分由本决策取代。后端 `error` 文案作为接口契约保持英文不变，由 `core/http.js` 在 `lang="zh-*"` 页面（admin.html / login.html）展示前映射为中文，未收录的文案原样展示。
6. **后台布局调整（仅 CSS 微调，不做结构性变更，遵守 ADR-0007 决策 5）**：
   - 登录页 / 拒绝访问卡片在视口内水平垂直居中（包裹元素占满宽度，卡片 `margin: auto`）；
   - 后台主内容区最大宽度由 `--wrap` 放宽为独立令牌 `--admin-wrap`（1440px），导航同步放宽；
   - 商品表单网格使用 `minmax(0, 1fr)` 自适应列、表单控件 `min-width: 0`，常规桌面宽度下不出现横向滚动。

## 备选与否决（Alternatives）

- **补齐后端持久化（版本化迁移新增三列）**：否决。用户明确要求下线功能，且当前业务不依赖。
- **仅隐藏 UI、保留前端兜底与契约描述**：否决。会继续留下死代码与误导性规格。
- **引入 i18n 资源文件实现后台中英切换**：否决。i18n 仍属 proposal Q1 待决策项（C1 例外未批准），后台仅内部使用，直接硬编码中文即可（C4）。

## 影响（Consequences）

- ✅ 正面：消除“可录入但不生效”的误导功能；前端减少一个 UI 模块与若干兜底逻辑；后台对内部团队更易用、更宽敞。
- ⚠️ 代价：未来若重新需要促销价 / 起订量 / 标签，须另立 ADR 并同步实现后端迁移，不得只做前端。
- ⚠️ 历史审计记录中的英文 detail 不回溯翻译，仅新记录使用中文模板。
- 关联：ADR-0004 决策 2/3 与 ADR-0006 决策 1～5 中涉及标签、双价、MOQ 与后台英文化的部分由本 ADR 取代；proposal Q3、tasks B3/E3 的标签部分随之关闭。
