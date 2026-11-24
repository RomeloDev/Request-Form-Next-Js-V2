import "server-only";

import { cookies, headers } from "next/headers";
import { ApiError } from "@/lib/api";
import {
  buildNotificationQuery,
  parseNotificationPage,
  parseUnreadNotificationCount,
  type NotificationFilters,
  type NotificationPage,
  type UnreadNotificationCount,
} from "@/lib/notifications";

function apiServerUrl(): string {
  return (process.env.API_SERVER_URL ?? "http://127.0.0.1:8000")
    .replace(/\/$/, "");
}

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) {
    return origin;
  }

  const referer = requestHeaders.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // Fall through to the forwarded request host.
    }
  }

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
    (
      host?.startsWith("localhost") ||
      host?.startsWith("127.0.0.1")
        ? "http"
        : "https"
    );

  if (!host) {
    throw new Error("Unable to determine the frontend origin.");
  }

  return `${protocol}://${host}`;
}

function genericApiError(
  status: number,
  fallbackMessage: string,
): ApiError {
  if (status === 401) {
    return new ApiError(
      status,
      "Please sign in again.",
    );
  }

  if (status === 403) {
    return new ApiError(
      status,
      "You do not have permission to access notifications.",
    );
  }

  if (status === 404) {
    return new ApiError(
      status,
      "Notifications were not found.",
    );
  }

  if (status === 419) {
    return new ApiError(
      status,
      "Please reload and try again.",
    );
  }

  if (status === 422) {
    return new ApiError(
      status,
      "The notification request could not be completed.",
    );
  }

  return new ApiError(status, fallbackMessage);
}

export async function getNotificationsServer(
  filters: NotificationFilters = {},
): Promise<NotificationPage> {
  const cookieHeader = (await cookies()).toString();
  const origin = await requestOrigin();
  const response = await fetch(
    `${apiServerUrl()}/api/v1/notifications${buildNotificationQuery(filters)}`,
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
    throw genericApiError(
      response.status,
      "Notifications could not be retrieved.",
    );
  }

  return parseNotificationPage(payload);
}

export async function getUnreadNotificationCountServer(
): Promise<UnreadNotificationCount> {
  const cookieHeader = (await cookies()).toString();
  const origin = await requestOrigin();
  const response = await fetch(
    `${apiServerUrl()}/api/v1/notifications/unread-count`,
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
    throw genericApiError(
      response.status,
      "The unread notification count could not be retrieved.",
    );
  }

  return parseUnreadNotificationCount(payload);
}

export async function getInitialNotificationStateServer(): Promise<{
  page: NotificationPage;
  unreadCount: number;
}> {
  const [page, unreadCount] = await Promise.all([
    getNotificationsServer({
      page: 1,
      perPage: 10,
      unreadOnly: false,
    }),
    getUnreadNotificationCountServer(),
  ]);

  return {
    page,
    unreadCount: unreadCount.unread_count,
  };
}
