const state = {
  view: "chat",
  quota: 8640,
  todayCost: 126,
  runCost: 18,
  progress: 72,
  running: true,
  apiOnline: false,
  backend: null,
  bootstrap: { status: "unknown", phase: "offline" },
  claude: { status: "unknown", phase: "offline" },
  ollama: { status: "unknown", phase: "offline", launch_claude: false },
  runtime: { active_runtime: "claude_code" },
  modelConfig: { configured: false },
  runs: [],
  chatSessions: [],
  activeChatId: "",
  collapsed: {
    sidebar: false,
    inspector: false,
    history: false,
    backend: false,
    sessionLog: false,
  },
};

const API_BASE = resolveApiBase();

const pageMeta = {
  chat: ["Neural Workbench", "科研工作台"],
  experiments: ["Experiment Board", "实验看板"],
  install: ["Installer / Model IO", "安装与模型"],
  permissions: ["Security Gate", "安全授权"],
  analytics: ["Research Analytics", "数据可视化"],
  artifacts: ["Artifacts", "产物"],
  memory: ["Persistent Memory", "记忆"],
  settings: ["Model and API", "模型与接口"],
};

function resolveApiBase() {
  const fallback = location.protocol === "file:" ? "http://127.0.0.1:6287" : "";
  try {
    const params = new URLSearchParams(location.search);
    const queryApi = params.get("api") || params.get("api_base");
    if (queryApi) {
      const normalized = queryApi.trim().replace(/\/+$/, "");
      localStorage.setItem("EVOSCIENTIST_API_BASE", normalized);
      return normalized;
    }
    const stored = localStorage.getItem("EVOSCIENTIST_API_BASE");
    return stored ? stored.replace(/\/+$/, "") : fallback;
  } catch {
    return fallback;
  }
}

function apiBaseLabel() {
  return API_BASE || "same-origin";
}

const tasks = [
  { label: "保留 EvoScientist upstream 运行时", status: "done" },
  { label: "接入 Claude Code + Ollama 代理", status: "done" },
  { label: "加入删除类命令硬拦截", status: "done" },
  { label: "生成安装引导和授权中心", status: "done" },
  { label: "保证 Claude Code 开箱即用", status: "active" },
  { label: "EvoScientist 作为可选高级安装", status: "todo" },
];

const events = [
  { t: "now", title: "runtime", body: "Claude Code 优先通过 Ollama launch 运行，降低地区限制风险" },
  { t: "now", title: "security", body: "rm -rf、rmdir、del、Remove-Item 等破坏性删除永久拒绝" },
  { t: "00:18", title: "permission", body: "已加入自动化科研授权边界" },
  { t: "00:15", title: "installer", body: "新增 git clone 与依赖安装引导" },
  { t: "00:11", title: "planner-agent", body: "已生成 Studio 三端打包路线" },
  { t: "00:07", title: "usage", body: "deepseek-v4-flash · 18 credits" },
];

const installSteps = [
  ["启动 Studio", "内置前端和本地 sidecar", "ready"],
  ["安装 Claude Code", "缺失时调用官方安装器", "ready"],
  ["配置 Ollama 通道", "接国产/本地模型", "ready"],
  ["填写国产/API 模型", "默认 Ollama 兼容接口", "next"],
  ["测试 Claude Code", "从 UI 发起任务", "pending"],
  ["可选 EvoScientist", "高级科研流再安装", "pending"],
];

const permissions = [
  ["项目安装", "允许软件 git clone EvoScientist 并创建独立运行目录", "必须", true],
  ["Claude Code 安装代理", "允许 Studio 安装/检测 Claude Code，并通过 Ollama 执行 EvoScientist 安装计划", "必须", true],
  ["Ollama 模型通道", "允许 Studio 检测/安装 Ollama，并把 Claude Code 模型请求指向国产或本地模型", "必须", true],
  ["依赖安装", "允许创建虚拟环境、安装 Python 包、记录安装日志", "必须", true],
  ["模型调用", "允许通过你的托管网关或用户 API key 调用模型", "必须", true],
  ["文件读写", "允许在用户选择的工作区生成实验产物和报告", "必须", true],
  ["命令安全闸门", "rm -rf、rmdir、del、Remove-Item 等破坏性删除永不放行，用户批准也不能覆盖", "硬拦截", true],
  ["数据可视化", "允许汇总成功率、实验效果、用量和错误类型", "建议", true],
  ["自动更新", "允许检查 Studio 和兼容层更新，不自动覆盖原项目", "可选", false],
];

const metricCards = [
  ["推送成功率", "94.2%", "+3.1%"],
  ["实验有效率", "68.5%", "+8.4%"],
  ["平均成本", "18 credits", "-11%"],
  ["恢复成功", "31/32", "checkpoint"],
];

const chartRows = [
  ["文献检索", 96],
  ["代码生成", 88],
  ["实验复现", 72],
  ["报告产出", 91],
  ["数据图表", 84],
];

const experiments = [
  {
    status: "Idea",
    items: [
      ["自有模型网关", "用户免 token，按套餐扣额度", "商业版"],
      ["知识库模板市场", "把科研 skill 打包出售", "增长"],
    ],
  },
  {
    status: "Planned",
    items: [
      ["三端安装器", "Windows 先行，macOS/Linux 复用核心", "MVP"],
      ["授权中心", "自动化操作必须可审计、可撤销", "安全"],
    ],
  },
  {
    status: "Running",
    items: [
      ["Studio 前端原型", "聊天、任务、额度、实验同时展示", "72%"],
      ["EvoScientist 兼容层", "保留原项目，新增本地 API 适配器", "设计中"],
    ],
  },
  {
    status: "Verified",
    items: [["会话恢复方案", "checkpoint + run_events + experiment", "通过"]],
  },
];

const artifacts = [
  ["产品需求文档", "Markdown", "outputs/EvoScientist_Studio_产品需求文档.md"],
  ["Studio UI 架构", "Docs", "docs/ARCHITECTURE.md"],
  ["兼容层说明", "Docs", "docs/EVOSCIENTIST_COMPATIBILITY.md"],
  ["授权与安装流程", "Docs", "docs/ONBOARDING_AND_AUTHORIZATION.md"],
  ["API schema", "JSON", "packages/contracts/studio-api.schema.json"],
  ["macOS 静态构建", "Build", "dist/studio-ui"],
];

const memories = [
  ["用户偏好", "普通用户双击即用，不使用终端聊天。"],
  ["商业约束", "产品方统一购买 token，客户端优先连接托管接口。"],
  ["兼容原则", "原版 EvoScientist 保留为 core runtime，Studio 只做壳、API 和可视化。"],
  ["授权原则", "自动化科研前必须展示权限，用户批准后才允许安装、读写和调用模型。"],
];

