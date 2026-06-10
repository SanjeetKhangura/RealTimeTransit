import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "@/mocks/server";

// Tests run in jsdom where Node's fetch needs an absolute URL. MSW matches the
// path regardless of origin, so any host works here.
process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost";

// Start the MSW request mocking server for the whole test run.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
