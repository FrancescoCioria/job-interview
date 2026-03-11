import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { DeploymentList } from "./pages/DeploymentList";
import { DeploymentDetail } from "./pages/DeploymentDetail";
import { getHealth } from "./lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 2,
    },
  },
});

function AppRoutes() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    staleTime: Infinity,
  });

  return (
    <Layout mock={health?.mock}>
      <Routes>
        <Route path="/" element={<DeploymentList />} />
        <Route path="/deployments/:id" element={<DeploymentDetail />} />
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
