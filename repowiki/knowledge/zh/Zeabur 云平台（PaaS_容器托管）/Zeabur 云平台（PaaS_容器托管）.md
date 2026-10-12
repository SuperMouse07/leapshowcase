---
kind: external_dependency
name: Zeabur 云平台（PaaS/容器托管）
slug: zeabur
category: external_dependency
category_hints:
    - client_constraint
    - vendor_identity
scope:
    - '**'
---

本项目为 Zeabur 平台定制适配：
- Dockerfile 暴露 `PORT=8080`，与 Zeabur Git 服务默认端口一致；HEALTHCHECK 探测 `/api/health` 供平台探针使用。
- 数据库通过 Zeabur 注入的 `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` 环境变量连接内网 PostgreSQL；因内网 PG 不支持 SSL，db.js 在检测到这些变量时强制关闭 SSL 连接，避免 "The server does not support SSL connections" 错误。
- 推荐方案 A 为单服务镜像 + Zeabur PostgreSQL 服务；方案 B 支持前后端分离双服务（前端走 Static Hosting）。
- 生产环境要求无状态文件系统，因此商品图片以 base64 内嵌数据库存储而非落盘。