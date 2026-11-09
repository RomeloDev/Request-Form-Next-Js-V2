import "server-only";

import { cookies, headers } from "next/headers";
import { ApiError } from "@/lib/api";
import {
  parsePrintableRequestResponse,
  type PrintableRequest,
} from "@/lib/requests/printable-requests";

function apiServerUrl(): string {
  return (process.env.API_SERVER_URL ?? "http://127.0.0.1:8000")
    .replace(/\/$/, "");
}

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) return origin;

  const forwardedHost = requestHeaders
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || requestHeaders.get("host");
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol ||
    (host?.startsWith("localhost") ||
    host?.startsWith("127.0.0.1")
      ? "http"
      : "https");

  if (!host) {
    throw new Error("Unable to determine the frontend origin.");
  }

  return `${protocol}://${host}`;
}

export async function getPrintableRequestServer(
  requestId: number,
): Promise<PrintableRequest> {
  if (!Number.isInteger(requestId) || requestId < 1) {
    throw new ApiError(400, "A valid request ID is required.");
  }

  const cookieHeader = (await cookies()).toString();
  const origin = await requestOrigin();
  const response = await fetch(
    `${apiServerUrl()}/api/v1/request-forms/${requestId}/print`,
    {
      headers: {
        Accept: "application/json",
        Cookie: cookieHeader,
        Origin: origin,
        Referer: `${origin}/`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = isErrorPayload(payload) ? payload : null;

    throw new ApiError(
      response.status,
      errorPayload?.message ??
        "The printable request could not be retrieved.",
      errorPayload?.errors ?? {},
    );
  }

  return parsePrintableRequestResponse(payload);
}

function isErrorPayload(
  value: unknown,
): value is {
  message?: string;
  errors?: Record<string, string[]>;
} {
  return Boolean(value && typeof value === "object");
}
