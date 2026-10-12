# LeapShop Git 提交历史

> 本文档由 `git log --all` 导出，记录仓库全部提交历史。
> 生成时间：2026-09-05
> 提交总数：**37**
> 分支：`feat/test-login-system`（当前 HEAD）、`main`、`feat/frontend-ui-beautify`
> 标签：无

---

## 一、分支概览

三个分支呈线性堆叠关系（后者基于前者继续提交）：

| 分支 | 提交数 | 分支尖端 (Tip) | 说明 |
| --- | --- | --- | --- |
| `feat/frontend-ui-beautify` | 17 | `97713cc` | 前端沙箱多方案原型与美化 |
| `main` | 32 | `5ac2884` | 主干，包含沙箱方案落地与后台功能 |
| `feat/test-login-system` | 37 | `0476933` | 当前 HEAD，多账号登录系统 + 主推款重构 + 详情页优化 |

远程分支：`origin/main`、`origin/feat/frontend-ui-beautify`、`origin/feat/test-login-system` 均已同步。

---

## 二、完整提交记录（按时间倒序）

###  `0476933` — 2026-08-18 09:49:07
- **分支引用**：`HEAD -> feat/test-login-system`, `origin/feat/test-login-system`
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 8 insertions(+), 4 deletions(-)
- **说明**：[2608180948] 修复详情页左栏滚动条颤动：槽位常驻 thin + 静止时滑块透明，仅交互时渐变显现，消除 hover 时内容区挤压跳变

###  `b8e3307` — 2026-08-18 09:32:52
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：2 files changed, 26 insertions(+), 26 deletions(-)
- **说明**：[2608180932] 详情页布局修正：右栏回退自然流，左栏保留独立滚动且滚动条仅 hover/滚动时显现；详情图恢复彼此间距、仅首张与主图无缝衔接；隐藏主图横向滚动条；主图箭头改为循环切换（单图不渲染按钮）

###  `603a459` — 2026-08-18 02:55:42
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：9 files changed, 173 insertions(+), 154 deletions(-)
- **说明**：[2608180255] 主推款自由排序重构：移除系列绑定与表单 Weight 输入，列表 ↑↓ 调序；移除 Hero 徽章，Hero 卡仅基础信息；商品名称截断 + tooltip；详情页 Product Information 支持 Markdown 渲染；详情页双栏独立滚动 + 主图详情图无缝衔接

###  `2b5043c` — 2026-08-18 02:28:06
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：8 files changed, 323 insertions(+), 132 deletions(-)
- **说明**：[2608180230] feat: hero_products 多系列主推款重构 + 前台移除登录 UI + 后台分页/筛选/↑↓ 排序

###  `711a384` — 2026-08-18 01:55:26
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：10 files changed, 753 insertions(+), 45 deletions(-)
- **说明**：[2608180155] feat: 多账号测试登录系统 + 操作审计日志 + editorOnly 权限中间件，tester 可执行 CRUD

###  `5ac2884` — 2026-08-16 13:20:41
- **分支引用**：`origin/main`, `main`
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：2 files changed, 3 insertions(+), 2 deletions(-)
- **说明**：[2608161320] Edit 点击后平滑滚动到表单可视位置替代回页顶，scroll-margin 避开 sticky 导航

###  `7b2425e` — 2026-08-16 13:08:27
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：2 files changed, 30 insertions(+), 2 deletions(-)
- **说明**：[2608161308] 后台商品面板改上下分栏，编辑模式表单切换深色主题 is-editing

###  `9833e7f` — 2026-08-16 12:55:21
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 8 insertions(+), 5 deletions(-)
- **说明**：[2608161255] 修复后台布局横向溢出：admin-content 宽度约束、grid 轨道 minmax(0,1fr)、table-wrap 收敛表格滚动

###  `1875210` — 2026-08-16 12:34:19
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：2 files changed, 191 insertions(+)
- **说明**：[2608161234] 商品详情页新增悬停放大镜与 Lightbox 全屏查看，支持键盘无障碍与移动端适配

###  `cfce190` — 2026-08-16 12:23:57
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 19 insertions(+), 9 deletions(-)
- **说明**：[2608161223] 分类页主推款置顶：hero 属于当前分类时排首位并显示 Hero 角标

