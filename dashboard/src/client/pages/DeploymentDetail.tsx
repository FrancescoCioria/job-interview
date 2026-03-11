import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useDeployment } from "../hooks/useDeployment";
import { useBuildLogs } from "../hooks/useBuildLogs";
import { StatusBadge } from "../components/StatusBadge";
import { TimeAgo } from "../components/TimeAgo";
import { ErrorMessage } from "../components/ErrorMessage";
import { Skeleton } from "../components/Skeleton";
import { TERMINAL_STATUSES } from "../../shared/constants";
import type { DeploymentBuild, DeploymentRun } from "../../shared/types";

export function DeploymentDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: deployment, isLoading, error, refetch, isFetching } = useDeployment(id);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const { data: buildLogs, isLoading: logsLoading } = useBuildLogs(selectedBuildId);

  if (error) {
    return (
      <ErrorMessage
        message={error instanceof Error ? error.message : "Failed to load deployment"}
        onRetry={() => refetch()}
      />
    );
  }

  const isActive = deployment && !TERMINAL_STATUSES.has(deployment.status);

  return (
    <div>
      {/* Back link + header */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-3">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
          </svg>
          All deployments
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 font-mono">{id}</h1>
            {deployment && (
              <div className="flex items-center gap-3 mt-1.5">
                <StatusBadge status={deployment.status} />
                <span className="text-sm text-gray-500">
                  <TimeAgo date={deployment.creation_time} />
                </span>
                {isActive && isFetching && (
                  <span className="text-xs text-gray-400">Updating...</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {deployment && (
        <div className="space-y-6">
          {/* Status message */}
          {deployment.long_status && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Status</h2>
              <p className="text-sm text-gray-700">{deployment.long_status}</p>
            </div>
          )}

          {/* Flags */}
          {(deployment.force_build || deployment.force_run) && (
            <div className="flex gap-2">
              {(
                [
                  ["force_build", "Force Build"],
                  ["force_run", "Force Run"],
                ] as const
              )
                .filter(([key]) => deployment[key])
                .map(([key, label]) => (
                  <span
                    key={key}
                    className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20"
                  >
                    {label}
                  </span>
                ))}
            </div>
          )}

          {/* Components */}
          <div>
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Components</h2>
            <div className="space-y-3">
              {Object.entries(deployment.builds).sort(([a], [b]) => a.localeCompare(b)).map(([name, build]) => {
                const run = deployment.runs[name];
                return (
                  <ComponentCard
                    key={name}
                    name={name}
                    build={build}
                    run={run}
                    onViewLogs={() => setSelectedBuildId(
                      selectedBuildId === build.build_id ? null : build.build_id,
                    )}
                    logsOpen={selectedBuildId === build.build_id}
                  />
                );
              })}
            </div>
          </div>

          {/* Build logs panel */}
          {selectedBuildId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Build Logs</h2>
                <button
                  onClick={() => setSelectedBuildId(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-900 p-4 overflow-x-auto">
                {logsLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4 !bg-gray-700" />
                    <Skeleton className="h-3.5 w-1/2 !bg-gray-700" />
                    <Skeleton className="h-3.5 w-5/6 !bg-gray-700" />
                  </div>
                ) : (
                  <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">
                    {buildLogs ?? "No logs available"}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ComponentCardProps {
  name: string;
  build: DeploymentBuild;
  run?: DeploymentRun;
  onViewLogs: () => void;
  logsOpen: boolean;
}

function ComponentCard({ name, build, run, onViewLogs, logsOpen }: ComponentCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 font-mono">{name}</span>
        <button
          onClick={onViewLogs}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          {logsOpen ? "Hide logs" : "View build logs"}
        </button>
      </div>
      <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Build</p>
          <StatusBadge status={build.build_status} />
          {build.build_long_status && (
            <p className="text-xs text-gray-500 mt-1.5">{build.build_long_status}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Run</p>
          {run ? (
            <>
              <StatusBadge status={run.run_status} />
              {run.run_long_status && (
                <p className="text-xs text-gray-500 mt-1.5">{run.run_long_status}</p>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          )}
        </div>
      </div>
    </div>
  );
}
