import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DeploymentList } from "./pages/DeploymentList";
import { DeploymentDetail } from "./pages/DeploymentDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 2,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DeploymentList />} />
          <Route path="/deployments/:id" element={<DeploymentDetail />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
