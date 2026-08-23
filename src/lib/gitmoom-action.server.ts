/**
 * GitMoom Action — client for the external CI/CD engine (Node + Docker + BullMQ).
 * The engine is deployed outside this app; we only talk to its REST API.
 */

export interface ActionWorkflow {
  id: string;
  name: string;
  repositoryId?: string;
  path?: string;
  enabled?: boolean;
  events?: string[];
  updatedAt?: string;
}

export interface ActionJob {
  id: string;
  name: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  logs?: string;
  steps?: Array<{ id: string; name: string; status: string; logs?: string }>;
}

export interface ActionRun {
  id: string;
  workflowId?: string;
  workflowName?: string;
  status: string;
  event?: string;
  ref?: string;
  commitSha?: string;
  actor?: string;
  createdAt?: string;
  finishedAt?: string;
  jobs?: ActionJob[];
}

export class ActionEngineNotConfiguredError extends Error {
  constructor() {
    super('GITMOOM_ACTION_API_URL is not configured');
    this.name = 'ActionEngineNotConfiguredError';
  }
}

interface EngineConfig {
  baseUrl: string;
  token?: string;
}

function getConfig(): EngineConfig {
  const baseUrl = process.env['GITMOOM_ACTION_API_URL'];
  if (!baseUrl) throw new ActionEngineNotConfiguredError();
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    token: process.env['GITMOOM_ACTION_API_TOKEN'],
  };
}

export function isEngineConfigured(): boolean {
  return Boolean(process.env['GITMOOM_ACTION_API_URL']);
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { baseUrl, token } = getConfig();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`GitMoom Action request failed [${response.status}] ${path}: ${text}`);
    throw new Error(`GitMoom Action request failed [${response.status}]: ${text}`);
  }

  if (!text) return undefined as T;
  const parsed = JSON.parse(text);
  // The engine follows { success, data, error }; tolerate raw payloads too.
  if (parsed && typeof parsed === 'object' && 'success' in parsed) {
    if (parsed.success === false) {
      throw new Error(`GitMoom Action error: ${parsed.error ?? 'unknown error'}`);
    }
    return (parsed.data ?? null) as T;
  }
  return parsed as T;
}

export function fetchWorkflows(repositoryId?: string) {
  const query = repositoryId ? `?repositoryId=${encodeURIComponent(repositoryId)}` : '';
  return request<ActionWorkflow[]>(`/api/v1/workflows${query}`);
}

export function fetchRuns(params: { workflowId?: string; limit: number }) {
  const search = new URLSearchParams({ limit: String(params.limit) });
  if (params.workflowId) search.set('workflowId', params.workflowId);
  return request<ActionRun[]>(`/api/v1/runs?${search.toString()}`);
}

export function fetchRun(runId: string) {
  return request<ActionRun>(`/api/v1/runs/${encodeURIComponent(runId)}`);
}

export function dispatchEvent(payload: {
  repositoryId: string;
  event: string;
  ref: string;
  commitSha: string;
  actor: string;
}) {
  return request<{ runs?: ActionRun[] }>(`/api/v1/internal/gitmoom`, {
    method: 'POST',
    body: payload,
  });
}
