# ADR-0007 · Phase 2：持久化存储、安全修复与管理后台现代化

- **状态**：已采纳（Accepted）
- **日期**：2026-10-13
- **相关文档**：[proposal.md](../proposal.md)、[design.md](../design.md)、[tasks.md](../tasks.md)、[ADR-0003](./ADR-0003-production-baseline-realignment.md)

## 背景（Context）

Phase 1（v0.1–v0.3）完成了规格梳理、基线核验与产品决策。当前仓库已从纯文档仓库转变为可运行的全栈应用，通过 Zeabur 自动部署至 leapshowcase.com。服务器已挂载 `/data` 持久卷，但应用尚未配置使用该卷。同时，旧沙箱代码仍占据仓库空间，P0 安全缺陷尚未修复，管理后台缺乏视觉打磨。

## 决策（Decision）

1. **持久化存储**：Dockerfile 默认 `DATA_DIR=/data`、`UPLOAD_DIR=/data/uploads`，对齐 Zeabur Volume 挂载点。启动时验证卷可写性并在管理后台展示卷容量。
2. **种子资产迁移**：将 `frontend/sandbox/prototype-f/assets/`（11 张 PNG）移至 `backend/seed-assets/`，消除前端沙箱对运行时的唯一依赖。
3. **遗留清理**：删除整个 `frontend/sandbox/`、`tools/dev-server.mjs` 与过时顶层文档。保留 `GIT_HISTORY.md` 作历史参考。
4. **P0 安全修复优先于 UI**：先修复异步错误边界、路径遍历、变体拼写与 JWT 密钥缺陷，确保后端稳定后再做前端改进。
5. **管理后台改进范围**：限于视觉打磨（设计令牌、排版、间距）与关键 UX 修复（激活导航、样式化对话框、骨架屏），不做结构性变更（不引入路由、拖拽、批量操作）。
6. **增量交付**：每个模块独立提交、推送至 main 并在线上验证后再进入下一模块。

## 影响（Consequences）

- ✅ 正面：图片与数据库持久化在 Volume 上，重部署不丢数据；仓库精简约 150MB 无用资产；P0 缺陷修复消除已知安全风险；管理后台获得专业视觉体验。
- ⚠️ 代价：seed.js 路径变更需确保 Docker 镜像正确包含 `backend/seed-assets/`；样式令牌引入后需全局替换硬编码值。
- 关联：本 ADR 实施 proposal §4.5、design §8、tasks I1–I5 的全部内容。
