import express from "express";
import cors from "cors";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || "3000", 10);
const MOCK_MODE = process.env.MOCK_MODE === "true";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const app = express();
app.use(cors({ origin: IS_PRODUCTION ? false : true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mock: MOCK_MODE });
});

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
  }
});
