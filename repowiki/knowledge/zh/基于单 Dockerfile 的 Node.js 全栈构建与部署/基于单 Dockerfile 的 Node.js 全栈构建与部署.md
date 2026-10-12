---
kind: build_system
name: 基于单 Dockerfile 的 Node.js 全栈构建与部署
category: build_system
scope:
    - '**'
source_files:
    - Dockerfile
    - backend/package.json
    - README.md
---

## 1. 构建系统概览

本项目采用**单一 Dockerfile 将 Express 后端与静态前端打包为单个 Node.js 服务镜像**，由 Zeabur 平台通过 Git 推送自动触发构建与部署。没有 Makefile、Gradle、Webpack 等中间层工具链，构建流程极简：`node:20-alpine` 基础镜像 → `npm install --omit=dev` 安装生产依赖 → 拷贝后端代码与前端静态资源 → 启动 `server.js`。

## 2. 关键文件

- `Dockerfile`：唯一构建入口，定义多阶段复制策略（先复制 `package.json`/`package-lock.json*` 以利用 Docker 层缓存，再复制源码），设置 `NODE_ENV=production`、`PORT=8080`，并通过 HEALTHCHECK 探测 `/api/health`。
- `backend/package.json`：声明 Node 引擎版本要求 `>=18`，定义 `start`/`dev`/`seed` 三个脚本；生产依赖仅含 `express`、`jsonwebtoken`、`bcryptjs`、`cors`、`pg`、`sql.js`，无 native C++ 模块（`sql.js` 为 WASM）。
- `README.md`：文档化本地运行命令 (`cd backend && npm install && npm start`)、Zeabur 部署步骤、环境变量约定（`DATABASE_URL`、`PGHOST`、`JWT_SECRET`、`PORT`）。
- `deploy/`：目录存在但为空，当前未使用。

## 3. 架构与约定

- **单服务镜像**：Dockerfile 将 `backend/` 作为工作目录，同时将 `frontend/` 复制到上级目录，由 `server.js` 在运行时同时提供 REST API 与静态页面托管，避免前后端分离的多服务编排。
- **依赖缓存优化**：先 COPY `package.json` 和 `package-lock.json*` 并执行 `npm install --omit=dev --no-audit --no-fund`，再 COPY 完整源码，确保源码变更不破坏依赖层缓存。
- **端口与环境变量**：默认监听 `PORT`（Zeabur 注入，默认 8080），Dockerfile 中 `EXPOSE 8080` 与之保持一致；健康检查指向 `${PORT:-8080}/api/health`。
- **数据库回退策略**：检测到 `DATABASE_URL`/`PGHOST` 时使用 PostgreSQL（Zeabur 生产环境），否则自动回退到 SQLite（`sql.js`，零安装），该行为由 `db.js` 实现，构建期无需额外配置。
- **无状态文件系统**：商品图片以 base64 内嵌存储于数据库，适配 Zeabur 的无状态容器特性。

## 4. 约束与规则

- **Node 版本**：`backend/package.json` 的 `engines.node >= 18` 强制最低版本，Dockerfile 使用 `node:20-alpine` 满足该约束。
- **生产依赖最小化**：`npm install --omit=dev` 排除开发依赖，减小镜像体积。
- **Zeabur 平台约束**：
  - 应用必须监听 `PORT` 环境变量（Zeabur 注入）。
  - 内网 PostgreSQL 禁用 SSL（连接时不启用 SSL，否则会报 "The server does not support SSL connections"）。
  - 健康检查必须响应 `/api/health`，Dockerfile 已内置 HEALTHCHECK。
  - 纯 JS/WASM 依赖，构建过程不需要 C++ 工具链。
- **部署方式**：Zeabur 通过根目录 `Dockerfile` 自动识别并构建；也可选择方案 B（前后端分离双服务），此时 Root Directory 分别设为 `backend` 与 `frontend`。
- **本地开发**：无 Makefile 或 npm scripts 统一入口，需手动 `cd backend && npm install && npm start`；测试通过 PowerShell 脚本 `test-api.ps1` 与 `test-crud.js` 直接调用。

## 5. 缺失项说明

仓库中不存在 CI 配置文件（如 `.github/workflows/`）、Makefile、`build*.sh`、`package.json` 中的 `build`/`test` 脚本、以及 `deploy/` 下的部署脚本。因此本项目的构建体系完全围绕 Dockerfile + Zeabur Git 集成展开，属于最简化的云原生单镜像部署模式。