import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGate } from "@video-x/ui";
import "@video-x/design-tokens";
import { Experience } from "./Experience";
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 10000 } },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <AuthGate>
        {(profile, logout) => (
          <Experience
            key={profile.id}
            profile={profile}
            logout={async () => {
              await logout();
              client.clear();
            }}
          />
        )}
      </AuthGate>
    </QueryClientProvider>
  </React.StrictMode>,
);
