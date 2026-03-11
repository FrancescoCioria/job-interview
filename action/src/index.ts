import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  ToolforgeClient,
  ToolforgeAuthError,
  ToolforgeTimeoutError,
  ToolforgeApiError,
} from "./api-client";
import { pollDeployment } from "./poll";
import { writeSummary } from "./summary";
import { Deployment } from "./types";

async function run(): Promise<void> {
  // Read inputs
  const toolName = core.getInput("tool_name", { required: true });
  const deployToken = core.getInput("deploy_token", { required: true });
  const apiBaseUrl = core.getInput("api_base_url");
  const forceBuild = core.getBooleanInput("force_build");
  const forceRun = core.getBooleanInput("force_run");
  const dashboardUrl = core.getInput("dashboard_url");

  const timeoutSeconds = parseInt(core.getInput("timeout_seconds"), 10);
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    core.setFailed("timeout_seconds must be a positive number");
    return;
  }

  core.setSecret(deployToken);

  const client = new ToolforgeClient(apiBaseUrl, deployToken);
  const commitSha = github.context.sha;

  let finalDeployment: Deployment | undefined;
  let deploymentUrl = "";

  try {
    // Trigger deployment
    core.info(`Triggering deployment for tool: ${toolName}`);
    const deployment = await client.triggerDeployment(toolName, {
      forceBuild,
      forceRun,
    });

    const deploymentId = deployment.deploy_id;
    deploymentUrl = `${apiBaseUrl}/components/v1/tool/${encodeURIComponent(toolName)}/deployment/${encodeURIComponent(deploymentId)}`;

    core.info(`Deployment triggered: ${deploymentId}`);
    core.setOutput("deployment_id", deploymentId);
    core.setOutput("deployment_url", deploymentUrl);

    // Poll for completion
    core.info("Waiting for deployment to complete...");
    let lastStatus = "";

    finalDeployment = await pollDeployment(
      client,
      toolName,
      deploymentId,
      timeoutSeconds * 1000,
      (d) => {
        if (d.status !== lastStatus) {
          lastStatus = d.status;
          core.info(`Status: ${d.status} — ${d.long_status}`);
        }
      },
    );
  } catch (error) {
    if (error instanceof ToolforgeAuthError) {
      core.setFailed("Authentication failed: check your deploy_token secret");
    } else if (error instanceof ToolforgeTimeoutError) {
      core.setFailed(error.message);
    } else if (error instanceof ToolforgeApiError) {
      core.setFailed(`Toolforge API error (${error.statusCode}): ${error.message}`);
    } else if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }

  // Always set status output and write summary
  core.setOutput("deployment_status", finalDeployment?.status ?? "unknown");

  if (finalDeployment) {
    const resolvedDashboardUrl = dashboardUrl
      ? `${dashboardUrl.replace(/\/+$/, "")}/deployments/${encodeURIComponent(finalDeployment.deploy_id)}`
      : "";

    try {
      await writeSummary({
        toolName,
        commitSha,
        deployment: finalDeployment,
        deploymentUrl,
        dashboardUrl: resolvedDashboardUrl,
      });
    } catch (summaryError) {
      core.warning(`Failed to write job summary: ${summaryError}`);
    }

    if (finalDeployment.status !== "successful") {
      core.setFailed(
        `Deployment ${finalDeployment.status}: ${finalDeployment.long_status}`,
      );
    }
  }
}

run();