###  `6750241` — 2026-08-16 12:18:36
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：8 files changed, 266 insertions(+), 37 deletions(-)
- **说明**：[2608161218] 新增主推款机制与系列排序权重：hero_product_id 设置全局唯一，首页/商品页置顶展示；sort_weight 人工排序优先；后台左侧导航 + 主推面板 + 列表双列编辑

###  `61037b2` — 2026-08-16 11:50:44
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：4 files changed, 30 insertions(+), 8 deletions(-)
- **说明**：[2608161150] 存储面板消除口径歧义：标签改为 App Data 占比，新增磁盘使用率进度条双口径分行展示

###  `f3fb361` — 2026-08-16 11:44:47
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 11 insertions(+), 2 deletions(-)
- **说明**：[2608161144] 修正存储统计商品占比口径：productBytes 仅累计商品引用的图片文件，排除轮播图/LOGO，新增 productImageBytes 字段

###  `8d31d76` — 2026-08-16 05:47:28
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：3 files changed, 27 insertions(+), 5 deletions(-)
- **说明**：[2608160547] 修复商品多图上传 413：JSON 解析限提升至 80mb，前端新增单商品图片总量 50MB 校验与提交前 payload 终检

###  `e90e629` — 2026-08-16 05:24:30
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：9 files changed, 359 insertions(+), 30 deletions(-)
- **说明**：[2608161500] 购物车导出后归零，新增空格键隐蔽后台入口与全站设置中心（settings 表 / BroadcastChannel 即时同步 / 服务器监控面板）

###  `effac49` — 2026-08-16 04:53:44
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 10 insertions(+), 6 deletions(-)
- **说明**：[2608160453] 后端：dataURL 落盘支持 svg+xml 格式，落盘失败时丢弃而非将 base64 原样写库

###  `ae8146d` — 2026-08-16 04:44:46
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：2 files changed, 2 insertions(+), 2 deletions(-)
- **说明**：[2608160444] 修复前台价格显示：money() 改用 toFixed(2)，小数价格不再重复拼接 .00

###  `65e62c2` — 2026-08-16 04:35:14
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：4 files changed, 431 insertions(+), 272 deletions(-)
- **说明**：[2608160435] 后台：隐藏入口 admin.html 改造（内置登录 + 轮播图管理 + 商品双图集/卖点编辑 + 存储统计），README 更新 API 与页面结构

###  `a0f7b09` — 2026-08-16 04:35:01
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：22 files changed, 1400 insertions(+), 1265 deletions(-)
- **说明**：[2608160435] 前台：整体替换为方案 F 八页结构并接真实 API，移除 sign-in 与旧首页逻辑，新增 store.js 数据层

###  `6bf21b8` — 2026-08-16 04:34:47
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：3 files changed, 260 insertions(+), 91 deletions(-)
- **说明**：[2608160434] 后端：新增 slides 表与轮播图 API，商品扩展 details 详情图 / info 卖点字段，种子预填方案 F 数据（16 商品 + 3 轮播图导入 uploads）

###  `97713cc` — 2026-08-16 03:44:22
- **分支引用**：`origin/feat/frontend-ui-beautify`, `feat/frontend-ui-beautify`
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：52 files changed, 2702 insertions(+), 608 deletions(-)
- **说明**：[2608160344] 沙箱新增方案 F 白底金黑轻奢多页面原型与计时器新素材，方案 A/E 落实重设计，全站美元化与英文文案

###  `43840b4` — 2026-08-15 02:02:00
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：18 files changed, 2057 insertions(+), 967 deletions(-)
- **说明**：[2608150202] 方案 B 重构为新野兽派多页架构，新增方案 D 玻璃拟态原型

###  `7711feb` — 2026-08-15 00:45:28
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：12 files changed, 1493 insertions(+), 74 deletions(-)
- **说明**：[2608150045] 沙箱重构为多方案隔离架构：方案独立子目录 + scheme.json 状态清单 + portal 动态装配

###  `6facd0a` — 2026-08-14 23:32:37
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：6 files changed, 1191 insertions(+)
- **说明**：[2608142332] 新增前端纯静态沙箱（portal / 示例原型 / mock 数据）及 C001 导航栏沙箱入口按钮

###  `392a6bf` — 2026-08-14 19:14:28
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 8 insertions(+), 4 deletions(-)
- **说明**：docs: README covers volume-based image persistence, 5MB upload limit and disk capacity stats

