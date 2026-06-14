export const INFO_ADAPTER_VERSION = "1.0.0";

export const PROTECTED_UI_BOUNDARY = {
  editZone: "apps/studio-ui/src/info-adapter.js",
  lockedUi: [
    "apps/studio-ui/src/main.js chatView() layout",
    "apps/studio-ui/src/main.js composer form",
    "apps/studio-ui/src/main.js /api/chat/send submit flow",
    "apps/studio-ui/src/styles.css chat and composer geometry",
    "apps/studio-api/studio_api.py destructive command policy",
  ],
  editableInfo: [
    "infoEndpoints",
    "normalizeInfoSnapshot()",
    "normalizeQuota()",
    "normalizeAnalytics()",
    "normalizeExperiments()",
  ],
};

// Claude Code can edit this file when a data source changes. Keep the UI shell,
// chat position, composer, send button, and destructive-command policy out of
// this adapter.
export const infoEndpoints = {
  health: "/api/health",
  runs: "/api/runs",
  chatState: "/api/chat/state",
  claudeStatus: "/api/claude/status",
  ollamaStatus: "/api/ollama/status",
  bootstrapStatus: "/api/bootstrap/status",
  quota: "",
  analytics: "",
  experiments: "",
};

const optionalEndpointNames = ["runs", "chatState", "quota", "analytics", "experiments"];

export function endpointPath(name, endpoints = infoEndpoints) {
  const rawValue = endpoints?.[name];
  if (!rawValue) return "";
  const value = String(rawValue).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

export async function loadInfoSnapshot({ apiGet, endpoints = infoEndpoints } = {}) {
  if (typeof apiGet !== "function") {
    throw new Error("loadInfoSnapshot requires apiGet");
  }

  const health = await readOptional(apiGet, endpointPath("health", endpoints), "health");
  const optionalResults = await Promise.all(
    optionalEndpointNames.map((name) => readOptional(apiGet, endpointPath(name, endpoints), name)),
  );
  const payloads = Object.fromEntries(optionalEndpointNames.map((name, index) => [name, optionalResults[index]]));

  return normalizeInfoSnapshot({
    health,
    runs: payloads.runs,
    chatState: payloads.chatState,
    quota: payloads.quota,
    analytics: payloads.analytics,
    experiments: payloads.experiments,
  });
}

export function normalizeInfoSnapshot(payloads = {}) {
  const health = payloads.health?.data || null;
  const runsPayload = payloads.runs?.data || null;
  const chatPayload = payloads.chatState?.data || null;
  const quotaPayload = payloads.quota?.data || health?.quota || null;
  const analyticsPayload = payloads.analytics?.data || null;
  const experimentsPayload = payloads.experiments?.data || null;
  const errors = collectErrors(payloads);

  return {
    adapterVersion: INFO_ADAPTER_VERSION,
    boundary: PROTECTED_UI_BOUNDARY,
    apiOnline: Boolean(health && !errors.health),
    backend: health,
    bootstrap: objectOrEmpty(health?.bootstrap),
    claude: objectOrEmpty(health?.claude),
    ollama: objectOrEmpty(health?.ollama),
    runtime: objectOrEmpty(health?.runtime),
    modelConfig: objectOrEmpty(health?.model),
    security: objectOrEmpty(health?.security),
    runs: normalizeRuns(runsPayload),
    chatSessions: normalizeChatSessions(chatPayload),
    quota: normalizeQuota(quotaPayload),
    analytics: normalizeAnalytics(analyticsPayload),
    experiments: normalizeExperiments(experimentsPayload),
    errors,
  };
}

export function normalizeQuota(payload) {
  if (!isPlainObject(payload)) return null;
  return {
    remaining: firstValue(payload.remaining, payload.remaining_credits, payload.credits, payload.balance),
    todayCost: firstValue(payload.today_cost, payload.todayCost, payload.daily_usage, payload.used_today),
    runCost: firstValue(payload.run_cost, payload.runCost, payload.current_run_cost),
    planName: firstValue(payload.plan, payload.plan_name, payload.tier, payload.package),
    raw: payload,
  };
}

export function normalizeAnalytics(payload) {
  if (!isPlainObject(payload)) return null;
  return {
    pushSuccessRate: firstValue(payload.push_success_rate, payload.pushSuccessRate),
    experimentScore: firstValue(payload.experiment_score, payload.experimentScore),
    failureReasons: Array.isArray(payload.failure_reasons)
      ? payload.failure_reasons
      : Array.isArray(payload.failureReasons)
        ? payload.failureReasons
        : [],
    raw: payload,
  };
}

export function normalizeExperiments(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.experiments)) return payload.experiments;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function normalizeRuns(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.runs)) return payload.runs;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function normalizeChatSessions(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.sessions)) return payload.sessions;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

async function readOptional(apiGet, path, name) {
  if (!path) {
    return { data: null, error: null, skipped: true, name };
  }
  try {
    return { data: await apiGet(path), error: null, skipped: false, name };
  } catch (error) {
    return { data: null, error: error?.message || String(error), skipped: false, name };
  }
}

function collectErrors(payloads) {
  return Object.fromEntries(
    Object.entries(payloads)
      .filter(([, result]) => result?.error)
      .map(([name, result]) => [name, result.error]),
  );
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function objectOrEmpty(value) {
  return isPlainObject(value) ? value : {};
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
