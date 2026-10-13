# 接口契约（contracts）· 旧生产基线 v0.2

> **状态**：已按 `../LeapShop@0476933` 源码重新核验。本文记录旧生产接口，不代表 B2B 新站最终契约。  
> **权威顺序**：源码 > `LEAPSHOP_FINAL_ARCHITECTURE.md` > 本清单。正式 `openapi.yaml` 在产品决策完成和 P0/P1 修复后冻结。

## 1. 通用约定

- 所有接口前缀为 `/api`，请求/响应为 JSON；错误主体统一采用 `{ "error": "..." }`。
- 受保护接口使用 `Authorization: Bearer <token>`；JWT 有效期 12 小时。
- 角色：`admin`、`tester`、`demo`；“editor”表示 admin 或 tester。
- 公开商品列表只有在传入 `limit` 时分页；未传时返回全量。

## 2. 现有 API

| 分组 | 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|---|
| 认证 | POST | `/auth/login` | 公开 | 登录并返回 `{ token, user }` |
| 认证 | GET | `/auth/me` | 登录 | 返回 Token 中的用户信息 |
| 认证 | POST | `/auth/register` | admin | 创建 tester/demo；其他角色降级为 tester |
| 认证 | PUT | `/auth/password` | 登录 | 修改本人密码 |
| 用户 | GET | `/users` | admin | 用户列表，不返回密码哈希 |
| 用户 | DELETE | `/users/:id` | admin | 删除非 admin 账户 |
| 用户 | PUT | `/users/:id/password` | admin | 重置指定用户密码 |
| 审计 | POST | `/activity` | 登录 | 上报行为日志 |
| 审计 | GET | `/activity` | admin | `limit` 默认 100、上限 500；可按 `user_id` 过滤 |
| 商品 | GET | `/products` | 公开 | 可按 `category` 过滤；可选 `limit/page` 分页 |
| 商品 | GET | `/products/:id` | 公开 | 商品详情 |
| 商品 | GET | `/products/:id/storage` | admin | 单商品图片与 JSON 存储明细 |
| 商品 | POST | `/products` | editor | 新建商品 |
| 商品 | PUT | `/products/:id` | editor | 部分更新；未提交字段保留 |
| 商品 | DELETE | `/products/:id` | editor | 删除商品、移出主推数组并清理无引用图片 |
| 轮播 | GET | `/slides` | 公开/editor | 默认仅启用项；editor 携 Token 且 `all=1` 可看全部 |
| 轮播 | POST | `/slides` | editor | 新建轮播 |
| 轮播 | PUT | `/slides/:id` | editor | 更新图片、alt、排序或启用状态 |
| 轮播 | DELETE | `/slides/:id` | editor | 删除轮播并清理无引用图片 |
| 设置 | GET | `/settings` | 公开 | 返回设置对象；`hero_products` 解析为数组 |
| 设置 | PUT | `/settings` | editor | 白名单键的单项更新 |
| 设置 | POST | `/settings/logo` | editor | 上传 LOGO 并更新 `logo_url` |
| 运维 | GET | `/stats/storage` | admin | 全局数据库、图片与 Volume 统计 |
| 健康 | GET | `/health` | 公开 | `{ status, db, time }` |

## 3. 商品分页响应

未传 `limit`：

```json
{ "products": [] }
```

传入 `limit`：

```json
{ "products": [], "total": 0, "page": 1, "limit": 25 }
```

当前实现会先查询并解析全部商品，再做内存 `slice`；P1 任务会在保持响应结构兼容的前提下改为数据库 `LIMIT/OFFSET + COUNT(*)`。

## 4. 数据模型基线（5 表）

| 表 | 关键字段 |
|---|---|
| `users` | id, username, password_hash, role(admin/tester/demo), display_name, created_at |
| `products` | id, sku, name, category, price, description, image, images, variants, details, info, stock, sort_weight, created_at, updated_at |
| `slides` | id, image, alt, sort, enabled, created_at |
| `settings` | key, value；含 site_title/logo_url/announcement/contact/hero_products |
| `activity_logs` | id, user_id, action, detail, target_type, target_id, created_at |

> **已移除的规划字段（ADR-0008）**：此前规划的 `products.tags`（商品标签数组）、`settings.product_tags`（受控标签词表）、`products.original_price`（划线原价）、`products.current_price`（现价别名）与 `products.moq`（起订量）均已取消，后端从未持久化，前端亦已删除相关输入、归一与展示逻辑。商品价格仅使用单一 `price` 字段；`POST/PUT /products` 不接受上述字段（即使提交也会被忽略），正式 `openapi.yaml` 冻结时不得包含它们。

> **新站规划：权限与审计（尚未实现，见 ADR-0005 及其后续细化）**：`users` 拟扩展账号类型（主/子账号）、权限矩阵（如 `products:write`/`slides:write`/`settings:write`）与首登强制改密标记；`activity_logs` 拟扩展 `action` 取值以覆盖登录/退出/商品增改删，记录操作时间戳与操作人用户名（会话时长由登录+退出推导；来源 IP 首版可选），查看限主账号并支持按时间/用户筛选。后台入口移除隐藏手势、仅保留直接 URL `/admin.html`，子账号管理为新增能力。以上均须通过版本化迁移引入并写入正式 `openapi.yaml`。

## 5. 已知契约风险

| 风险 | 优先级 | 处理 |
|---|---:|---|
| `PUT /products/:id` 携带 variants 会触发拼写错误 | P0 | 修复并增加接口测试 |
| async 路由异常未统一转换为 500 JSON | P0 | 增加错误边界 |
| 图片 URL 输入与清理路径缺少严格约束 | P0 | 定义并校验上传 URL 格式 |
| 注册参数可传非法角色后静默降级 tester | P1 | 正式契约需决定改为 400 还是保留兼容 |
| base64/JSON 请求体上限 80MB | P1/P2 | 决策 multipart 后更新 schema |
| 当前文档还不是机器可验证 OpenAPI | P1 | 产品决策和修复完成后生成 `openapi.yaml` |