const models = [
  ["Claude Code + Ollama", "kimi-k2.5:cloud", "推荐", "Claude Code 通过 Ollama launch 使用国产/本地模型，降低地区限制。"],
  ["国产云模型", "glm-5:cloud", "Cloud", "适合不想折腾本地显卡的用户，通过 Ollama 统一入口调用。"],
  ["本地模型", "qwen3.5", "离线", "适合低成本实验，速度和质量由本机决定。"],
];

const viewHost = document.querySelector("#viewHost");
const viewTitle = document.querySelector("#viewTitle");
const viewKicker = document.querySelector("#viewKicker");
const appShell = document.querySelector("#app");
const toggleSidebarButton = document.querySelector("#toggleSidebar");
const toggleInspectorButton = document.querySelector("#toggleInspector");

function h(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function renderTasks() {
  const host = document.querySelector("#taskSteps");
  host.replaceChildren();
  tasks.forEach((task) => {
    const item = h("li", `step ${task.status}`);
    const mark = h("span", "step-mark");
    const text = h("span", "", task.label);
    item.append(mark, text);
    host.append(item);
  });
}

function renderTimeline(extra) {
  const host = document.querySelector("#timeline");
  host.replaceChildren();
  const list = extra ? [extra, ...events] : events;
  list.forEach((event) => {
    const item = h("div", "timeline-item");
    item.append(h("span", "timeline-time", event.t));
    const body = h("div");
    body.append(h("strong", "", event.title), h("p", "", event.body));
    item.append(body);
    host.append(item);
  });
}

function updateNumbers() {
  document.querySelector("#quotaRemain").textContent = state.quota.toLocaleString();
  document.querySelector("#todayCost").textContent = state.todayCost.toString();
  document.querySelector("#runCost").textContent = state.runCost.toString();
  document.querySelector("#quotaMeter").style.width = `${Math.min(92, 100 - state.quota / 120)}%`;
  document.querySelector("#experimentMeter").style.width = `${state.progress}%`;
}

function applyLayoutState() {
  appShell?.classList.toggle("sidebar-collapsed", state.collapsed.sidebar);
  appShell?.classList.toggle("inspector-collapsed", state.collapsed.inspector);
  if (toggleSidebarButton) {
    toggleSidebarButton.textContent = state.collapsed.sidebar ? "导航" : "侧栏";
    toggleSidebarButton.title = state.collapsed.sidebar ? "展开左侧导航" : "折叠左侧导航";
    toggleSidebarButton.setAttribute("aria-expanded", String(!state.collapsed.sidebar));
  }
  if (toggleInspectorButton) {
    toggleInspectorButton.textContent = state.collapsed.inspector ? "状态" : "状态";
    toggleInspectorButton.title = state.collapsed.inspector ? "展开右侧状态栏" : "折叠右侧状态栏";
    toggleInspectorButton.setAttribute("aria-expanded", String(!state.collapsed.inspector));
  }
}

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return response.json();
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `${path} ${response.status}`);
  return data;
}

async function refreshBackendState({ silent = false } = {}) {
  try {
    const data = await apiGet("/api/health");
    state.apiOnline = true;
    state.backend = data;
    state.bootstrap = data.bootstrap || state.bootstrap;
    state.claude = data.claude || state.claude;
    state.ollama = data.ollama || state.ollama;
    state.runtime = data.runtime || state.runtime;
    state.modelConfig = data.model || state.modelConfig;
    const runData = await apiGet("/api/runs");
    state.runs = Array.isArray(runData.runs) ? runData.runs : [];
    const chatData = await apiGet("/api/chat/state");
    applyChatState(chatData);
    renderTimeline({
      t: "now",
      title: "studio-api",
      body: `后端已连接 · Claude ${state.claude.status || "unknown"} · Ollama ${state.ollama.status || "unknown"} · runtime ${state.runtime.active_runtime || "evoscientist"}`,
    });
  } catch (error) {
    state.apiOnline = false;
    if (!silent) {
      renderTimeline({ t: "now", title: "studio-api", body: `后端未连接：${error.message}` });
    }
  }
  updateBackendBadges();
  renderSidebarSessions();
  if (["install", "settings", "chat", "permissions"].includes(state.view)) {
    renderView(state.view);
  }
}

function applyChatState(chatData) {
  state.chatSessions = Array.isArray(chatData?.sessions) ? chatData.sessions : [];
  if (state.activeChatId && !state.chatSessions.some((session) => session.id === state.activeChatId)) {
    state.activeChatId = state.chatSessions[0]?.id || "";
  }
  if (!state.activeChatId && state.chatSessions.length) {
    state.activeChatId = state.chatSessions[0].id;
  }
}

function updateBackendBadges() {
  const coreBadge = document.querySelector("#coreStateBadge");
  if (coreBadge) {
    coreBadge.textContent = state.apiOnline ? state.bootstrap.status || "online" : "离线";
    coreBadge.classList.toggle("active", state.apiOnline && state.bootstrap.status === "installed");
  }
  const taskState = document.querySelector("#taskState");
  if (taskState) {
    taskState.textContent = state.apiOnline ? "已连接" : "等待后端";
    taskState.classList.toggle("active", state.apiOnline);
  }
}

async function refreshChatState({ notify = false } = {}) {
  try {
    const chatData = await apiGet("/api/chat/state");
    applyChatState(chatData);
    renderSidebarSessions();
    if (state.view === "chat") renderView("chat");
    if (notify) {
      renderTimeline({ t: "now", title: "chat history", body: `已刷新 ${state.chatSessions.length} 个会话` });
    }
  } catch (error) {
    renderTimeline({ t: "now", title: "chat history", body: error.message });
  }
}

function activeChatSession() {
  if (!state.activeChatId) return null;
  return state.chatSessions.find((session) => session.id === state.activeChatId) || null;
}

function renderSidebarSessions() {
  const host = document.querySelector("#sessionList");
  if (!host) return;
  const sessions = state.chatSessions.slice(0, 5);
  host.innerHTML = `
    <div class="section-heading">最近会话</div>
    ${sessions.length ? sessions.map((session) => `
      <button class="session-item ${session.id === state.activeChatId ? "selected" : ""}" data-chat-session-id="${escapeHtml(session.id)}" type="button">
        <span class="status-dot ${chatSessionStatusClass(session)}"></span>
        <span>
          <strong>${escapeHtml(session.title || "科研会话")}</strong>
          <small>${escapeHtml(session.updated_at || session.created_at || "")}</small>
        </span>
      </button>
    `).join("") : `
      <button class="session-item selected" type="button">
        <span class="status-dot paused"></span>
        <span><strong>暂无历史</strong><small>发送第一条消息后生成</small></span>
      </button>
    `}
  `;
}

function chatSessionStatusClass(session) {
  const messages = Array.isArray(session.messages) ? session.messages : [];
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  if (!lastAssistant) return "paused";
  if (lastAssistant.status === "running") return "running";
  if (lastAssistant.status === "done") return "done";
  if (lastAssistant.status === "failed") return "failed";
  return "paused";
}

