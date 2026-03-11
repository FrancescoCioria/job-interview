import type { Deployment } from "../../shared/types";

const BASE = "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(body.error ?? `HTTP ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }
  return response.text();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getDeployments(): Promise<Deployment[]> {
  return fetchJson<Deployment[]>("/deployments");
}

export function getDeployment(id: string): Promise<Deployment> {
  return fetchJson<Deployment>(`/deployments/${encodeURIComponent(id)}`);
}

export function getBuildLogs(buildId: string): Promise<string> {
  return fetchText(`/builds/${encodeURIComponent(buildId)}/logs`);
}

export function getHealth(): Promise<{ status: string; mock: boolean; tool: string }> {
  return fetchJson("/health");
}
