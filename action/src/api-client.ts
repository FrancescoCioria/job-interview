import { Deployment } from "./types";
import { sleep } from "./utils";

export class ToolforgeApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ToolforgeApiError";
  }
}

export class ToolforgeAuthError extends ToolforgeApiError {
  constructor(statusCode: number = 401) {
    super("Authentication failed: invalid or expired deploy token", statusCode);
    this.name = "ToolforgeAuthError";
  }
}

export class ToolforgeTimeoutError extends Error {
  constructor(
    public readonly elapsedMs: number,
    public readonly lastStatus: string,
  ) {
    super(
      `Deployment timed out after ${Math.round(elapsedMs / 1000)}s (last status: ${lastStatus})`,
    );
    this.name = "ToolforgeTimeoutError";
  }
}

interface RequestOptions {
  method: string;
  path: string;
  query?: Record<string, string>;
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

  async triggerDeployment(
    toolName: string,
    opts?: { forceBuild?: boolean; forceRun?: boolean },
  ): Promise<Deployment> {
    const query: Record<string, string> = {};
    if (opts?.forceBuild) query["force-build"] = "true";
    if (opts?.forceRun) query["force-run"] = "true";

    return this.request<Deployment>({
      method: "POST",
      path: `/components/v1/tool/${encodeURIComponent(toolName)}/deployment`,
      query,
    });
  }

  async getDeployment(
    toolName: string,
    deploymentId: string,
  ): Promise<Deployment> {
    return this.request<Deployment>({
      method: "GET",
      path: `/components/v1/tool/${encodeURIComponent(toolName)}/deployment/${encodeURIComponent(deploymentId)}`,
    });
  }

  async getDeployments(toolName: string): Promise<Deployment[]> {
    return this.request<Deployment[]>({
      method: "GET",
      path: `/components/v1/tool/${encodeURIComponent(toolName)}/deployment`,
    });
  }

  async getLatestDeployment(toolName: string): Promise<Deployment> {
    return this.request<Deployment>({
      method: "GET",
      path: `/components/v1/tool/${encodeURIComponent(toolName)}/deployment/latest`,
    });
  }

  private async request<T>(opts: RequestOptions): Promise<T> {
    const url = new URL(opts.path, this.baseUrl);
    if (opts.query) {
      for (const [key, value] of Object.entries(opts.query)) {
        url.searchParams.set(key, value);
      }
    }

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
          headers: {
            "Api-Key": this.token,
            Accept: "application/json",
          },
        });
      } catch (err) {
        lastError =
          err instanceof Error ? err : new Error("Network request failed");
        if (attempt < MAX_ATTEMPTS - 1) continue;
        throw lastError;
      }

      if (response.status === 401 || response.status === 403) {
        throw new ToolforgeAuthError(response.status);
      }

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_ATTEMPTS - 1) {
        const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
        await sleep(retryAfter);
        sleptForRetryAfter = true;
        lastError = new ToolforgeApiError(
          `API returned ${response.status}`,
          response.status,
        );
        continue;
      }

      if (!response.ok) {
        throw new ToolforgeApiError(
          `API returned ${response.status}`,
          response.status,
        );
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