function displayValue(value, fallback = "未配置") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function statusTone(status) {
  const value = String(status || "").toLowerCase();
  if (["installed", "ready", "online", "ok", "done", "active"].includes(value)) return "ok";
  if (["installing", "queued", "running", "waiting", "pending", "auth_required", "stale"].includes(value)) return "warn";
  if (["error", "failed", "offline", "not_installed", "blocked"].includes(value)) return "danger";
  return "neutral";
}

function statusToken(label, status) {
  const safeLabel = escapeHtml(label);
  const safeStatus = escapeHtml(displayValue(status, "unknown"));
  return `<span class="status-token ${statusTone(status)}" title="${safeLabel}: ${safeStatus}"><b>${safeLabel}</b><span>${safeStatus}</span></span>`;
}

function serviceCard({ title, status, meta, rows, tone }) {
  return `
    <article class="service-card ${tone || statusTone(status)}">
      <div class="service-card-head">
        <strong>${escapeHtml(title)}</strong>
        ${statusToken("status", status)}
      </div>
      ${meta ? `<p>${escapeHtml(meta)}</p>` : ""}
      <div class="service-rows">
        ${rows.map(([label, value]) => `
          <div class="service-row">
            <span>${escapeHtml(label)}</span>
            <strong title="${escapeHtml(displayValue(value))}">${escapeHtml(displayValue(value))}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function backendConsole({ compact = false, collapsible = false, collapsed = false } = {}) {
  const claude = state.claude || {};
  const ollama = state.ollama || {};
  const core = state.bootstrap || {};
  const runtime = state.runtime || {};
  const model = state.modelConfig || {};
  const security = state.backend?.security || {};
  const neverAllow = Array.isArray(security.never_allow) ? security.never_allow : [];
  const recentRuns = Array.isArray(state.runs) ? state.runs.slice(0, 3) : [];
  const wrap = h("section", `backend-console wide-panel ${compact ? "compact" : ""} ${collapsed ? "collapsed" : ""}`);
  const toggleButton = collapsible
    ? `<button class="icon-button inline-toggle" id="toggleBackendPanel" type="button" title="${collapsed ? "展开后端状态" : "折叠后端状态"}">${collapsed ? "展开" : "折叠"}</button>`
    : "";
  wrap.innerHTML = `
    <div class="panel-header">
      <h2>Claude Code / EvoScientist 后端</h2>
      <div class="panel-actions">
        <span class="panel-badge ${state.apiOnline ? "active" : ""}">${state.apiOnline ? "studio-api online" : "studio-api offline"}</span>
        ${toggleButton}
      </div>
    </div>
    ${collapsed ? `
      <div class="collapsed-summary">
        ${statusToken("api", apiBaseLabel())}
        ${statusToken("runtime", runtime.active_runtime || "claude_code")}
        ${statusToken("model", model.model || "kimi-k2.5:cloud")}
      </div>
    ` : `
    <div class="runtime-strip">
      ${statusToken("api", apiBaseLabel())}
      ${statusToken("runtime", runtime.active_runtime || "claude_code")}
      ${statusToken("strategy", runtime.bootstrap_strategy || "claude_code_first")}
      ${statusToken("model", model.model || "kimi-k2.5:cloud")}
      ${statusToken("key", model.api_key_set ? "saved" : "not saved")}
    </div>
    <div class="service-grid">
      ${serviceCard({
        title: "Claude Code",
        status: claude.phase === "auth_required" ? "auth_required" : claude.status || "unknown",
        meta: "负责首装、修复、代码科研任务和 EvoScientist 高级安装代理。",
        rows: [
          ["阶段", claude.phase],
          ["登录", claude.authenticated ? "authenticated" : "not logged in"],
          ["认证方式", claude.auth_method || claude.api_provider],
          ["版本", claude.version || claude.phase],
          ["路径", claude.path],
          ["日志", claude.log],
        ],
      })}
      ${serviceCard({
        title: "Ollama 通道",
        status: ollama.status || "unknown",
        meta: "用于把 Claude Code 模型请求接到国产/本地模型，降低地区限制风险。",
        rows: [
          ["API Base", ollama.base_url || model.api_base || "http://localhost:11434"],
          ["launch claude", ollama.launch_claude ? "ready" : "not ready"],
          ["日志", ollama.log],
        ],
      })}
      ${serviceCard({
        title: "EvoScientist Core",
        status: core.status || "unknown",
        meta: "保留 upstream 项目，Studio 通过本地 adapter/API 管理安装和运行。",
        rows: [
          ["阶段", core.phase],
          ["Core 目录", core.core_dir],
          ["日志", core.log],
        ],
      })}
      ${serviceCard({
        title: "安全闸门",
        status: security.mode || "hard_block_destructive_commands",
        tone: "danger",
        meta: "删除类和系统级危险命令永久拒绝，授权也不能覆盖。",
        rows: [
          ["Shell", security.shell_execution || "blocked"],
          ["可覆盖", security.user_approval_can_override === false ? "false" : displayValue(security.user_approval_can_override, "false")],
          ["禁止", neverAllow.slice(0, 8).join(", ") || "rm, sudo, dd, chmod"],
        ],
      })}
    </div>
    <div class="run-feed">
      <div class="run-feed-head">
        <strong>最近真实任务</strong>
        <span>${recentRuns.length ? `${recentRuns.length} runs` : "no runs yet"}</span>
      </div>
      <div class="run-list">
        ${recentRuns.length ? recentRuns.map((run) => `
          <div class="run-item ${statusTone(run.status)}">
            <span>${escapeHtml(run.runtime || "runtime")}</span>
            <strong>${escapeHtml(run.status || "unknown")}</strong>
            <em>${escapeHtml(run.exit_code === undefined ? run.run_id || "" : `exit ${run.exit_code}`)}</em>
            <small title="${escapeHtml(run.error || run.prompt || "")}">${escapeHtml(run.error || run.prompt || "")}</small>
          </div>
        `).join("") : `<div class="run-empty">等待 UI 发起 Claude Code 或 EvoScientist 任务。</div>`}
      </div>
    </div>
    <div class="backend-flow">
      <div class="flow-step"><strong>UI</strong><span>聊天 / 安装 / 设置</span></div>
      <div class="flow-arrow">→</div>
      <div class="flow-step"><strong>studio-api</strong><span>/api/run /api/bootstrap /api/config</span></div>
      <div class="flow-arrow">→</div>
      <div class="flow-step"><strong>Runtime</strong><span>Claude Code 或 EvoScientist</span></div>
      <div class="flow-arrow">→</div>
      <div class="flow-step"><strong>Output</strong><span>日志、实验进度、产物、记忆</span></div>
    </div>
    `}
  `;
  return wrap;
}

function chatView() {
  const wrap = h("div", `chat-layout ${state.collapsed.history ? "history-collapsed" : ""}`);
  const session = activeChatSession();
  const messages = Array.isArray(session?.messages) ? session.messages : [];
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const runtime = state.runtime?.active_runtime || "claude_code";

  const history = h("aside", `conversation-history ${state.collapsed.history ? "collapsed" : ""}`);
  history.innerHTML = state.collapsed.history ? `
    <div class="history-rail">
      <button class="rail-button" id="toggleHistory" type="button" title="展开会话历史">历史</button>
      <button class="rail-button" id="newChat" type="button" title="新建会话">+</button>
    </div>
  ` : `
    <div class="history-head">
      <strong>会话历史</strong>
      <div class="history-head-actions">
        <button class="icon-button inline-toggle" id="toggleHistory" type="button" title="折叠会话历史">折叠</button>
        <button class="icon-button" id="newChat" type="button" title="新建会话">+</button>
      </div>
    </div>
    <div class="history-list">
      ${state.chatSessions.length ? state.chatSessions.map((item) => `
        <button class="history-item ${item.id === state.activeChatId ? "selected" : ""}" data-chat-session-id="${escapeHtml(item.id)}" type="button">
          <strong>${escapeHtml(item.title || "科研会话")}</strong>
          <span>${escapeHtml(item.updated_at || item.created_at || "")}</span>
        </button>
      `).join("") : `<div class="history-empty">暂无历史。发送第一条消息后会自动保存。</div>`}
    </div>
    <div class="history-actions">
      <button class="primary-button small secondary" id="refreshChatHistory" type="button">刷新历史</button>
      <button class="primary-button small ghost" id="clearChatMessages" type="button" ${session ? "" : "disabled"}>清空当前</button>
      <button class="primary-button small ghost" id="clearAllChatHistory" type="button" ${state.chatSessions.length ? "" : "disabled"}>清空全部</button>
    </div>
  `;

  const main = h("section", `chat-main ${state.collapsed.sessionLog ? "log-collapsed" : ""}`);
  const chat = h("section", "chat-feed");
  chat.innerHTML = messages.length ? messages.map(chatMessageHtml).join("") : `
    <div class="message assistant">
      <div class="message-meta">EvoScientist Studio · ready</div>
      <p>这里现在是真实对话窗口。发送消息后，Studio 会调用本地 studio-api，启动 Claude Code 或 EvoScientist Core，并把 run 结果写入历史。</p>
      <div class="tool-strip">
        <button title="后端状态" type="button">API ${state.apiOnline ? "ONLINE" : "OFFLINE"}</button>
        <button title="Claude Code" type="button">CLAUDE ${state.claude.phase || state.claude.status || "UNKNOWN"}</button>
        <button title="安装状态" type="button">CORE ${state.bootstrap.status || "UNKNOWN"}</button>
      </div>
    </div>
  `;

  chat.append(backendConsole({ compact: true, collapsible: true, collapsed: state.collapsed.backend }));

  const composer = h("form", "composer");
  composer.innerHTML = `
    <select id="chatRuntime" aria-label="runtime">
      <option value="claude_code" ${runtime === "claude_code" ? "selected" : ""}>Claude Code</option>
      <option value="evoscientist" ${runtime === "evoscientist" ? "selected" : ""}>EvoScientist</option>
    </select>
    <input aria-label="message" placeholder="输入科研任务、实验假设或文件分析需求" />
    <button class="primary-button small" type="submit">发送</button>
  `;
  composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = composer.querySelector("input");
    const runtimeSelect = composer.querySelector("#chatRuntime");
    const prompt = input.value.trim();
    if (!prompt) return;
    const sendButton = composer.querySelector("button");
    sendButton.disabled = true;
    sendButton.textContent = "运行中";
    try {
      const response = await apiPost("/api/chat/send", {
        session_id: state.activeChatId,
        runtime: runtimeSelect.value,
        prompt,
        timeout_seconds: runtimeSelect.value === "claude_code" ? 90 : 180,
      });
      state.activeChatId = response.session?.id || state.activeChatId;
      applyChatState(response.chat || {});
      state.runtime = { ...(state.runtime || {}), active_runtime: runtimeSelect.value };
      if (response.error) {
        renderTimeline({ t: "now", title: "chat error", body: response.error });
      } else {
        renderTimeline({ t: "now", title: "chat run", body: `已启动真实任务：${response.run?.run_id || "unknown"}` });
      }
      renderSidebarSessions();
      renderView("chat");
      pollChatRun(response.run?.run_id);
    } catch (error) {
      renderTimeline({ t: "now", title: "chat error", body: error.message });
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = "发送";
    }
    input.value = "";
  });

  const lower = h("section", `artifact-dock ${state.collapsed.sessionLog ? "collapsed" : ""}`);
  lower.innerHTML = `
    <div class="dock-header">
      <strong>当前会话日志</strong>
      <div class="dock-actions">
        <span>${escapeHtml(session?.title || "新会话")}</span>
        <button class="icon-button inline-toggle" id="toggleSessionLog" type="button" title="${state.collapsed.sessionLog ? "展开当前日志" : "折叠当前日志"}">${state.collapsed.sessionLog ? "展开" : "折叠"}</button>
      </div>
    </div>
    ${state.collapsed.sessionLog ? "" : latestAssistant ? `
      <div class="artifact-row"><span>Runtime</span><small>${escapeHtml(latestAssistant.runtime || "unknown")}</small></div>
      <div class="artifact-row"><span>Status</span><small>${escapeHtml(latestAssistant.status || "unknown")}</small></div>
      <div class="artifact-row"><span>Run ID</span><small>${escapeHtml(latestAssistant.run_id || "")}</small></div>
      <pre class="log-preview">${escapeHtml(latestAssistant.content || "")}</pre>
    ` : `<div class="history-empty">还没有真实 run。发送消息后这里会显示模型输出和错误日志。</div>`}
  `;

  main.append(chat, composer, lower);
  wrap.append(history, main);
  return wrap;
}

