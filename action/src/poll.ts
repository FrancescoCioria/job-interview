import { Deployment, TERMINAL_STATUSES } from "./types";
import { ToolforgeClient, ToolforgeTimeoutError } from "./api-client";
import { sleep } from "./utils";

const INITIAL_INTERVAL_MS = 5000;
const MAX_INTERVAL_MS = 15000;
const INTERVAL_INCREMENT_MS = 2000;

export async function pollDeployment(
  client: ToolforgeClient,
  toolName: string,
  deploymentId: string,
  timeoutMs: number,
  onStatus?: (deployment: Deployment) => void,
): Promise<Deployment> {
  const startTime = Date.now();
  let interval = INITIAL_INTERVAL_MS;

  while (true) {
    const deployment = await client.getDeployment(toolName, deploymentId);

    if (onStatus) {
      onStatus(deployment);
    }

    if (TERMINAL_STATUSES.has(deployment.status)) {
      return deployment;
    }

    const elapsed = Date.now() - startTime;
    const remaining = timeoutMs - elapsed;
    if (remaining <= 0) {
      throw new ToolforgeTimeoutError(elapsed, deployment.status);
    }

    await sleep(Math.min(interval, remaining));
    interval = Math.min(interval + INTERVAL_INCREMENT_MS, MAX_INTERVAL_MS);
  }
}
