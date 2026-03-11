import { useQuery } from "@tanstack/react-query";
import { getDeployments } from "../lib/api";
import { TERMINAL_STATUSES } from "../../shared/constants";

export function useDeployments() {
  return useQuery({
    queryKey: ["deployments"],
    queryFn: getDeployments,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some(
        (d) => !TERMINAL_STATUSES.has(d.status),
      );
      return hasActive ? 5000 : 30000;
    },
  });
}
