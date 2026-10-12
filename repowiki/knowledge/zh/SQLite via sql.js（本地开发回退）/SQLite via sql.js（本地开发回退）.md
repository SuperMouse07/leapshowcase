---
kind: external_dependency
name: SQLite via sql.js（本地开发回退）
slug: sqlite-sqljs
category: external_dependency
category_hints:
    - migration_status
scope:
    - '**'
---

本地开发时，若未注入数据库环境变量，后端自动使用 `sql.js`（纯 WASM，无需 C++ 工具链）作为 SQLite 引擎，实现零安装运行。该模式用于本地调试和演示，生产应切换至 PostgreSQL。