---
kind: dependency_management
name: Node.js 依赖管理（npm + lockfile + Docker 构建缓存）
category: dependency_management
scope:
    - '**'
source_files:
    - backend/package.json
    - backend/package-lock.json
    - Dockerfile
    - .dockerignore
    - .gitignore
---

## 1. 使用的系统与工具

本项目采用 **Node.js** 生态，使用 **npm** 作为包管理器。后端位于 `backend/` 目录，通过 `package.json` 声明运行时依赖，并通过 `package-lock.json` 锁定版本；前端为纯静态 HTML/CSS/JS，无独立依赖清单。

容器化构建使用官方 `node:20-alpine` 镜像，在 Dockerfile 中执行 `npm install --omit=dev --no-audit --no-fund` 安装生产依赖。

## 2. 关键文件

- `backend/package.json`：唯一依赖声明入口，定义名称、版本、脚本、`engines.node >= 18` 运行环境约束，以及 5 个运行时依赖（`express`、`cors`、`bcryptjs`、`jsonwebtoken`、`pg`、`sql.js`）。
- `backend/package-lock.json`：由 npm 生成的锁文件，确保构建可重现；Dockerfile 显式 COPY 该文件以利用 Docker 层缓存。
- `Dockerfile`：构建阶段仅复制 `package.json` 与 `package-lock.json*` 后执行 `npm install`，再复制源码，从而将依赖安装层与应用代码层分离，提升增量构建效率。
- `.dockerignore` / `.gitignore`：排除 `node_modules` 等无关目录，避免污染镜像与仓库。

## 3. 架构与约定

- **单一依赖边界**：只有 `backend/` 存在 Node 依赖；`frontend/` 是纯静态资源，不引入任何前端包管理器（无 `package.json`），所有前端逻辑通过原生 JS 调用后端 REST API。
- **语义化版本范围**：所有依赖均使用 `^` 前缀的 caret range（如 `"express": "^4.21.2"`），允许 npm 安装兼容的小版本更新，同时由 `package-lock.json` 锁定实际解析版本。
- **引擎约束**：通过 `engines.node >= 18` 声明最低 Node 版本要求，与 Dockerfile 中 `FROM node:20-alpine` 保持一致。
- **生产构建裁剪**：Docker 构建使用 `--omit=dev` 跳过开发依赖，`--no-audit` 与 `--no-fund` 关闭网络检查以提升构建速度。
- **单服务部署模式**：Dockerfile 将后端与前端静态资源一起打包进一个 Node 进程，对外统一暴露端口（默认 8080），由 Zeabur 平台注入 `PORT` 环境变量。

## 4. 约定与约束

- **禁止手动编辑 lockfile**：应通过 `npm install` / `npm update` 让 npm 维护 `package-lock.json`，以保证多环境一致性（Docker 构建依赖其存在）。
- **新增依赖必须写入 `backend/package.json`**：由于前端无依赖管理，所有第三方库必须添加到后端依赖区，并在提交前运行 `npm install` 生成最新 lockfile。
- **Node 版本锁定**：运行环境受 `engines.node >= 18` 与 Dockerfile 中 `node:20-alpine` 双重约束，升级 Node 需同步修改两处。
- **私有仓库/代理**：当前未发现 `.npmrc`、`.npmrc` 或私有 registry 配置，依赖全部来自公共 npm registry。
- **安全审计**：构建时显式禁用 `--audit`，本地开发可通过 `npm audit` 自行检查，但 CI/构建流程未强制审计步骤。
- **依赖最小化**：仅保留运行时必需依赖，无 devDependencies 出现在最终镜像中（`--omit=dev`）。