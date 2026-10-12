---
kind: error_handling
name: Express 单体后端：基于状态码与统一错误字段的轻量错误处理
category: error_handling
scope:
    - '**'
source_files:
    - backend/server.js
    - backend/db.js
    - frontend/js/api.js
    - frontend/js/auth.js
    - frontend/js/admin.js
---

## 1. 整体方案
该仓库是一个 Express + 原生前端（HTML/CSS/JS）的单体应用，错误处理采用最简约定：后端不定义自定义 Error 类、无全局错误中间件，所有 HTTP 响应在路由内直接通过 res.status(code).json({ error: '...' }) 返回；数据库层对内部不一致状态使用 throw new Error(...)；前端通过统一的 api() 封装将非 2xx 响应转换为 Error，并读取后端返回的 data.error 字段作为用户可见的错误消息。

## 2. 关键文件与位置
- backend/server.js：全部路由、认证/管理员权限中间件、健康检查、静态资源托管；集中体现错误返回约定。
- backend/db.js：SQLite / PostgreSQL 双实现抽象层；对“未先 connect()”抛错，并在启动时 catch 失败退出。
- frontend/js/api.js：前端统一 fetch 封装，自动带 Token、探测后端地址、把后端 {error} 转为 Error。
- frontend/js/auth.js、admin.js、main.js：调用 api() 并通过 try/catch 展示错误提示。

## 3. 架构与约定
### 3.1 后端 HTTP 错误约定
- 400 参数校验失败：登录缺少用户名/密码、新增产品缺少 name 等，返回 { error: '...' }。
- 401 未认证/会话过期：authRequired 中间件在缺少 token 或 JWT 验证失败时返回 401。
- 403 权限不足：adminOnly 中间件在非 admin 角色访问管理接口时返回 403。
- 404 资源不存在：查询不到 product 时返回 404。
- 成功响应：200/201 正常 JSON 体。
所有业务错误均遵循同一结构：{ error: string }，没有区分错误码枚举或嵌套结构。

### 3.2 认证与权限错误流
authRequired 中间件在缺少 token 时返回 401；JWT 验证失败走 catch 分支返回 401，避免抛出未捕获异常。adminOnly 中间件在非 admin 角色时返回 403。

### 3.3 数据库层错误
db.query / db.run 在未调用 connect() 时主动 throw new Error('数据库尚未连接，请先 await connect()')，属于编程错误保护。SQLite 路径中 stmt.free() 放在 finally 块确保语句释放。启动阶段 (async () => {...})().catch((err) => { console.error(...); process.exit(1); }) 捕获初始化失败并终止进程。

### 3.4 前端错误处理
api() 统一封装：fetch 后若 !res.ok，则 throw new Error(data.error || `Request failed (${res.status})`)，把后端 {error} 透传给调用方。调用方用 try/catch 捕获并显示 toast/alert。本地存储读写（getUser）用 try/catch 包裹 JSON.parse，防止脏数据导致崩溃。网络不可达时通过 /api/health 探测失败回退到 localhost:3000。

## 4. 约束与规则
- HTTP 错误必须通过 res.status(code).json({ error: '...' }) 返回，不要在路由中 throw 业务错误。
- 认证失败统一返回 401，无论缺 token 还是 token 过期，由 authRequired 中间件兜底。
- 管理员接口必须经过 authRequired + adminOnly 两个中间件，否则无法写入。
- 数据库访问前必须先 await connect()，否则 db.query/run 会抛错——这是 db.js 的强制契约。
- 前端所有 API 调用必须走 api()，以保证自动携带 Bearer Token 和统一错误转换。
- 仓库中没有全局错误中间件、没有自定义错误类、没有错误码常量表；错误信息以硬编码字符串形式散布在各路由中。

## 5. 观察到的缺口
- 未捕获的异步异常（如 db.query 抛出的 SQL 错误）不会被任何中间件捕获，Express 默认会返回 500 且不带结构化 body。
- 没有统一的日志记录，仅通过 console.warn/console.log/console.error 输出。
- 前端错误提示样式依赖外部 CSS，api.js 本身只负责抛出错误，具体 UI 反馈分散在各自页面脚本中。