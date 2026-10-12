# ADR-0003 · 生产基线重核与规格对齐

- **状态**：已采纳（Accepted）
- **日期**：2026-10-12
- **相关文档**：[proposal.md](../proposal.md)、[design.md](../design.md)、[tasks.md](../tasks.md)、[contracts/README.md](../contracts/README.md)

## 背景（Context）

旧版 specs 主要依据 `repowiki/` 与较早的 Git 历史整理。随后取得的 `LEAPSHOP_FINAL_ARCHITECTURE.md` 明确将旧生产基线锁定为 `feat/test-login-system@0476933`。本次又直接核验同级 `../LeapShop` 仓库，确认该分支与提交仍是 HEAD，且源码中存在旧 specs 未吸收的后期能力与缺陷。

当前 SDD 仓库本身不含运行代码，因此必须区分：旧生产基线已经实现的能力、新 B2B 站拟继承的能力，以及尚未实施的改造。

## 发现（Findings）

| 主题 | 旧 specs | `0476933` 源码事实 |
|---|---|---|
| 数据表 | 4 表 | 5 表：增加 `activity_logs` |
| 角色 | admin/customer | admin/tester/demo |
| 写权限 | adminOnly | 商品/轮播/设置由 admin 或 tester 编辑；账户/审计/存储仅 admin |
| 注册 | 公开创建 customer | 仅 admin 可创建 tester/demo |
| 主推款 | `hero_product_id` 单值 | `hero_products` 数组，最多 4 项 |
| 商品分页 | 不支持 | 支持 `limit/page`，但先全量读取再内存切片 |
| 管理能力 | 商品/轮播/设置 | 另含账户、审计日志、单商品与全局存储统计 |
| 登录形态 | 曾判定独立页已废弃 | `login.html` 仍存在，隐藏入口在未登录时跳转该页 |
| 测试基线 | 15 例冒烟可用 | 脚本仍测试已删除的 C001/customer，已失效 |

源码同时确认四项 P0 缺陷：无引用清理缺少路径边界、async 路由无统一异常处理、生产默认密钥/公开默认密码、`materializeVariiants` 拼写错误。

## 决策（Decision）

1. 旧生产实现的唯一事实基线定义为 `../LeapShop` 的 `feat/test-login-system@0476933` 源码。
2. `LEAPSHOP_FINAL_ARCHITECTURE.md` 作为该提交的架构说明；与源码冲突时源码优先。
3. `repowiki/` 与旧 ADR 中的实现描述降级为历史参考，不得单独用于判定现状。
4. proposal/design/tasks/contracts 必须明确区分“旧基线已实现”与“新站已实现”。
5. P0 安全与稳定性缺陷应作为功能开发前置门槛；是否执行仍需获得修改运行代码的授权。
6. 多语言与 B2B 询单不是旧架构已有能力，必须通过产品决策成为 C1 的明确例外后再设计。

## 影响（Consequences）

- 正面：新计划建立在可验证源码上；角色、表、API 和主推模型不再漂移；任务优先级与真实风险对齐。
- 代价：此前 design/proposal/tasks/contracts 的部分内容需要重写；repowiki 仍需后续归档或版本标记。
- 风险：若未来旧生产分支继续演进，必须更新基线提交并重新运行核验，不能自动假设本文仍然有效。
