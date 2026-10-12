---
kind: logging_system
name: 基于 console.* 的轻量级进程日志输出
category: logging_system
scope:
    - '**'
source_files:
    - backend/server.js
    - backend/seed.js
    - backend/package.json
---

## 1. 使用的系统/方案

仓库未引入任何第三方日志框架（winston、pino、bunyan、morgan、log4js、debug 等均不在依赖中）。后端 `backend/package.json` 仅声明了 express、cors、bcryptjs、jsonwebtoken、pg、sql.js，无任何 logging 相关依赖。所有日志输出均直接使用 Node.js 内置的 `console.log` / `console.warn` / `console.error`，通过标准输出（stdout）由运行环境（Docker/Zeabur）收集。

## 2. 关键文件

- `backend/server.js`：服务启动与运行时日志的主要位置
- `backend/seed.js`：种子数据写入时的进度日志
- `backend/test-crud.js`：测试脚本中的断言输出

## 3. 架构与约定

### 日志级别
代码按语义区分了三种级别：
- `console.log`：正常业务信息，如 API 启动成功、测试用例通过等
- `console.warn`：非致命告警，如检测到未配置 PostgreSQL 而回退到 SQLite 时输出警告
- `console.error`：错误与异常，如启动失败、种子写入失败等

### 结构化字段
日志采用**前缀标签 + 中文消息**的简单结构，没有 JSON 结构化字段。统一使用方括号包裹的前缀标识来源模块：
- `[leapchess]`：服务端核心逻辑（server.js 中的启动、健康检查、错误捕获）
- `[seed]`：种子数据脚本（seed.js 中的用户创建、商品写入、完成/失败状态）
- 测试脚本中使用 `[PASS]` / `[FAIL]` 作为结果标记

示例：
```js
console.log(`[leapchess] API 已启动: http://localhost:${PORT} (数据库: ${usePg ? 'PostgreSQL' : 'SQLite'})`);
console.warn('[leapchess] 警告: 未检测到 DATABASE_URL/PGHOST，当前使用 SQLite 回退...');
console.error('[leapchess] 启动失败:', err);
console.log(`[seed] 用户已创建: ${u.username} (${u.role})`);
```

### 日志内容规范
- 启动阶段：输出监听端口、数据库类型（PostgreSQL 或 SQLite）
- 健康检查：`/api/health` 返回 `{ status: 'ok', db: db.type, time: new Date().toISOString() }`，时间戳使用 ISO 字符串
- 认证失败：不打印请求详情，仅返回 HTTP 401 JSON
- 数据库连接：通过 `db.type` 在健康端点暴露当前数据库类型

### 前端侧
前端（`frontend/js/*.js`）未包含任何客户端日志输出代码，仅通过 fetch 调用后端 API。

## 4. 约定与约束

- **无中间件式日志记录**：Express 应用未挂载任何请求日志中间件（如 morgan），HTTP 请求不会自动被记录，仅通过业务路由内的显式 `console.*` 输出
- **无日志级别开关**：无法通过环境变量切换日志详细程度，生产与开发共用同一套输出
- **无结构化格式**：日志为人类可读的纯文本，未输出 JSON 行，不适合直接由 ELK/Loki 等结构化日志系统解析
- **无日志轮转/持久化**：日志仅输出到 stdout，依赖容器编排层收集；本地开发时直接打印到终端
- **错误处理模式**：启动阶段的异步错误通过 `.catch((err) => { console.error(...); process.exit(1); })` 统一捕获并退出进程
- **敏感信息保护**：JWT_SECRET 等敏感配置来自环境变量，日志中仅输出端口号和数据库类型，不打印密钥或用户凭据
- **种子幂等性**：seed.js 的日志反映幂等写入过程（"用户已创建"、"商品已写入 N 条"、"完成/失败"），便于重复执行时识别状态