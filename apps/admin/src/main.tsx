import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGate } from "@video-x/ui";
import "@video-x/design-tokens";
import "./app/style.css";
import { Admin } from "./app/Admin";
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 10000 } },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <AuthGate>{(_profile, logout) => <Admin logout={logout} />}</AuthGate>
    </QueryClientProvider>
  </React.StrictMode>,
);
