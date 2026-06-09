import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Used by Vitest (see vitest.setup.ts).
export const server = setupServer(...handlers);
