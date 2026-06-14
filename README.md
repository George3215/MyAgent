# EvoScientist Studio / MyAgent

这是 EvoScientist Studio 的前端与桌面应用仓库。

## 仓库定位

请严格按下面的仓库分工维护，后续不要再混淆：

- 前端/App/安装包仓库：`George3215/MyAgent.git`
  - GitHub: https://github.com/George3215/MyAgent.git
  - 负责 Studio 前端界面、macOS/Windows/Linux 桌面壳、安装包、可视化交互、聊天窗口、任务看板、模型/API 配置界面、权限与安全面板。
- 后端/EvoScientist Core 仓库：`George3215/MyEvoScientist.git`
  - GitHub: https://github.com/George3215/MyEvoScientist.git
  - 负责 EvoScientist Core、科研 Agent 运行逻辑、后端科研能力、后续对原 EvoScientist 的改造与兼容。

`MyAgent` 可以内置一个本地 `studio-api` sidecar，用来启动桌面 App、暴露本机 API、调用 Claude Code、安装或启动 `MyEvoScientist`。但后端主项目源代码以 `MyEvoScientist` 为准。

默认后端仓库地址固定为：

```text
https://github.com/George3215/MyEvoScientist.git
```

## 当前能力

- 原生 macOS App 窗口，不再把用户丢到 Safari/Chrome。
- 前端聊天窗口已经接入真实后端，不是静态假 UI。
- 聊天历史持久化到本地 `chat_sessions.json`。
- 支持刷新后端状态、刷新历史、清空当前会话、清空全部会话。
- 支持在 UI 里选择 `Claude Code` 或 `EvoScientist` 运行时。
- 支持填写模型、API Base、API Key、Anthropic Base URL。
- 支持通过 Claude Code 优先安装/修复 EvoScientist Core。
- 支持 deterministic fallback 安装路径。
- `rm -rf`、`rmdir`、`del`、`Remove-Item -Recurse -Force` 等破坏性删除命令永久硬拦截，用户授权也不能覆盖。

## 实际链路

用户打开 App 后，链路是：

```text
Studio 前端
  -> 本地 studio-api sidecar
  -> Claude Code 或 EvoScientist Core
  -> 模型/API
  -> run 日志
  -> chat_sessions.json
  -> 前端聊天窗口和历史窗口回显
```

`MyAgent` 负责前端、桌面壳和本地适配层；`MyEvoScientist` 负责 EvoScientist Core。

## 本地预览

启动本地 API 和前端：

```bash
npm run api
```

静态前端预览：

```bash
npm run dev
```

独立前端连接指定后端时，可以使用：

```text
http://127.0.0.1:5173/?api=http://127.0.0.1:6527#chat
```

前端会把 `api` 参数保存到 localStorage 的 `EVOSCIENTIST_API_BASE`。

## 构建

构建静态前端：

```bash
npm run build
```

输出目录：

```text
dist/studio-ui/
```

## 打包

准备跨平台包结构：

```bash
npm run package
```

打完整 macOS 包，包含本地 `studio-api` sidecar：

```bash
npm run package:mac:full
```

生成内容包括：

- macOS `.app`、`.dmg`、`.pkg`
- Windows portable zip、PowerShell installer、Inno Setup `.iss`
- Linux AppDir、install script、`.tar.gz`

当前 macOS App 使用 `WKWebView` 加载内置前端。App 启动后会先启动本地 `studio-api`，再把真实本地 URL 加载到窗口里。

## 首次使用流程

1. 安装并打开 EvoScientist Studio。
2. Studio 检测 Claude Code。
3. 如果 Claude Code 不存在，走安装流程。
4. 用户填写 API Base、API Key、模型名和 Anthropic Base URL。
5. Studio 保存模型/API 配置到本机安全目录。
6. 用户可先测试 Claude Code 通道。
7. 用户可选择安装/修复 EvoScientist Core。
8. Studio 从 `George3215/MyEvoScientist.git` 获取后端 Core。
9. 用户在聊天窗口里发送科研任务。
10. 前端实时显示任务、日志、历史和状态。

## 后端仓库规则

安装或修复 EvoScientist Core 时，只使用：

```text
https://github.com/George3215/MyEvoScientist.git
```

不要再默认 clone 上游 `EvoScientist/EvoScientist.git`，否则后续上游变化可能导致 Studio 不兼容。

## 本地 API

`studio-api` sidecar 当前暴露：

- `GET /api/health`
- `GET /api/claude/status`
- `POST /api/claude/install`
- `GET /api/ollama/status`
- `POST /api/ollama/install`
- `POST /api/bootstrap/start`
- `GET /api/bootstrap/status`
- `GET /api/runtime`
- `POST /api/runtime`
- `POST /api/config/model`
- `GET /api/config/model`
- `GET /api/chat/state`
- `POST /api/chat/send`
- `POST /api/chat/clear`
- `POST /api/run`
- `GET /api/runs`
- `GET /api/security/policy`

这些接口是“前端和后端已经通了”的最低合同。前端不应该再使用静态假数据代替这些接口。

## 安全策略

Studio 默认永久拒绝高风险命令：

- `rm`
- `rmdir`
- `del`
- `Remove-Item`
- `sudo`
- `su`
- `dd`
- `mkfs`
- `diskutil`
- `format`
- `shutdown`
- `reboot`
- `poweroff`

策略是 hard block，用户批准也不能覆盖。

## 版本管理

- 前端/App 版本在 `package.json` 中维护。
- 后端 Core 版本以后应在 `MyEvoScientist` 中维护。
- `MyAgent` 的 tag 对应 App/安装包版本。
- `MyEvoScientist` 的 tag 对应 EvoScientist Core 后端版本。
- 发布 App 时要确保 README、默认 clone 地址、安装器、UI 文案都指向 `George3215/MyEvoScientist.git`。
