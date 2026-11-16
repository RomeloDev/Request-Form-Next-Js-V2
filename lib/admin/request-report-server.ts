import "server-only";

import { cookies, headers } from "next/headers";
import { ApiError } from "@/lib/api";
import {
  assertValidRequestReportId,
  buildRequestReportsQuery,
  parseRequestReportPage,
  type RequestReportFilters,
  type RequestReportPage,
} from "@/lib/admin/request-reports";
import { parseMyRequestDetailsResponse } from "@/lib/requests/my-requests";
import type { MyRequestDetails } from "@/lib/requests/my-requests";

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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function isValidationErrors(
  value: unknown,
): value is Record<string, string[]> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) =>
        Array.isArray(entry) &&
        entry.every((message) => typeof message === "string"),
    )
  );
}

/**
 * Turn a Laravel failure into an ApiError.
 *
 * Client-facing statuses keep Laravel's safe message and validation errors so
 * the UI can show field feedback and handle expired sessions. Unexpected
 * failures (5xx and anything else) collapse to a generic message so raw
 * backend details never reach the browser.
 */
function toApiError(
  status: number,
  payload: unknown,
  fallbackMessage: string,
): ApiError {
  const message =
    isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : fallbackMessage;
  const errors =
    isRecord(payload) && isValidationErrors(payload.errors)
      ? payload.errors
      : {};

  if (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 419 ||
    status === 422
  ) {
    return new ApiError(status, message, errors);
  }

  return new ApiError(status, fallbackMessage);
}

async function fetchAdminReports(
  path: string,
  fallbackMessage: string,
): Promise<unknown> {
  const cookieHeader = (await cookies()).toString();
  const origin = await requestOrigin();
  const response = await fetch(
    `${apiServerUrl()}/api/v1${path}`,
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
    throw toApiError(
      response.status,
      payload,
      fallbackMessage,
    );
  }

  return payload;
}

export async function getRequestReportsServer(
  filters: RequestReportFilters = {},
): Promise<RequestReportPage> {
  const payload = await fetchAdminReports(
    `/admin/request-reports${buildRequestReportsQuery(filters)}`,
    "Request reports could not be retrieved.",
  );

  return parseRequestReportPage(payload);
}

export async function getRequestReportServer(
  requestId: number,
): Promise<MyRequestDetails> {
  assertValidRequestReportId(requestId);

  const payload = await fetchAdminReports(
    `/admin/request-reports/${requestId}`,
    "The request report could not be retrieved.",
  );

  return parseMyRequestDetailsResponse(payload);
}
