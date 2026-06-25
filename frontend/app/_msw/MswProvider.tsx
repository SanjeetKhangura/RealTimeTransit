"use client";

import { useEffect, useState } from "react";

// Use the mock API only in development AND when no real API base URL is set.
// To run against the real Go API, set NEXT_PUBLIC_API_BASE_URL (e.g.
// http://localhost:8080) and MSW stays off.
const USE_MOCKS =
  process.env.NODE_ENV === "development" &&
  !process.env.NEXT_PUBLIC_API_BASE_URL;

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!USE_MOCKS);

  useEffect(() => {
    if (!USE_MOCKS) return;
    let active = true;
    void (async () => {
      const { worker } = await import("@/mocks/browser");
      await worker.start({ onUnhandledRequest: "bypass" });
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
