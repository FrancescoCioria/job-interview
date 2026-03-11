import express from "express";
import cors from "cors";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ToolforgeClient } from "./toolforge-client.js";
import { createRouter } from "./routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || "3000", 10);
const MOCK_MODE = process.env.MOCK_MODE === "true";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const TOOL_NAME = process.env.TOOLFORGE_TOOL_NAME || "";
const API_URL = process.env.TOOLFORGE_API_URL || "https://api.svc.toolforge.org";
const DEPLOY_TOKEN = process.env.TOOLFORGE_DEPLOY_TOKEN || "";

if (!MOCK_MODE && (!TOOL_NAME || !DEPLOY_TOKEN)) {
  console.error(
    "Error: TOOLFORGE_TOOL_NAME and TOOLFORGE_DEPLOY_TOKEN are required when MOCK_MODE is not enabled.\n" +
    "Set MOCK_MODE=true to use sample data, or provide the required environment variables.",
  );
  process.exit(1);
}

const routerConfig = MOCK_MODE
  ? { toolName: TOOL_NAME, mockMode: true as const, client: null }
  : { toolName: TOOL_NAME, mockMode: false as const, client: new ToolforgeClient(API_URL, DEPLOY_TOKEN) };

const app = express();
app.use(cors({ origin: IS_PRODUCTION ? false : true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mock: MOCK_MODE, tool: TOOL_NAME || "mock" });
});

app.use(createRouter(routerConfig));

// Serve static files in production
if (IS_PRODUCTION) {
  const clientDir = resolve(__dirname, "../client");
  const indexHtml = resolve(clientDir, "index.html");
  app.use(express.static(clientDir));
  app.get("*", (_req, res) => {
    res.sendFile(indexHtml);
  });
}

app.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
  if (MOCK_MODE) {
    console.log("Mock mode enabled - using sample data");
  } else {
    console.log(`Connected to Toolforge API for tool: ${TOOL_NAME}`);
  }
});
