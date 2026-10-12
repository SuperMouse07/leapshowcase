---
kind: design
name: 轮播图独立为 slides 表并通过 /api/slides 管理
source: session
category: adr
---

# 轮播图独立为 slides 表并通过 /api/slides 管理

_来源：effac49 → 8d31d76 提交周期内记录的编码计划——内容为规划时意图，实现可能滞后或有出入。_

**状态：** accepted

## 背景
原 `images` 字段混用主图与轮播图集，难以支持独立的排序、启用/停用控制与后台编辑。

## 决策驱动
- 轮播图需要独立的 sort/enabled 生命周期
- 后台需提供增删改排序能力
- 与商品主图解耦，避免误删

## 备选方案
- **在 products.images 中扩展轮播标记** _（已否决）_ — 优点：无需新表；缺点：语义混杂；排序/启用状态无处安放；清理逻辑复杂
- **新建 slides 表并提供 RESTful CRUD** — 优点：清晰独立；公开 GET 仅返回 enabled；admin-only 写操作；可单独统计引用；缺点：多一张表、多一组路由

## 决策
新增 `slides` 表（`id/image/alt/sort/enabled/created_at`），提供 `GET/POST/PUT/DELETE /api/slides`；公开接口按 sort 升序仅返回 enabled 条目，管理员 token 下 `?all=1` 返回全部；`removeUnreferenced` 同时扫描 products 与 slides 两表释放文件。

## 影响
轮播图与商品解耦，可在不修改商品的情况下独立运营首页 banner；但需确保 CDN/存储层对 `/uploads/` 路径做缓存策略。