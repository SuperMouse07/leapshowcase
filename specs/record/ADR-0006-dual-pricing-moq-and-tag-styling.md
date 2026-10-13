# ADR-0006 双价（划线原价）、起订量 MOQ 与标签徽标视觉收敛

状态：已被取代（2026-10-13，由 [ADR-0008](./ADR-0008-remove-pricing-moq-tags-and-admin-zh.md) 取代；原采纳日期 2026-10-12）

> **取代说明**：双价（`original_price`/`current_price`）、MOQ（`moq`）与标签徽标已整体下线，价格回归单一 `price`；决策 5 中“后台表单与提示英文化”改为后台全中文（前台访客页面仍保持英文）。下文保留为历史记录，不再代表当前契约。

## 背景

- 旧生产基线 `feat/test-login-system@0476933` 的商品仅有单一 `price`，无法表达 B2B 促销场景下的“原价 / 现价”双价展示；亦无起订量（MOQ）概念，而本站为面向俱乐部的 B2B 采购站。
- 前台标签徽标旧实现使用红（sale）/绿（new）高饱和底色，与“白 / 金 / 黑”编辑画廊主题冲突，视觉突兀。
- 前台硬编码 UI 文案存在中英混排（能力标签、审计动作标签、账号类型标签、审计 detail 模板等），需统一为英文；标签、商品名等由后台录入的内容字段保留业务语言。

## 决策

1. **双价契约**：`products` 新增 `original_price`（可空数值）与规范现价名 `current_price`；`price` 保留为旧基线别名。客户端可提交 `price` 或 `current_price`，后端归一为 `current_price`。前台在 `original_price > current_price` 时于现价旁以较小划线字渲染原价（`.price-was`），覆盖商品卡、瀑布流卡、详情页与后台列表。
2. **MOQ**：`products` 新增 `moq`（正整数，默认 1）。后台商品表单提供 “MOQ (Minimum Order Quantity)” 输入；详情页在 `moq > 1` 时展示 “Minimum order: N units”。
3. **前端归一**：`api/products.js` 的 `normalizeProduct` 统一产出 `current_price` / `original_price`（缺省 `null`）/ `moq`（缺省 1）/ `price`（= current，向后兼容），页面与卡片仅消费归一字段，旧基线缺字段时自动降级而不报错。
4. **标签徽标视觉**：语义 tone 收敛到白 / 金 / 黑色板——`sale` = ink 底 + gold-soft 字 + gold 菱形；`custom` = gold-soft 底 + ink 字；`new` = 白底 + ink 框；默认 = 白底 + line-gold 框 + ink 字。移除 `--danger` / `--success` 高饱和底色，菱形标记统一为品牌金。
5. **文案本地化**：硬编码 UI 文案统一英文（`CAPABILITIES` 标签与描述、`AUDIT_ACTIONS` 标签、`accountLabel`、审计 detail 模板、后台表单与提示）；受控标签词表与商品内容字段不翻译。

## 备选与否决

- **直接重命名 `price` → `current_price`**：否决。破坏旧基线兼容与既有数据读取路径。
- **独立折扣对象（如 `discount{type,value}`）**：否决。首版仅需展示层双价，引入计算型折扣属过度设计。
- **保留红 / 绿语义色徽标**：否决。与编辑画廊色板冲突，即本次要解决的“突兀”问题。

## 后果

- 后端需通过版本化迁移新增 `original_price` / `moq` 两列并写入正式 `openapi.yaml`（见 `specs/contracts/README.md` §4）。
- 前端在旧基线（无新字段）下自动降级：不显示划线原价、MOQ 视为 1，不产生错误。
- 徽标在图片上浮层（`.media-badges`）场景下因改为实底（白 / 金 / 黑）而获得更好可读性。
