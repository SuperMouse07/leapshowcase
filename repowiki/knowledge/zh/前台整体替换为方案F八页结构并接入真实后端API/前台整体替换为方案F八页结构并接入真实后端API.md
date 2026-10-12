---
kind: design
name: 前台整体替换为方案F八页结构并接入真实后端API
source: session
category: adr
---

# 前台整体替换为方案F八页结构并接入真实后端API

_来源：effac49 → 8d31d76 提交周期内记录的编码计划——内容为规划时意图，实现可能滞后或有出入。_

**状态：** accepted

## 背景
项目从原型阶段进入正式化，需要以 `frontend/sandbox/prototype-f/` 的八页结构（index/products/chess-clock/chess-board/stopwatch/lifestyle/product/journey）替换旧的前台页面，并移除所有 sign-in、注册入口与 mock 数据。

## 决策驱动
- 统一视觉与交互规范（方案F）
- 前后端解耦，前端仅消费 `/api/products` 与 `/api/slides`
- 去登录化：全站不暴露任何管理员入口

## 备选方案
- **保留旧前台 + 渐进式改造** _（已否决）_ — 优点：改动小、风险低；缺点：两套页面并存维护成本高；无法实现方案F的完整体验
- **整体替换为方案F八页结构，删除旧页面与 auth 逻辑** — 优点：一次性对齐设计稿；前端只依赖后端 API；无登录入口降低攻击面；缺点：破坏性变更，需同步更新后台与文档

## 决策
以 `frontend/sandbox/prototype-f/` 的八页 HTML + `css/style.css` 整体替换前台，删除 `login.html`、`product.html`、`js/main.js`、`js/auth.js`；新增 `frontend/js/store.js` 暴露 `window.Store` 统一调用 `/api/products`、`/api/slides`，所有图片 URL 指向服务器 `/uploads/`。

## 影响
前台成为纯静态站点 + 轻量脚本，不再持有业务状态；后续新增页面只需复用 `store.js` 与 `style.css`。若未来引入 SSR/构建工具，`store.js` 可作为迁移起点。