function chatMessageHtml(message) {
  const role = message.role === "user" ? "user" : "assistant";
  const label = role === "user" ? "你" : `${message.runtime || "Studio"} · ${message.status || "message"}`;
  return `
    <div class="message ${role}">
      <div class="message-meta">${escapeHtml(label)}</div>
      <p>${formatMessageContent(message.content || "")}</p>
      ${message.run_id ? `<div class="message-run">${escapeHtml(message.run_id)}</div>` : ""}
    </div>
  `;
}

function formatMessageContent(value) {
  return escapeHtml(String(value || "")).replace(/\n/g, "<br>");
}

function pollChatRun(runId) {
  if (!runId) return;
  const timer = setInterval(async () => {
    try {
      await refreshChatState();
      const session = activeChatSession();
      const messages = Array.isArray(session?.messages) ? session.messages : [];
      const message = messages.find((item) => item.run_id === runId);
      if (message && message.status !== "running") {
        clearInterval(timer);
      }
    } catch (error) {
      clearInterval(timer);
      renderTimeline({ t: "now", title: "chat poll", body: error.message });
    }
  }, 1800);
}

function selectOption(value, label, current) {
  const selected = value === current ? " selected" : "";
  return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
}

function modelConfigPanel() {
  const panel = h("section", "settings-panel cyber-config");
  const config = state.modelConfig || {};
  const mode = config.mode || "local_model";
  const provider = config.provider || "ollama";
  const transport = config.claude_transport || "ollama";
  const anthropicBase =
    config.anthropic_base_url ||
    (provider === "deepseek"
      ? `${(config.api_base || "https://api.deepseek.com").replace(/\/+$/, "")}/anthropic`
      : "");
  panel.innerHTML = `
    <div class="panel-header">
      <h2>模型 / API 接入</h2>
      <span class="panel-badge active">MODEL IO</span>
    </div>
    <div class="config-grid">
      <label><span>模式</span><select id="configMode">${[
        ["local_model", "local_model"],
        ["byok", "byok"],
        ["managed_gateway", "managed_gateway"],
      ].map(([value, label]) => selectOption(value, label, mode)).join("")}</select></label>
      <label><span>Provider</span><select id="configProvider">${[
        ["ollama", "ollama"],
        ["deepseek", "deepseek"],
        ["custom-openai", "custom-openai"],
      ].map(([value, label]) => selectOption(value, label, provider)).join("")}</select></label>
      <label><span>Claude 通道</span><select id="configClaudeTransport">${[
        ["ollama", "ollama launch claude"],
        ["direct", "direct claude"],
      ].map(([value, label]) => selectOption(value, label, transport)).join("")}</select></label>
      <label><span>API Base</span><input id="configApiBase" value="${escapeHtml(config.api_base || "http://localhost:11434")}" /></label>
      <label><span>Claude Anthropic Base</span><input id="configAnthropicBase" value="${escapeHtml(anthropicBase)}" placeholder="DeepSeek: https://api.deepseek.com/anthropic" /></label>
      <label><span>API Key / Token</span><input id="configApiKey" value="" placeholder="${config.api_key_set ? "已保存，留空则不覆盖" : "Ollama 可填 ollama，云模型填 token"}" /></label>
      <label><span>Claude 模型</span><input id="configModel" value="${escapeHtml(config.model || "kimi-k2.5:cloud")}" /></label>
    </div>
    <div class="model-grid compact">
      ${models.map(([name, id, tag, body], index) => `
        <label class="model-card ${index === 0 ? "selected" : ""}">
          <input type="radio" name="model" ${index === 0 ? "checked" : ""} />
          <strong>${name}</strong>
          <span>${id}</span>
          <p>${body}</p>
          <em>${tag}</em>
        </label>
      `).join("")}
    </div>
    <div class="action-row">
      <button class="primary-button small" id="saveModelConfig" type="button">保存并连接</button>
      <span class="status-copy">模型配置会写入 studio-api，并供 Claude Code / EvoScientist 共用。</span>
    </div>
  `;
  return panel;
}

