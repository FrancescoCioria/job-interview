import type { Deployment } from "../shared/types.js";

export class ToolforgeApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "ToolforgeApiError";
  }
}

interface RequestOptions {
  method: string;
  path: string;
  query?: Record<string, string>;
  accept?: string;
}

/** Total number of attempts (1 initial + retries) */
const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class ToolforgeClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
  }

  async getDeployments(toolName: string): Promise<Deployment[]> {
    const response = await this.request<Deployment[] | { data: { deployments: Deployment[] } }>({
      method: "GET",
      path: `/components/v1/tool/${encodeURIComponent(toolName)}/deployment`,
    });
    if (Array.isArray(response)) return response;
    if (response && typeof response === "object" && "data" in response) {
      return response.data.deployments;
    }
    return [];
  }

  async getDeployment(
    toolName: string,
    deploymentId: string,
  ): Promise<Deployment> {
    const response = await this.request<Deployment | { data: Deployment }>({
      method: "GET",
      path: `/components/v1/tool/${encodeURIComponent(toolName)}/deployment/${encodeURIComponent(deploymentId)}`,
    });
    if (response && typeof response === "object" && "data" in response && !("deploy_id" in response)) {
      return response.data;
    }
    return response as Deployment;
  }

  async getBuildLogs(toolName: string, buildId: string): Promise<string> {
    return this.request<string>({
      method: "GET",
      path: `/builds/v1/tool/${encodeURIComponent(toolName)}/builds/${encodeURIComponent(buildId)}/logs`,
      accept: "text/plain",
    });
  }

  private async request<T>(opts: RequestOptions): Promise<T> {
    const url = new URL(opts.path, this.baseUrl);
    if (opts.query) {
      for (const [key, value] of Object.entries(opts.query)) {
        url.searchParams.set(key, value);
      }
    }

    const accept = opts.accept ?? "application/json";
    let lastError: Error | undefined;
    let sleptForRetryAfter = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0 && !sleptForRetryAfter) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
      sleptForRetryAfter = false;

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: opts.method,
          headers: { "Api-Key": this.token, Accept: accept },
        });
      } catch (err) {
        lastError =
          err instanceof Error ? err : new Error("Network request failed");
        if (attempt < MAX_ATTEMPTS - 1) continue;
        throw lastError;
      }

      if (response.status === 401 || response.status === 403) {
        const body = await response.text().catch(() => "");
        throw new ToolforgeApiError(
          "Authentication failed: invalid or expired deploy token",
          response.status,
          body,
        );
      }

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_ATTEMPTS - 1) {
        const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
        await sleep(retryAfter);
        sleptForRetryAfter = true;
        const body = await response.text().catch(() => "");
        lastError = new ToolforgeApiError(
          `Toolforge API error (${response.status}): ${body || response.statusText}`,
          response.status,
          body,
        );
        continue;
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new ToolforgeApiError(
          `Toolforge API error (${response.status}): ${body || response.statusText}`,
          response.status,
          body,
        );
      }

      if (accept === "text/plain") {
        return (await response.text()) as T;
      }
      return (await response.json()) as T;
    }

    throw lastError ?? new Error("Request failed after retries");
  }
}

function parseRetryAfter(header: string | null): number {
  if (!header) return BASE_DELAY_MS;
  const seconds = parseInt(header, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : BASE_DELAY_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
