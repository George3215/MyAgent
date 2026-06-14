# Studio API Sidecar

`studio_api.py` 是 `MyAgent` 前端/App 仓库里的本地 sidecar，不是后端主仓库。

## 仓库分工

- 前端/App/安装包仓库：`George3215/MyAgent.git`
- 后端/EvoScientist Core 仓库：`George3215/MyEvoScientist.git`

本 sidecar 的作用是让桌面 App 能在本机启动、配置和调用后端能力。真正的 EvoScientist Core 以后以 `MyEvoScientist` 为准。

## 职责

- 从一个本地端口服务 Studio 前端。
- 暴露 `/api/*` 接口给前端调用。
- 检测、安装和调用 Claude Code。
- 保存模型/API 配置。
- 从 `https://github.com/George3215/MyEvoScientist.git` clone 或修复 EvoScientist Core。
- 启动 Claude Code 或 EvoScientist Core 真实任务。
- 持久化、刷新和清空聊天历史。
- 硬拦截破坏性删除命令。

## 设计说明

当前实现只使用 Python 标准库，目的是方便打包进桌面安装包。后续可以替换为 FastAPI，但必须保持现有 API 合同兼容。

默认后端 Core 仓库地址：

```text
https://github.com/George3215/MyEvoScientist.git
```

不要把默认后端地址改回上游 `EvoScientist/EvoScientist.git`。
