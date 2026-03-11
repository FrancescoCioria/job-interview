import { useQuery } from "@tanstack/react-query";
import { getBuildLogs } from "../lib/api";

export function useBuildLogs(buildId: string | null) {
  return useQuery({
    queryKey: ["buildLogs", buildId],
    queryFn: () => getBuildLogs(buildId!),
    enabled: buildId !== null,
  });
}
