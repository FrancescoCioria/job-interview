import { Deployment } from "./types";
interface SummaryOptions {
    toolName: string;
    commitSha: string;
    deployment: Deployment;
    deploymentUrl: string;
    dashboardUrl: string;
}
export declare function writeSummary(opts: SummaryOptions): Promise<void>;
export {};
