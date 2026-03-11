import { useQuery } from "@tanstack/react-query";
import { getDeployment } from "../lib/api";
import { TERMINAL_STATUSES } from "../../shared/types";

export function useDeployment(id: string) {
  return useQuery({
    queryKey: ["deployment", id],
    queryFn: () => getDeployment(id),
    enabled: id !== "",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_STATUSES.has(status)) return false;
      return 5000;
    },
  });
}
