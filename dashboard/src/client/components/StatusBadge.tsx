import { clsx } from "clsx";
import type { DeploymentStatus, BuildStatus, RunStatus } from "../../shared/types";

type Status = DeploymentStatus | BuildStatus | RunStatus;

const STYLE_MAP: Record<string, string> = {
  successful: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
  timed_out: "bg-amber-50 text-amber-700 ring-amber-600/20",
  running: "bg-blue-50 text-blue-700 ring-blue-600/20",
  pending: "bg-gray-50 text-gray-600 ring-gray-500/20",
  cancelled: "bg-gray-50 text-gray-500 ring-gray-400/20",
  cancelling: "bg-gray-50 text-gray-500 ring-gray-400/20",
  skipped: "bg-gray-50 text-gray-400 ring-gray-300/20",
  unknown: "bg-gray-50 text-gray-400 ring-gray-300/20",
};

const LABEL_MAP: Record<string, string> = {
  timed_out: "Timed Out",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STYLE_MAP[status] ?? STYLE_MAP.unknown;
  const label = LABEL_MAP[status] ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        style,
        className,
      )}
    >
      {status === "running" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {label}
    </span>
  );
}
