import * as core from "@actions/core";

async function run(): Promise<void> {
  try {
    const toolName = core.getInput("tool_name", { required: true });
    const deployToken = core.getInput("deploy_token", { required: true });

    core.setSecret(deployToken);

    core.info(`Deploying tool: ${toolName}`);

    // TODO: Phase 3 - trigger deployment, poll status, write summary
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
