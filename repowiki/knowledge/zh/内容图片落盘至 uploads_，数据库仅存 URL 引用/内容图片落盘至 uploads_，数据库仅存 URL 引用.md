---
kind: design
name: 内容图片落盘至 uploads/，数据库仅存 URL 引用
source: session
category: adr
---

# 内容图片落盘至 uploads/，数据库仅存 URL 引用

_来源：effac49 → 8d31d76 提交周期内记录的编码计划——内容为规划时意图，实现可能滞后或有出入。_

**状态：** accepted

## 背景
种子脚本需要从 `frontend/sandbox/prototype-f/assets/` 导入 hero、timer-main、timer-detail 等图片到生产环境，且需幂等处理重复文件。

## 决策驱动
- 图片作为二进制资源不应入 DB
- 基于 sha1 内容哈希的文件去重保证幂等
- URL 集中由后端生成便于后续迁移到对象存储

## 备选方案
- **将图片以 base64 存入 JSON 字段** _（已否决）_ — 优点：单表自包含；缺点：DB 膨胀；无法利用浏览器/CDN 缓存；迁移困难
- **文件落盘到 `UPLOAD_DIR`，DB 存 `/uploads/<sha1>` 路径** — 优点：天然去重；可被 Nginx/CDN 直接服务；清理时按引用计数释放；缺点：需维护文件与 DB 的一致性

## 决策
通过 `seed.js` 中的幂等导入函数读取原型 assets，按现有 sha1 机制复制进 `backend/uploads/`，返回 `/uploads/...` URL 写入 `products.images`、`products.details`、`slides.image`；`productUploadUrls` 与 `removeUnreferenced` 同步纳入 `details` 字段。

## 影响
后续如需迁移到 S3/OSS，只需替换上传与 URL 生成逻辑，DB schema 无需变动；但需确保 `uploads/` 目录有备份与访问控制。