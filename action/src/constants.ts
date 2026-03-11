import type { DeploymentStatus } from "./types";

export const TERMINAL_STATUSES: ReadonlySet<DeploymentStatus> = new Set([
  "successful",
  "failed",
  "timed_out",
  "cancelled",
]);
