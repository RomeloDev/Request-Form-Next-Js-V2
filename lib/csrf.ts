import { ApiError } from "@/lib/api";

/** Start the browser's cookie session and return Laravel's decoded CSRF token. */
export async function prepareCsrfSession(): Promise<string> {
  const response = await fetch("/sanctum/csrf-cookie", {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new ApiError(503, "The service is temporarily unavailable. Please try again later.");
  }

  const cookie = document.cookie.split(";").map((value) => value.trim())
    .find((value) => value.startsWith("XSRF-TOKEN="));
  if (!cookie) {
    throw new ApiError(419, "We couldn’t start your session. Please reload and try again.");
  }
  return decodeURIComponent(cookie.slice("XSRF-TOKEN=".length));
}
