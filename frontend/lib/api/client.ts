// Typed fetch wrapper. Reads the base URL at call time so tests and the
// browser can each set their own. Empty base means same-origin (used in dev
// with MSW). The real value points at the Go API over Tailscale later.
function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new ApiError(res.status, `GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
