export type ValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: ValidationErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The browser calls Next.js; the configured rewrite forwards to Laravel. */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
    cache: "no-store",
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)])
      : AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? "The request could not be completed.",
      payload?.errors ?? {},
    );
  }

  if (payload === null) {
    throw new ApiError(502, "The service returned an unexpected response.");
  }

  return payload as T;
}
