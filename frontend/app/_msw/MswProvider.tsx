"use client";

import { useEffect, useState } from "react";

// Starts the MSW worker in development so the app runs against mock data
// without a backend. In production it renders children immediately and never
// loads MSW. Swap to the real API by setting NEXT_PUBLIC_API_BASE_URL.
export function MswProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(process.env.NODE_ENV !== "development");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
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
