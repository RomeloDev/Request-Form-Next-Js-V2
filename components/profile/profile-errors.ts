import { ApiError } from "@/lib/api";

/** Laravel invalidated or expired the Sanctum session. */
export function isSessionExpired(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 419)
  );
}

/**
 * Map backend failures to short, safe messages. Validation text is handled
 * separately by profileFieldErrors so Laravel's 422 details stay attached to
 * the control they belong to.
 */
export function profileFailureMessage(
  error: unknown,
  fallback: string,
): string {
  if (!(error instanceof ApiError)) {
    return "We couldn’t reach the service. Check your connection and try again.";
  }

  if (isSessionExpired(error)) {
    return "Your session expired. Reload the page and sign in again.";
  }

  if (error.status === 403) {
    return "You don’t have permission to do that.";
  }

  if (error.status === 422) {
    return "Please check the highlighted fields and try again.";
  }

  if (error.status === 429) {
    return "Too many attempts. Wait a moment, then try again.";
  }

  if (error.status >= 500) {
    return "The service is temporarily unavailable. Please try again later.";
  }

  return fallback;
}

/** Keep only the first validation message for each field. */
export function profileFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};

  const fields: Record<string, string> = {};

  for (const [name, messages] of Object.entries(error.errors)) {
    const message = messages[0];

    if (typeof message === "string" && message.length > 0) {
      fields[name] = message;
    }
  }

  return fields;
}
