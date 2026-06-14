# 前端信息接口适配层

EvoScientist Studio 的前端分成两类区域：

- 稳定 UI 区域：聊天窗口、输入框、发送按钮、运行时选择器、历史会话、主导航、危险命令策略。这些区域不应该被临时修改。
- 可变信息区域：额度、实验进度、任务状态、运行分布、模型状态、后端状态、未来的数据可视化指标。这些区域可以通过信息适配层接入新的接口。

## 可修改文件

后续如果 Claude Code 需要临时改前端的信息接口，优先只修改：

```text
apps/studio-ui/src/info-adapter.js
```

这个文件包含：

- `infoEndpoints`：前端读取信息时使用的 endpoint 表。
- `normalizeInfoSnapshot()`：把后端返回值转换成前端统一可读的 snapshot。
- `normalizeQuota()`：额度接口字段映射。
- `normalizeAnalytics()`：数据可视化字段映射。
- `normalizeExperiments()`：实验列表字段映射。

如果某个接口暂时没有数据，adapter 必须返回 `null`、空数组或错误信息。UI 会显示 `--` 或 `暂未接收`，不要写入模拟数据。

## 不要修改的区域

除非明确做 UI 重构，不要为了接入信息接口修改这些位置：

```text
apps/studio-ui/src/main.js chatView()
apps/studio-ui/src/main.js composer submit handler
apps/studio-ui/src/main.js /api/chat/send 调用
apps/studio-ui/src/styles.css chat/composer 布局尺寸
apps/studio-api/studio_api.py destructive command policy
```

原因：

- 聊天窗口和输入框是产品的核心交互面，位置和行为必须稳定。
- `/api/chat/send` 是真实前后端互通链路，不能因为看板接口变化被破坏。
- 删除类危险命令硬拦截策略必须始终保留，不能被用户授权覆盖。

## 接入新接口的方式

例如后端新增了额度接口：

```js
export const infoEndpoints = {
  ...,
  quota: "/api/quota",
};
```

如果返回字段是：

```json
{
  "balance": 1024,
  "used_today": 18,
  "plan_name": "Pro"
}
```

则只需要在 `normalizeQuota()` 中确认字段映射存在：

```js
remaining: firstValue(payload.remaining, payload.remaining_credits, payload.credits, payload.balance),
todayCost: firstValue(payload.today_cost, payload.todayCost, payload.daily_usage, payload.used_today),
planName: firstValue(payload.plan, payload.plan_name, payload.tier, payload.package),
```

前端的额度卡片会自动显示真实值。没有真实值时继续显示 `--`。

## 接入实验和数据可视化

实验列表可以通过 `experiments` endpoint 接入：

```js
experiments: "/api/experiments"
```

支持两种返回：

```json
[{ "title": "实验 A", "status": "running" }]
```

或：

```json
{ "experiments": [{ "title": "实验 A", "status": "running" }] }
```

数据可视化可以通过 `analytics` endpoint 接入：

```js
analytics: "/api/analytics"
```

当前标准字段包括：

- `pushSuccessRate`
- `experimentScore`
- `failureReasons`

字段名不一致时，只改 `normalizeAnalytics()`。

## 验证要求

修改 adapter 后至少运行：

```bash
npm run check
npm run build
node --check apps/studio-ui/src/main.js
node --check apps/studio-ui/src/info-adapter.js
```

如果修改了后端，再运行：

```bash
python3.13 -m py_compile apps/studio-api/studio_api.py
```

## 安全要求

- 不要记录 API key 原文。
- 不要在 UI 中展示完整 token。
- 不要给 `rm`、`rmdir`、`del`、`Remove-Item`、`sudo`、`dd` 等危险命令开例外。
- 信息接口失败时显示 `--` 或 `暂未接收`，不要造假数据。