###  `df20433` — 2026-08-14 18:45:48
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 6 insertions(+), 5 deletions(-)
- **说明**：feat(admin): raise per-image upload size limit from 1.5MB to 5MB

###  `a498dc9` — 2026-08-14 18:41:30
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：3 files changed, 20 insertions(+), 2 deletions(-)
- **说明**：feat(stats): expose disk capacity/free via statfs to clarify occupancy vs capacity

###  `9d4d54f` — 2026-08-14 18:23:56
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 14 insertions(+)
- **说明**：chore: warn at startup when UPLOAD_DIR is not a Volume mount point

###  `8e69e7e` — 2026-08-14 18:18:47
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：5 files changed, 149 insertions(+), 13 deletions(-)
- **说明**：feat: enrich storage stats panel - image file count/size, DB overhead ratio, per-product storage details with tooltips

###  `383eca3` — 2026-08-14 17:59:00
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：3 files changed, 102 insertions(+), 10 deletions(-)
- **说明**：feat: product images stored as files on disk (UPLOAD_DIR/Volume), database keeps URL references only

###  `c9cf80a` — 2026-08-14 16:41:17
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 18 insertions(+), 5 deletions(-)
- **说明**：fix: 兼容 Zeabur 新版 POSTGRES_* 注入变量命名，修复生产环境无法切换到 PostgreSQL 的问题

###  `36b8313` — 2026-08-14 16:34:42
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：2 files changed, 10 insertions(+), 5 deletions(-)
- **说明**：feat: 支持 DATA_DIR 环境变量指定 SQLite 数据目录（适配 Zeabur Volume 持久化）

###  `fa6f296` — 2026-08-11 20:37:02
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：6 files changed, 131 insertions(+), 2 deletions(-)
- **说明**：feat: 管理后台新增存储统计面板（数据库总占用 / 商品数据占用 / 占比进度条）

###  `102f23f` — 2026-08-11 20:31:04
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：11 files changed, 844 insertions(+), 68 deletions(-)
- **说明**：feat: 商品详情页（左轮播 + 右信息）、多图上传（最多 10 张）、颜色/款式变体与图片联动

###  `2d5fcda` — 2026-08-11 20:09:41
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：24 files changed, 3005 insertions(+), 1464 deletions(-)
- **说明**：feat: 重构为 LeapChess 全栈应用（Express 后端 + JWT 认证 + 商品 CRUD + SQLite/PostgreSQL 双驱动）

###  `fee0a12` — 2026-08-10 22:05:39
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：1 file changed, 1 insertion(+)
- **说明**：chore: gitignore 中忽略本地 gh CLI 工具目录

###  `556c8fd` — 2026-08-10 21:44:28 （初始提交 / root commit）
- **作者**：失误鼠 <2398689882@qq.com>
- **变更**：9 files changed, 1503 insertions(+)
- **说明**：feat: Shututu（鼠图图）静态官网初始版本，含前端页面、Dockerfile 与 Zeabur 部署配置

---

## 三、里程碑时间线

| 阶段 | 时间 | 关键提交 | 内容 |
| --- | --- | --- | --- |
| v0 起点 | 2026-08-10 | `556c8fd` | Shututu 静态官网初始版本 |
| v2.0 全栈化 | 2026-08-11 | `2d5fcda` | 重构为 LeapChess 全栈应用（Express + JWT + 双数据库驱动） |
| 存储持久化 | 2026-08-11 ~ 08-14 | `fa6f296` / `383eca3` / `36b8313` | 存储统计面板、图片落盘 Volume、DATA_DIR 持久化 |
| Zeabur 适配 | 2026-08-14 | `c9cf80a` | 兼容 POSTGRES_* 变量命名 |
| 前端沙箱 | 2026-08-14 ~ 08-16 | `6facd0a` / `7711feb` / `43840b4` / `97713cc` | 多方案隔离沙箱原型（方案 A/B/D/E/F） |
| 方案 F 落地 | 2026-08-16 | `6bf21b8` / `a0f7b09` / `65e62c2` | 前台八页结构 + 后台管理改造 + 真实 API |
| 主推款与详情优化 | 2026-08-16 ~ 08-18 | `6750241` / `1875210` / `603a459` | 主推款机制、悬停放大镜/Lightbox、自由排序 |
| 登录系统 | 2026-08-18 | `711a384` | 多账号测试登录 + 操作审计日志 + 权限中间件 |
