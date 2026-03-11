import { Router, type Request, type Response } from "express";
import { ToolforgeClient, ToolforgeApiError } from "./toolforge-client.js";
import { MOCK_DEPLOYMENTS, MOCK_BUILD_LOGS } from "./mock-data.js";
import type { Deployment } from "../shared/types.js";

function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

type Config = {
  toolName: string;
  mockMode: true;
  client: null;
} | {
  toolName: string;
  mockMode: false;
  client: ToolforgeClient;
};

export function createRouter(config: Config): Router {
  const router = Router();

  router.get("/api/deployments", async (_req: Request, res: Response) => {
    try {
      const deployments = config.mockMode
        ? MOCK_DEPLOYMENTS
        : await config.client.getDeployments(config.toolName);
      res.json(deployments);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get("/api/deployments/:id", async (req: Request, res: Response) => {
    try {
      let deployment: Deployment | undefined;

      if (config.mockMode) {
        deployment = MOCK_DEPLOYMENTS.find((d) => d.deploy_id === param(req, "id"));
        if (!deployment) {
          res.status(404).json({ error: "Deployment not found" });
          return;
        }
      } else {
        deployment = await config.client.getDeployment(
          config.toolName,
          param(req, "id"),
        );
      }

      res.json(deployment);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get(
    "/api/builds/:buildId/logs",
    async (req: Request, res: Response) => {
      try {
        if (config.mockMode) {
          res.type("text/plain").send(MOCK_BUILD_LOGS);
          return;
        }

        const logs = await config.client.getBuildLogs(
          config.toolName,
          param(req, "buildId"),
        );
        res.type("text/plain").send(logs);
      } catch (err) {
        handleError(res, err);
      }
    },
  );

  return router;
}

function handleError(res: Response, err: unknown): void {
  if (err instanceof ToolforgeApiError) {
    const status = err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 502;
    res.status(status).json({ error: err.message });
    return;
  }

  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Internal server error" });
}