function experimentsView() {
  const board = h("div", "kanban");
  experiments.forEach((column) => {
    const col = h("section", "kanban-column");
    col.append(h("h2", "", column.status));
    column.items.forEach(([title, desc, tag]) => {
      const card = h("article", "experiment-card");
      card.innerHTML = `<div class="experiment-title">${title}</div><p>${desc}</p><span class="experiment-tag">${tag}</span>`;
      col.append(card);
    });
    board.append(col);
  });
  return board;
}

function installView() {
  const wrap = h("div", "page-grid");
  const status = state.bootstrap || {};
  const claude = state.claude || {};
  const ollama = state.ollama || {};
  const claudeButtonText = !state.apiOnline
    ? "等待 studio-api 启动"
    : claude.status === "installed"
      ? "Claude Code 已安装"
      : claude.status === "installing"
        ? "Claude Code 安装中..."
        : "安装 Claude Code";
  const ollamaButtonText = !state.apiOnline
    ? "等待 studio-api 启动"
    : ollama.status === "installed"
      ? "Ollama 已安装"
      : ollama.status === "installing"
        ? "Ollama 安装中..."
        : "安装 Ollama";
  const overview = h("section", "wide-panel");
  overview.innerHTML = `
    <div class="panel-header">
      <h2>一键安装流程</h2>
      <span class="panel-badge active">${state.apiOnline ? status.status || "online" : "api offline"}</span>
    </div>
    <div class="install-flow">
      ${installSteps.map(([title, body, status], index) => `
        <div class="setup-step ${status}">
          <span>${index + 1}</span>
          <div><strong>${title}</strong><p>${body}</p></div>
        </div>
      `).join("")}
    </div>
    <div class="split-grid">
      <div class="info-block">
        <strong>Claude Code</strong>
        <p>${claude.status || "unknown"} · ${claude.version || claude.phase || "waiting"}${claude.path ? ` · ${claude.path}` : ""}</p>
      </div>
      <div class="info-block">
        <strong>Ollama</strong>
        <p>${ollama.status || "unknown"} · ${ollama.version || ollama.phase || "waiting"} · launch claude: ${ollama.launch_claude ? "ready" : "not checked"}</p>
      </div>
      <div class="info-block">
        <strong>EvoScientist Core</strong>
        <p>${status.status || "unknown"} · ${status.phase || "waiting"}${status.core_dir ? ` · ${status.core_dir}` : ""}</p>
      </div>
    </div>
    <div class="action-row">
      <button class="primary-button small" id="installClaude" type="button" ${claude.status === "installed" || !state.apiOnline ? "disabled" : ""}>${claudeButtonText}</button>
      <button class="primary-button small" id="testClaudeRuntime" type="button">测试 Claude Code</button>
      <button class="icon-button wide" id="installOllama" type="button" title="${ollamaButtonText}" ${ollama.status === "installed" || !state.apiOnline ? "disabled" : ""}>OL</button>
      <span class="status-copy">首装目标：Claude Code 可从 UI 运行 · ${status.phase || "offline"}</span>
    </div>
    <details class="advanced-actions">
      <summary>高级 EvoScientist 安装</summary>
      <div class="action-row">
        <button class="primary-button small secondary" id="startBootstrap" type="button">Claude Code 安装 EvoScientist</button>
        <button class="primary-button small ghost" id="startDeterministicBootstrap" type="button">内置安装器 fallback</button>
      </div>
    </details>
  `;

  const core = h("section", "wide-panel");
  core.innerHTML = `
    <div class="panel-header">
      <h2>EvoScientist 兼容策略</h2>
      <span class="panel-badge">upstream preserved</span>
    </div>
    <div class="split-grid">
      <div class="info-block">
        <strong>Claude Code First</strong>
        <p>首装成功标准是 Claude Code 能从 UI 运行。这样跨电脑安装风险最低，EvoScientist 不阻塞第一次打开软件。</p>
      </div>
      <div class="info-block">
        <strong>Optional EvoScientist</strong>
        <p>需要 EvoScientist 专用科研流时，再让 Claude Code 安装、修复和诊断 EvoScientist。失败也不影响 Claude Code 工作台。</p>
      </div>
    </div>
    <div class="code-row">
      <span class="code-pill">ollama launch claude --model kimi-k2.5:cloud</span>
      <span class="code-pill">runtime: Claude Code</span>
      <span class="code-pill">optional: install EvoScientist</span>
    </div>
  `;

  const guide = h("section", "wide-panel");
  guide.innerHTML = `
    <div class="panel-header">
      <h2>新用户引导</h2>
      <span class="panel-badge">first run</span>
    </div>
    <div class="checklist-grid">
      <label><input type="checkbox" checked /> 选择安装目录和项目工作区</label>
      <label><input type="checkbox" checked /> 安装或检测 Claude Code</label>
      <label><input type="checkbox" checked /> 填写 Claude / DeepSeek / 本地模型 API 配置</label>
      <label><input type="checkbox" /> 测试 Claude Code UI 任务</label>
      <label><input type="checkbox" /> 保存配置到系统密钥库</label>
      <label><input type="checkbox" /> 高级：安装 EvoScientist</label>
    </div>
  `;

  wrap.append(overview, modelConfigPanel(), backendConsole(), core, guide);
  return wrap;
}

