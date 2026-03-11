export type DeploymentStatus = "pending" | "running" | "successful" | "failed" | "timed_out" | "cancelling" | "cancelled";
export type BuildStatus = "pending" | "running" | "successful" | "failed" | "unknown" | "skipped" | "cancelled";
export type RunStatus = "pending" | "successful" | "failed" | "skipped" | "unknown";
export interface DeploymentBuild {
    build_id: string;
    build_status: BuildStatus;
    build_image: string;
    build_long_status: string;
}
export interface DeploymentRun {
    run_status: RunStatus;
    run_long_status: string;
}
export interface Deployment {
    deploy_id: string;
    creation_time: string;
    status: DeploymentStatus;
    long_status: string;
    builds: Record<string, DeploymentBuild>;
    runs: Record<string, DeploymentRun>;
    force_build: boolean;
    force_run: boolean;
}
export declare const TERMINAL_STATUSES: ReadonlySet<DeploymentStatus>;
