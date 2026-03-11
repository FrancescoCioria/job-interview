import type { Deployment } from "../shared/types.js";

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

export const MOCK_DEPLOYMENTS: Deployment[] = [
  {
    deploy_id: "d-20260311-001",
    creation_time: hoursAgo(0.5),
    status: "running",
    long_status: "Building component 'web': pulling base image, installing dependencies...",
    builds: {
      web: {
        build_id: "b-20260311-001",
        build_status: "running",
        build_image: "docker-registry.tools.wmflabs.org/toolforge-my-tool-web:latest",
        build_long_status: "Step 3/7: RUN npm install",
      },
    },
    runs: {
      web: {
        run_status: "pending",
        run_long_status: "Waiting for build to complete",
      },
    },
    force_build: false,
    force_run: false,
  },
  {
    deploy_id: "d-20260311-000",
    creation_time: hoursAgo(2),
    status: "successful",
    long_status: "Deployment completed successfully. All components are running.",
    builds: {
      web: {
        build_id: "b-20260311-000",
        build_status: "successful",
        build_image: "docker-registry.tools.wmflabs.org/toolforge-my-tool-web:latest",
        build_long_status: "Build completed in 47s",
      },
      worker: {
        build_id: "b-20260310-005",
        build_status: "skipped",
        build_image: "docker-registry.tools.wmflabs.org/toolforge-my-tool-worker:latest",
        build_long_status: "No changes detected, skipping build",
      },
    },
    runs: {
      web: {
        run_status: "successful",
        run_long_status: "Container started, health check passed",
      },
      worker: {
        run_status: "successful",
        run_long_status: "Container started successfully",
      },
    },
    force_build: false,
    force_run: false,
  },
  {
    deploy_id: "d-20260310-003",
    creation_time: hoursAgo(18),
    status: "failed",
    long_status: "Deployment failed: build error in component 'web'",
    builds: {
      web: {
        build_id: "b-20260310-003",
        build_status: "failed",
        build_image: "docker-registry.tools.wmflabs.org/toolforge-my-tool-web:latest",
        build_long_status: "Error: npm ERR! code ELIFECYCLE - exit code 1",
      },
    },
    runs: {
      web: {
        run_status: "skipped",
        run_long_status: "Skipped due to build failure",
      },
    },
    force_build: true,
    force_run: false,
  },
  {
    deploy_id: "d-20260310-002",
    creation_time: hoursAgo(24),
    status: "timed_out",
    long_status: "Deployment timed out waiting for component 'web' to become healthy",
    builds: {
      web: {
        build_id: "b-20260310-002",
        build_status: "successful",
        build_image: "docker-registry.tools.wmflabs.org/toolforge-my-tool-web:latest",
        build_long_status: "Build completed in 52s",
      },
    },
    runs: {
      web: {
        run_status: "failed",
        run_long_status: "Health check failed after 300s timeout",
      },
    },
    force_build: false,
    force_run: true,
  },
  {
    deploy_id: "d-20260309-001",
    creation_time: hoursAgo(48),
    status: "successful",
    long_status: "Deployment completed successfully. All components are running.",
    builds: {
      web: {
        build_id: "b-20260309-001",
        build_status: "successful",
        build_image: "docker-registry.tools.wmflabs.org/toolforge-my-tool-web:latest",
        build_long_status: "Build completed in 39s",
      },
    },
    runs: {
      web: {
        run_status: "successful",
        run_long_status: "Container started, health check passed",
      },
    },
    force_build: false,
    force_run: false,
  },
];

export const MOCK_BUILD_LOGS = `[2026-03-11T10:00:01Z] Starting build for component 'web'
[2026-03-11T10:00:02Z] Pulling base image: node:20-alpine
[2026-03-11T10:00:08Z] Step 1/7: COPY package.json package-lock.json ./
[2026-03-11T10:00:09Z] Step 2/7: RUN npm ci --production
[2026-03-11T10:00:31Z] added 127 packages in 22s
[2026-03-11T10:00:32Z] Step 3/7: COPY . .
[2026-03-11T10:00:33Z] Step 4/7: RUN npm run build
[2026-03-11T10:00:41Z] Build output: dist/index.js (48KB)
[2026-03-11T10:00:42Z] Step 5/7: EXPOSE 8080
[2026-03-11T10:00:42Z] Step 6/7: USER tools.my-tool
[2026-03-11T10:00:43Z] Step 7/7: CMD ["node", "dist/index.js"]
[2026-03-11T10:00:47Z] Successfully built image
[2026-03-11T10:00:48Z] Pushing to registry...
[2026-03-11T10:00:52Z] Build completed successfully in 51s
`;