function permissionsView() {
  const wrap = h("div", "permission-grid");
  permissions.forEach(([title, body, level, enabled]) => {
    const card = h("article", "permission-card");
    card.innerHTML = `
      <div class="permission-top">
        <div><strong>${title}</strong><p>${body}</p></div>
        <button class="toggle-switch ${enabled ? "on" : ""}" aria-label="${title}"></button>
      </div>
      <span class="permission-level">${level}</span>
    `;
    wrap.append(card);
  });
  const audit = h("section", "wide-panel permission-audit");
  audit.innerHTML = `
    <div class="panel-header">
      <h2>授权后记录</h2>
      <span class="panel-badge active">audit log</span>
    </div>
    <div class="table-head compact"><span>动作</span><span>范围</span><span>状态</span></div>
    <div class="table-row compact"><span>git clone</span><span>安装目录</span><span>待批准</span></div>
    <div class="table-row compact"><span>model call</span><span>托管网关</span><span>已限制额度</span></div>
    <div class="table-row compact"><span>workspace write</span><span>用户选择目录</span><span>可撤销</span></div>
    <div class="table-row compact"><span>rm -rf / 删除类命令</span><span>全部目录</span><span>永久拒绝</span></div>
  `;
  wrap.append(audit);
  return wrap;
}

function analyticsView() {
  const wrap = h("div", "analytics-layout");
  const stats = h("section", "stat-grid");
  metricCards.forEach(([label, value, note]) => {
    const card = h("article", "stat-card");
    card.innerHTML = `<span>${label}</span><strong>${value}</strong><small>${note}</small>`;
    stats.append(card);
  });

  const chart = h("section", "wide-panel");
  chart.innerHTML = `
    <div class="panel-header">
      <h2>自动化科研效果</h2>
      <span class="panel-badge">last 30 runs</span>
    </div>
    <div class="bar-chart">
      ${chartRows.map(([label, value]) => `
        <div class="bar-row">
          <span>${label}</span>
          <div class="bar-track"><i style="width:${value}%"></i></div>
          <strong>${value}%</strong>
        </div>
      `).join("")}
    </div>
  `;

  const detail = h("section", "wide-panel");
  detail.innerHTML = `
    <div class="panel-header">
      <h2>后续可视化指标</h2>
      <span class="panel-badge">roadmap</span>
    </div>
    <div class="split-grid">
      <div class="info-block"><strong>推送成功率</strong><p>统计论文、代码、报告、图表等产物的生成与推送结果。</p></div>
      <div class="info-block"><strong>实验效果</strong><p>记录每次实验假设、变量、结果、评价分数和复现实验状态。</p></div>
      <div class="info-block"><strong>成本曲线</strong><p>按模型、任务、用户、项目拆分 token 或 credits 消耗。</p></div>
      <div class="info-block"><strong>失败原因</strong><p>聚合 API 错误、依赖安装失败、权限拒绝和代码执行失败。</p></div>
    </div>
  `;

  wrap.append(stats, chart, detail);
  return wrap;
}

function artifactsView() {
  const grid = h("div", "table-view");
  grid.innerHTML = `<div class="table-head"><span>名称</span><span>类型</span><span>路径</span></div>`;
  artifacts.forEach((row) => {
    const item = h("div", "table-row");
    item.innerHTML = `<span>${row[0]}</span><span>${row[1]}</span><span>${row[2]}</span>`;
    grid.append(item);
  });
  return grid;
}

function memoryView() {
  const grid = h("div", "memory-grid");
  memories.forEach(([title, body]) => {
    const card = h("article", "memory-card");
    card.innerHTML = `<strong>${title}</strong><p>${body}</p><button title="审核记忆">审核</button>`;
    grid.append(card);
  });
  return grid;
}

