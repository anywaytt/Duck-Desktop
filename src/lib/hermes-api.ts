// Hermes Agent REST API 客户端
// 通过 /api/* 路径与 Hermes 后端通信

const BASE = "http://127.0.0.1:9119"; // Electron 加载 file:// 协议，必须用绝对 URL

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method.toUpperCase() === "GET";
  const headers: Record<string, string> = {
    ...(!isGet ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// ── Status ────────────────────────────────────────────────────────────────
export interface StatusResponse {
  version: string;
  release_date: string;
  gateway_running: boolean;
  gateway_state: string | null;
  gateway_pid: number | null;
  gateway_platforms: Record<string, {
    state: string;
    error_code?: string;
    error_message?: string;
    updated_at: string;
  }>;
  active_sessions: number;
  config_path: string;
  env_path: string;
  hermes_home: string;
}

export function getStatus() {
  return fetchJSON<StatusResponse>("/api/status");
}

// ── Model ─────────────────────────────────────────────────────────────────
export interface ModelInfo {
  model: string;
  provider: string;
  auto_context_length: number;
  config_context_length: number;
  effective_context_length: number;
  capabilities: {
    supports_tools?: boolean;
    supports_vision?: boolean;
    supports_reasoning?: boolean;
    context_window?: number;
    max_output_tokens?: number;
    model_family?: string;
  };
}

export function getModelInfo() {
  return fetchJSON<ModelInfo>("/api/model/info");
}

export interface ModelOptionProvider {
  name: string;
  slug: string;
  models?: string[];
  total_models?: number;
  is_current?: boolean;
  is_user_defined?: boolean;
  source?: string;
  warning?: string;
}

export interface ModelOptionsResponse {
  model?: string;
  provider?: string;
  providers?: ModelOptionProvider[];
}

export function getModelOptions() {
  return fetchJSON<ModelOptionsResponse>("/api/model/options");
}

export interface AuxiliaryTaskAssignment {
  task: string;
  provider: string;
  model: string;
  base_url: string;
}

export interface AuxiliaryModelsResponse {
  tasks: AuxiliaryTaskAssignment[];
  main: { provider: string; model: string };
}

export function getAuxiliaryModels() {
  return fetchJSON<AuxiliaryModelsResponse>("/api/model/auxiliary");
}

export interface ModelAssignmentRequest {
  scope: "main" | "auxiliary";
  provider: string;
  model: string;
  task?: string;
}

export function setModelAssignment(body: ModelAssignmentRequest) {
  return fetchJSON<{ ok: boolean }>("/api/model/set", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Analytics / Token Stats ───────────────────────────────────────────────
export interface AnalyticsDailyEntry {
  day: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  reasoning_tokens: number;
  estimated_cost: number;
  actual_cost: number;
  sessions: number;
  api_calls: number;
}

export interface AnalyticsModelEntry {
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  sessions: number;
  api_calls: number;
}

export interface AnalyticsResponse {
  daily: AnalyticsDailyEntry[];
  by_model: AnalyticsModelEntry[];
  totals: {
    total_input: number;
    total_output: number;
    total_cache_read: number;
    total_reasoning: number;
    total_estimated_cost: number;
    total_actual_cost: number;
    total_sessions: number;
    total_api_calls: number;
  };
  skills: {
    summary: { total_skill_loads: number; total_skill_edits: number; total_skill_actions: number; distinct_skills_used: number };
    top_skills: Array<{ skill: string; view_count: number; manage_count: number; total_count: number; percentage: number; last_used_at: number | null }>;
  };
}

export function getAnalytics(days: number) {
  return fetchJSON<AnalyticsResponse>(`/api/analytics/usage?days=${days}`);
}

export interface ModelsAnalyticsModelEntry {
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  reasoning_tokens: number;
  estimated_cost: number;
  actual_cost: number;
  sessions: number;
  api_calls: number;
  tool_calls: number;
  last_used_at: number;
  avg_tokens_per_session: number;
  capabilities: {
    supports_tools?: boolean;
    supports_vision?: boolean;
    supports_reasoning?: boolean;
    context_window?: number;
    max_output_tokens?: number;
    model_family?: string;
  };
}

export interface ModelsAnalyticsResponse {
  models: ModelsAnalyticsModelEntry[];
  totals: {
    distinct_models: number;
    total_input: number;
    total_output: number;
    total_cache_read: number;
    total_reasoning: number;
    total_estimated_cost: number;
    total_actual_cost: number;
    total_sessions: number;
    total_api_calls: number;
  };
  period_days: number;
}

export function getModelsAnalytics(days: number) {
  return fetchJSON<ModelsAnalyticsResponse>(`/api/analytics/models?days=${days}`);
}

// ── Sessions ──────────────────────────────────────────────────────────────
export interface SessionInfo {
  id: string;
  source: string | null;
  model: string | null;
  title: string | null;
  started_at: number;
  ended_at: number | null;
  last_active: number;
  is_active: boolean;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  preview: string | null;
}

export interface PaginatedSessions {
  sessions: SessionInfo[];
  total: number;
  limit: number;
  offset: number;
}

export function getSessions(limit = 10, offset = 0) {
  return fetchJSON<PaginatedSessions>(`/api/sessions?limit=${limit}&offset=${offset}`);
}

// ── Gateway Control ───────────────────────────────────────────────────────
export function restartGateway() {
  return fetchJSON<{ ok: boolean; pid: number }>("/api/gateway/restart", { method: "POST" });
}

export function updateHermes() {
  return fetchJSON<{ ok: boolean; pid: number }>("/api/hermes/update", { method: "POST" });
}
