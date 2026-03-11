import { Deployment } from "./types";
export declare class ToolforgeApiError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare class ToolforgeAuthError extends ToolforgeApiError {
    constructor(statusCode?: number);
}
export declare class ToolforgeTimeoutError extends Error {
    readonly elapsedMs: number;
    readonly lastStatus: string;
    constructor(elapsedMs: number, lastStatus: string);
}
export declare class ToolforgeClient {
    private readonly baseUrl;
    private readonly token;
    constructor(baseUrl: string, token: string);
    triggerDeployment(toolName: string, opts?: {
        forceBuild?: boolean;
        forceRun?: boolean;
    }): Promise<Deployment>;
    getDeployment(toolName: string, deploymentId: string): Promise<Deployment>;
    getDeployments(toolName: string): Promise<Deployment[]>;
    getLatestDeployment(toolName: string): Promise<Deployment>;
    private request;
}