function settingsView() {
  const wrap = h("div", "settings-layout");
  const runtimePanel = h("section", "wide-panel");
  const activeRuntime = state.runtime.active_runtime || "evoscientist";
  runtimePanel.innerHTML = `
    <div class="panel-header">
      <h2>科研运行时</h2>
      <span class="panel-badge active">${activeRuntime}</span>
    </div>
    <div class="model-grid">
      <label class="model-card ${activeRuntime === "claude_code" ? "selected" : ""}">
        <input type="radio" name="runtimeMode" value="claude_code" ${activeRuntime === "claude_code" ? "checked" : ""} />
        <strong>Claude Code + Ollama 科研</strong>
        <span>Claude ${state.claude.status || "unknown"} · Ollama ${state.ollama.status || "unknown"}</span>
        <p>适合安装、修复、代码科研、复杂工程任务和多步自动化。模型调用优先通过 Ollama，便于接国产/本地模型。</p>
        <em>ollama launch</em>
      </label>
      <label class="model-card ${activeRuntime === "evoscientist" ? "selected" : ""}">
        <input type="radio" name="runtimeMode" value="evoscientist" ${activeRuntime === "evoscientist" ? "checked" : ""} />
        <strong>EvoScientist 科研</strong>
        <span>${state.bootstrap.status || "unknown"} · ${state.bootstrap.phase || "waiting"}</span>
        <p>适合沿用 EvoScientist 原生科研工作流、checkpoint 和后续 run events 可视化。Studio 保留 upstream，不改原项目。</p>
        <em>core runtime</em>
      </label>
    </div>
    <div class="action-row">
      <button class="primary-button small" id="saveRuntime" type="button">保存运行时选择</button>
      <span class="status-copy">可以在 Claude Code 和 EvoScientist 之间切换</span>
    </div>
  `;

  const modelPanel = h("section", "wide-panel");
  modelPanel.innerHTML = `
    <div class="panel-header">
      <h2>模型选择</h2>
      <span class="panel-badge active">visual config</span>
    </div>
    <div class="model-grid">
      ${models.map(([name, id, tag, body], index) => `
        <label class="model-card ${index === 0 ? "selected" : ""}">
          <input type="radio" name="model" ${index === 0 ? "checked" : ""} />
          <strong>${name}</strong>
          <span>${id}</span>
          <p>${body}</p>
          <em>${tag}</em>
        </label>
      `).join("")}
    </div>
  `;

  const apiPanel = modelConfigPanel();

  const backendPanel = h("section", "wide-panel");
  backendPanel.innerHTML = `
    <div class="panel-header">
      <h2>后端接入</h2>
      <span class="panel-badge active">local api</span>
    </div>
    <div class="split-grid">
      <div class="info-block"><strong>Claude Code</strong><p>${state.claude.path || "等待安装"} · ${state.claude.version || state.claude.phase || "not checked"}</p></div>
      <div class="info-block"><strong>Ollama</strong><p>${state.ollama.path || "等待安装"} · launch claude: ${state.ollama.launch_claude ? "ready" : "not ready"}</p></div>
      <div class="info-block"><strong>模型通道</strong><p>默认通过 Ollama Anthropic-compatible API，让 Claude Code 使用国产或本地模型。</p></div>
      <div class="info-block"><strong>实验数据</strong><p>实验假设、变量、结果、评分和产物路径统一进入 analytics snapshot。</p></div>
    </div>
  `;

  wrap.append(runtimePanel, modelPanel, apiPanel, backendPanel);
  return wrap;
}

function renderView(view) {
  const views = {
    chat: chatView,
    experiments: experimentsView,
    install: installView,
    permissions: permissionsView,
    analytics: analyticsView,
    artifacts: artifactsView,
    memory: memoryView,
    settings: settingsView,
  };
  const nextView = views[view] ? view : "chat";
  state.view = nextView;
  const [kicker, title] = pageMeta[nextView] || pageMeta.chat;
  viewKicker.textContent = kicker;
  viewTitle.textContent = title;
  viewHost.replaceChildren(views[nextView]());
  applyLayoutState();
}

function activateNav(view) {
  const nextView = pageMeta[view] ? view : "chat";
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === nextView);
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

document.querySelector("#navList").addEventListener("click", (event) => {
  const button = event.target.closest(".nav-item");
  if (!button) return;
  const nextView = button.dataset.view;
  activateNav(nextView);
  renderView(nextView);
  location.hash = nextView;
});

document.querySelector("#sessionList")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-session-id]");
  if (!button) return;
  state.activeChatId = button.dataset.chatSessionId;
  activateNav("chat");
  renderView("chat");
  location.hash = "chat";
});

window.addEventListener("hashchange", () => {
  const nextView = location.hash.replace("#", "");
  activateNav(nextView);
  renderView(nextView);
});

