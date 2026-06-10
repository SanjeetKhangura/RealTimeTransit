import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// Used in development to serve mock data in the browser (see MswProvider).
export const worker = setupWorker(...handlers);
