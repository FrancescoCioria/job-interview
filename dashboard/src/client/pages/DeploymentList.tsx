import { Link } from "react-router-dom";
import { useDeployments } from "../hooks/useDeployments";
import { StatusBadge } from "../components/StatusBadge";
import { TimeAgo } from "../components/TimeAgo";
import { ErrorMessage } from "../components/ErrorMessage";
import { TableSkeleton } from "../components/Skeleton";
import type { Deployment } from "../../shared/types";

export function DeploymentList() {
  const { data: deployments, isLoading, error, refetch } = useDeployments();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Deployments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Recent deployment activity</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.418A6 6 0 1 1 8 2v1z" />
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <ErrorMessage
          message={error instanceof Error ? error.message : "Failed to load deployments"}
          onRetry={() => refetch()}
        />
      )}

      {isLoading && <TableSkeleton rows={4} />}

      {deployments && deployments.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">No deployments found</p>
        </div>
      )}

      {deployments && deployments.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deployments.map((d) => (
                <DeploymentRow key={d.deploy_id} deployment={d} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DeploymentRow({ deployment }: { deployment: Deployment }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <Link
          to={`/deployments/${encodeURIComponent(deployment.deploy_id)}`}
          className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline"
        >
          {deployment.deploy_id}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        <TimeAgo date={deployment.creation_time} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={deployment.status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={deployment.long_status}>
        {deployment.long_status}
      </td>
    </tr>
  );
}