viewHost.addEventListener("click", async (event) => {
  const historyButton = event.target.closest("[data-chat-session-id]");
  if (historyButton) {
    state.activeChatId = historyButton.dataset.chatSessionId;
    activateNav("chat");
    renderSidebarSessions();
    renderView("chat");
    location.hash = "chat";
    return;
  }

  const toggleHistoryButton = event.target.closest("#toggleHistory");
  if (toggleHistoryButton) {
    state.collapsed.history = !state.collapsed.history;
    renderView("chat");
    return;
  }

  const toggleBackendButton = event.target.closest("#toggleBackendPanel");
  if (toggleBackendButton) {
    state.collapsed.backend = !state.collapsed.backend;
    renderView("chat");
    return;
  }

  const toggleSessionLogButton = event.target.closest("#toggleSessionLog");
  if (toggleSessionLogButton) {
    state.collapsed.sessionLog = !state.collapsed.sessionLog;
    renderView("chat");
    return;
  }

  const newChatButton = event.target.closest("#newChat");
  if (newChatButton) {
    state.activeChatId = "";
    renderSidebarSessions();
    renderView("chat");
    return;
  }

  const refreshChatButton = event.target.closest("#refreshChatHistory");
  if (refreshChatButton) {
    refreshChatButton.disabled = true;
    refreshChatButton.textContent = "刷新中";
    try {
      await refreshChatState({ notify: true });
    } finally {
      refreshChatButton.disabled = false;
      refreshChatButton.textContent = "刷新历史";
    }
    return;
  }

  const clearChatButton = event.target.closest("#clearChatMessages");
  if (clearChatButton) {
    const session = activeChatSession();
    if (!session) return;
    clearChatButton.disabled = true;
    clearChatButton.textContent = "清空中";
    try {
      const response = await apiPost("/api/chat/clear", {
        scope: "session",
        session_id: session.id,
      });
      applyChatState(response.chat || {});
      renderSidebarSessions();
      renderView("chat");
      renderTimeline({ t: "now", title: "chat history", body: `已清空当前会话：${session.title || session.id}` });
    } catch (error) {
      renderTimeline({ t: "now", title: "clear chat error", body: error.message });
    }
    return;
  }

  const clearAllChatButton = event.target.closest("#clearAllChatHistory");
  if (clearAllChatButton) {
    clearAllChatButton.disabled = true;
    clearAllChatButton.textContent = "清空中";
    try {
      const response = await apiPost("/api/chat/clear", { scope: "all" });
      state.activeChatId = "";
      applyChatState(response.chat || {});
      renderSidebarSessions();
      renderView("chat");
      renderTimeline({ t: "now", title: "chat history", body: "已清空全部会话历史" });
    } catch (error) {
      renderTimeline({ t: "now", title: "clear chat error", body: error.message });
    }
    return;
  }

  const claudeButton = event.target.closest("#installClaude");
  if (claudeButton) {
    claudeButton.disabled = true;
    claudeButton.textContent = "正在安装 Claude Code...";
    try {
      state.claude = await apiPost("/api/claude/install", {});
      renderTimeline({ t: "now", title: "claude code", body: "已启动 Claude Code 官方安装器" });
      pollClaude();
    } catch (error) {
      renderTimeline({ t: "now", title: "claude install error", body: error.message });
    } finally {
      renderView("install");
    }
    return;
  }

  const ollamaButton = event.target.closest("#installOllama");
  if (ollamaButton) {
    ollamaButton.disabled = true;
    ollamaButton.textContent = "正在安装 Ollama...";
    try {
      state.ollama = await apiPost("/api/ollama/install", {});
      renderTimeline({ t: "now", title: "ollama", body: "已启动 Ollama 官方安装器" });
      pollOllama();
    } catch (error) {
      renderTimeline({ t: "now", title: "ollama install error", body: error.message });
    } finally {
      renderView("install");
    }
    return;
  }

  const testClaudeButton = event.target.closest("#testClaudeRuntime");
  if (testClaudeButton) {
    testClaudeButton.disabled = true;
    testClaudeButton.textContent = "正在测试...";
    try {
      const record = await apiPost("/api/run", {
        runtime: "claude_code",
        prompt: "用一句中文回复：EvoScientist Studio Claude Code 通道已连接。",
      });
      state.runtime = { ...(state.runtime || {}), active_runtime: "claude_code" };
      renderTimeline({ t: "now", title: "claude test", body: `已从 UI 启动 Claude Code 测试任务 · ${record.run_id}` });
    } catch (error) {
      renderTimeline({ t: "now", title: "claude test error", body: error.message });
    } finally {
      renderView("install");
    }
    return;
  }

  const bootstrapButton = event.target.closest("#startBootstrap");
  if (bootstrapButton) {
    bootstrapButton.disabled = true;
    bootstrapButton.textContent = "正在启动 Claude 安装代理...";
    try {
      state.bootstrap = await apiPost("/api/bootstrap/start", {
        repo_url: "https://github.com/George3215/MyEvoScientist.git",
        install: true,
        strategy: "claude_code_first",
      });
      renderTimeline({ t: "now", title: "bootstrap", body: "已启动 Claude Code 安装代理，开始安装/修复 EvoScientist" });
      pollBootstrap();
    } catch (error) {
      renderTimeline({ t: "now", title: "bootstrap error", body: error.message });
    } finally {
      renderView("install");
    }
    return;
  }

  const deterministicButton = event.target.closest("#startDeterministicBootstrap");
  if (deterministicButton) {
    deterministicButton.disabled = true;
    try {
      state.bootstrap = await apiPost("/api/bootstrap/start", {
        repo_url: "https://github.com/George3215/MyEvoScientist.git",
        install: true,
        strategy: "deterministic",
      });
      renderTimeline({ t: "now", title: "bootstrap", body: "已启动 Studio 内置安装器作为 fallback" });
      pollBootstrap();
    } catch (error) {
      renderTimeline({ t: "now", title: "bootstrap error", body: error.message });
    } finally {
      renderView("install");
    }
    return;
  }

  const runtimeButton = event.target.closest("#saveRuntime");
  if (runtimeButton) {
    runtimeButton.disabled = true;
    runtimeButton.textContent = "保存中...";
    try {
      const runtime = document.querySelector("input[name='runtimeMode']:checked")?.value || "evoscientist";
      state.runtime = await apiPost("/api/runtime", { runtime });
      renderTimeline({ t: "now", title: "runtime", body: `已切换科研运行时：${state.runtime.active_runtime}` });
    } catch (error) {
      renderTimeline({ t: "now", title: "runtime error", body: error.message });
    } finally {
      renderView("settings");
    }
    return;
  }

  const saveButton = event.target.closest("#saveModelConfig");
  if (saveButton) {
    const returnView = state.view;
    saveButton.disabled = true;
    saveButton.textContent = "保存中...";
    try {
      state.modelConfig = await apiPost("/api/config/model", {
        mode: document.querySelector("#configMode")?.value,
        provider: document.querySelector("#configProvider")?.value,
        claude_transport: document.querySelector("#configClaudeTransport")?.value,
        api_base: document.querySelector("#configApiBase")?.value,
        anthropic_base_url: document.querySelector("#configAnthropicBase")?.value,
        api_key: document.querySelector("#configApiKey")?.value,
        model: document.querySelector("#configModel")?.value,
      });
      renderTimeline({ t: "now", title: "model config", body: "模型/API 配置已写入 studio-api 和 EvoScientist 配置目录" });
    } catch (error) {
      renderTimeline({ t: "now", title: "config error", body: error.message });
    } finally {
      renderView(returnView);
    }
  }
});

toggleSidebarButton?.addEventListener("click", () => {
  state.collapsed.sidebar = !state.collapsed.sidebar;
  applyLayoutState();
});

toggleInspectorButton?.addEventListener("click", () => {
  state.collapsed.inspector = !state.collapsed.inspector;
  applyLayoutState();
});

function pollClaude() {
  const timer = setInterval(async () => {
    try {
      state.claude = await apiGet("/api/claude/status");
      if (state.view === "install" || state.view === "settings") renderView(state.view);
      if (state.claude.status !== "installing") {
        clearInterval(timer);
        renderTimeline({ t: "now", title: "claude code", body: `状态：${state.claude.status} / ${state.claude.phase}` });
      }
    } catch (error) {
      clearInterval(timer);
      renderTimeline({ t: "now", title: "claude poll", body: error.message });
    }
  }, 1800);
}

function pollOllama() {
  const timer = setInterval(async () => {
    try {
      state.ollama = await apiGet("/api/ollama/status");
      if (state.view === "install" || state.view === "settings") renderView(state.view);
      if (state.ollama.status !== "installing") {
        clearInterval(timer);
        renderTimeline({ t: "now", title: "ollama", body: `状态：${state.ollama.status} / ${state.ollama.phase}` });
      }
    } catch (error) {
      clearInterval(timer);
      renderTimeline({ t: "now", title: "ollama poll", body: error.message });
    }
  }, 1800);
}

function pollBootstrap() {
  const timer = setInterval(async () => {
    try {
      state.bootstrap = await apiGet("/api/bootstrap/status");
      updateBackendBadges();
      if (state.view === "install") renderView("install");
      if (!["installing", "queued"].includes(state.bootstrap.status)) {
        clearInterval(timer);
        renderTimeline({ t: "now", title: "bootstrap", body: `安装状态：${state.bootstrap.status} / ${state.bootstrap.phase}` });
      }
    } catch (error) {
      clearInterval(timer);
      renderTimeline({ t: "now", title: "bootstrap poll", body: error.message });
    }
  }, 1800);
}

document.querySelector("#refreshQuota").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  const previous = button.textContent;
  button.textContent = "刷新中";
  try {
    await refreshBackendState();
  } finally {
    button.disabled = false;
    button.textContent = previous;
  }
});

document.querySelector("#runDemo").addEventListener("click", () => {
  state.activeChatId = "";
  activateNav("chat");
  renderSidebarSessions();
  renderView("chat");
  location.hash = "chat";
  requestAnimationFrame(() => {
    viewHost.querySelector(".composer input")?.focus();
  });
  renderTimeline({ t: "now", title: "chat", body: "已创建空白任务输入区" });
});

renderTasks();
renderTimeline();
updateNumbers();
const initialView = location.hash.replace("#", "") || "chat";
applyLayoutState();
activateNav(initialView);
renderView(initialView);
refreshBackendState({ silent: true });
