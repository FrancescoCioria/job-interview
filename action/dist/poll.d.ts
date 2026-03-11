import { Deployment } from "./types";
import { ToolforgeClient } from "./api-client";
export declare function pollDeployment(client: ToolforgeClient, toolName: string, deploymentId: string, timeoutMs: number, onStatus?: (deployment: Deployment) => void): Promise<Deployment>;
