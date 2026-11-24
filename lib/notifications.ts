import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type NotificationKind =
  | "request_action_required"
  | "request_approved"
  | "request_disapproved"
  | "request_completed"
  | "request_shared";

export type NotificationTarget =
  | "my_request"
  | "assigned_request"
  | "shared_request";

export type NotificationItem = {
  id: string;
  kind: NotificationKind | null;
  title: string | null;
  message: string | null;
  target: NotificationTarget | null;
  request_id: number | null;
  request_code: string | null;
  form_type: string | null;
  status: string | null;
  approval_level: number | null;
  approval_step_type: string | null;
  actor_name: string | null;
  read_at: string | null;
  created_at: string | null;
};

export type NotificationPage = {
  data: NotificationItem[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  message: string;
};

export type NotificationFilters = {
  page?: number;
  perPage?: 10 | 20 | 50;
  unreadOnly?: boolean;
};

export type UnreadNotificationCount = {
  unread_count: number;
};

export type MarkAllNotificationsReadResult = {
  updated: number;
};

export function notificationRouteForItem(
  item: NotificationItem,
): string | null {
  const requestId = item.request_id;
  const requestCode = item.request_code?.trim();

  if (
    requestId === null ||
    !Number.isSafeInteger(requestId) ||
    requestId < 1 ||
    !requestCode
  ) {
    return null;
  }

  const query = new URLSearchParams();
  query.set("request_id", String(requestId));
  query.set("search", requestCode);

  if (item.target === "my_request") {
    return `/request?${query.toString()}`;
  }

  if (item.target === "assigned_request") {
    query.set("assignment_status", "ALL");
    return `/approver/request?${query.toString()}`;
  }

  if (item.target === "shared_request") {
    return `/shared-requests?${query.toString()}`;
  }

  return null;
}

const notificationKinds: ReadonlySet<string> = new Set([
  "request_action_required",
  "request_approved",
  "request_disapproved",
  "request_completed",
  "request_shared",
]);

const notificationTargets: ReadonlySet<string> = new Set([
  "my_request",
  "assigned_request",
  "shared_request",
]);

const notificationPerPageValues: readonly number[] = [10, 20, 50];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isNullableString(
  value: unknown,
): value is string | null {
  return value === null || typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableNonEmptyString(
  value: unknown,
): value is string | null {
  return value === null || isNonEmptyString(value);
}

function isNullablePositiveInteger(
  value: unknown,
): value is number | null {
  return value === null || isPositiveInteger(value);
}

function isIsoDateTimeString(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetSign = match[7];
  const offsetHour = match[8] ? Number(match[8]) : 0;
  const offsetMinute = match[9] ? Number(match[9]) : 0;

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    Boolean(
      offsetSign &&
      (
        offsetHour > 14 ||
        offsetMinute > 59 ||
        (offsetHour === 14 && offsetMinute !== 0)
      )
    )
  ) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function isNullableIsoDateTimeString(
  value: unknown,
): value is string | null {
  return value === null || isIsoDateTimeString(value);
}

function isNullableNotificationKind(
  value: unknown,
): value is NotificationKind | null {
  return (
    value === null ||
    (
      typeof value === "string" &&
      notificationKinds.has(value)
    )
  );
}

function isNullableNotificationTarget(
  value: unknown,
): value is NotificationTarget | null {
  return (
    value === null ||
    (
      typeof value === "string" &&
      notificationTargets.has(value)
    )
  );
}

function isNotificationUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validateNotificationId(notificationId: string): void {
  if (!isNotificationUuid(notificationId)) {
    throw new ApiError(
      422,
      "A valid notification ID is required.",
    );
  }
}

function validateFilterPage(page: number | undefined): void {
  if (page !== undefined && !isPositiveInteger(page)) {
    throw new ApiError(
      422,
      "The page must be a positive integer.",
    );
  }
}

function validateFilterPerPage(perPage: number | undefined): void {
  if (
    perPage !== undefined &&
    (
      typeof perPage !== "number" ||
      !notificationPerPageValues.includes(perPage)
    )
  ) {
    throw new ApiError(
      422,
      "The page size must be 10, 20, or 50.",
    );
  }
}

function validateFilterUnreadOnly(unreadOnly: boolean | undefined): void {
  if (unreadOnly !== undefined && typeof unreadOnly !== "boolean") {
    throw new ApiError(
      422,
      "The unread filter must be a boolean.",
    );
  }
}

export function buildNotificationQuery(
  filters: NotificationFilters,
): string {
  validateFilterPage(filters.page);
  validateFilterPerPage(filters.perPage);
  validateFilterUnreadOnly(filters.unreadOnly);

  const query = new URLSearchParams();

  if (filters.page !== undefined) {
    query.set("page", String(filters.page));
  }

  if (filters.perPage !== undefined) {
    query.set("per_page", String(filters.perPage));
  }

  if (filters.unreadOnly === true) {
    query.set("unread_only", "true");
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function toNotificationItem(
  value: unknown,
): NotificationItem | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isNotificationUuid(value.id) ||
    !isNullableNotificationKind(value.kind) ||
    !isNullableNonEmptyString(value.title) ||
    !isNullableNonEmptyString(value.message) ||
    !isNullableNotificationTarget(value.target) ||
    !isNullablePositiveInteger(value.request_id) ||
    !isNullableNonEmptyString(value.request_code) ||
    !isNullableNonEmptyString(value.form_type) ||
    !isNullableNonEmptyString(value.status) ||
    !isNullablePositiveInteger(value.approval_level) ||
    !isNullableNonEmptyString(value.approval_step_type) ||
    !isNullableNonEmptyString(value.actor_name) ||
    !isNullableIsoDateTimeString(value.read_at) ||
    !isNullableIsoDateTimeString(value.created_at)
  ) {
    return null;
  }

  const expectedTarget: NotificationTarget | null =
    value.kind === "request_action_required"
      ? "assigned_request"
      : value.kind === "request_approved" ||
          value.kind === "request_disapproved" ||
          value.kind === "request_completed"
        ? "my_request"
        : value.kind === "request_shared"
          ? "shared_request"
          : null;

  const hasLegacyPayload = value.kind === null;

  if (
    hasLegacyPayload &&
    (
      value.title !== null ||
      value.message !== null ||
      value.target !== null ||
      value.request_id !== null ||
      value.request_code !== null ||
      value.form_type !== null ||
      value.status !== null ||
      value.approval_level !== null ||
      value.approval_step_type !== null ||
      value.actor_name !== null
    )
  ) {
    return null;
  }

  if (
    !hasLegacyPayload &&
    (
      value.title === null ||
      value.message === null ||
      value.request_id === null ||
      value.request_code === null ||
      value.form_type === null
    )
  ) {
    return null;
  }

  if (
    value.kind !== null &&
    (
      expectedTarget === null ||
      value.target !== expectedTarget
    )
  ) {
    return null;
  }

  if (
    (value.approval_level === null) !==
    (value.approval_step_type === null)
  ) {
    return null;
  }

  return {
    id: value.id,
    kind: value.kind,
    title: value.title,
    message: value.message,
    target: value.target,
    request_id: value.request_id,
    request_code: value.request_code,
    form_type: value.form_type,
    status: value.status,
    approval_level: value.approval_level,
    approval_step_type: value.approval_step_type,
    actor_name: value.actor_name,
    read_at: value.read_at,
    created_at: value.created_at,
  };
}

function toNotificationLinks(
  value: unknown,
): NotificationPage["links"] | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isNullableString(value.first) ||
    !isNullableString(value.last) ||
    !isNullableString(value.prev) ||
    !isNullableString(value.next)
  ) {
    return null;
  }

  return {
    first: value.first,
    last: value.last,
    prev: value.prev,
    next: value.next,
  };
}

function toNotificationMeta(
  value: unknown,
): NotificationPage["meta"] | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isPositiveInteger(value.current_page) ||
    !isPositiveInteger(value.last_page) ||
    typeof value.per_page !== "number" ||
    !notificationPerPageValues.includes(value.per_page) ||
    !isNonNegativeInteger(value.total) ||
    !isNullablePositiveInteger(value.from) ||
    !isNullablePositiveInteger(value.to)
  ) {
    return null;
  }

  if (
    value.current_page > value.last_page ||
    value.from !== null &&
    value.to !== null &&
    value.from > value.to
  ) {
    return null;
  }

  return {
    current_page: value.current_page,
    last_page: value.last_page,
    per_page: value.per_page,
    total: value.total,
    from: value.from,
    to: value.to,
  };
}

export function parseNotificationPage(
  value: unknown,
): NotificationPage {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new ApiError(
      502,
      "The service returned an unexpected notification list.",
    );
  }

  const data: NotificationItem[] = [];

  for (const item of value.data) {
    const parsedItem = toNotificationItem(item);
    if (!parsedItem) {
      throw new ApiError(
        502,
        "The service returned an unexpected notification list.",
      );
    }
    data.push(parsedItem);
  }

  const links = toNotificationLinks(value.links);
  const meta = toNotificationMeta(value.meta);

  if (!links || !meta || typeof value.message !== "string") {
    throw new ApiError(
      502,
      "The service returned an unexpected notification list.",
    );
  }

  return {
    data,
    links,
    meta,
    message: value.message,
  };
}

export function parseUnreadNotificationCount(
  value: unknown,
): UnreadNotificationCount {
  if (
    !isRecord(value) ||
    !isRecord(value.data) ||
    !isNonNegativeInteger(value.data.unread_count)
  ) {
    throw new ApiError(
      502,
      "The service returned an unexpected unread notification count.",
    );
  }

  return {
    unread_count: value.data.unread_count,
  };
}

export function parseMarkedNotification(
  value: unknown,
): NotificationItem {
  if (
    !isRecord(value) ||
    typeof value.message !== "string"
  ) {
    throw new ApiError(
      502,
      "The service returned an unexpected notification response.",
    );
  }

  const item = toNotificationItem(value.data);
  if (!item) {
    throw new ApiError(
      502,
      "The service returned an unexpected notification response.",
    );
  }

  return item;
}

export function parseMarkAllNotificationsReadResult(
  value: unknown,
): MarkAllNotificationsReadResult {
  if (
    !isRecord(value) ||
    typeof value.message !== "string" ||
    !isRecord(value.data) ||
    !isNonNegativeInteger(value.data.updated)
  ) {
    throw new ApiError(
      502,
      "The service returned an unexpected mark-all response.",
    );
  }

  return {
    updated: value.data.updated,
  };
}

export async function getNotifications(
  filters: NotificationFilters = {},
  signal?: AbortSignal,
): Promise<NotificationPage> {
  const response = await apiRequest<unknown>(
    `/notifications${buildNotificationQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseNotificationPage(response);
}

export async function getUnreadNotificationCount(
  signal?: AbortSignal,
): Promise<UnreadNotificationCount> {
  const response = await apiRequest<unknown>(
    "/notifications/unread-count",
    {
      credentials: "include",
      signal,
    },
  );

  return parseUnreadNotificationCount(response);
}

export async function markNotificationRead(
  notificationId: string,
  signal?: AbortSignal,
): Promise<NotificationItem> {
  validateNotificationId(notificationId);

  const csrfToken = await prepareCsrfSession();
  const response = await apiRequest<unknown>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
      signal,
    },
  );

  return parseMarkedNotification(response);
}

export async function markAllNotificationsRead(
  signal?: AbortSignal,
): Promise<MarkAllNotificationsReadResult> {
  const csrfToken = await prepareCsrfSession();
  const response = await apiRequest<unknown>(
    "/notifications/read-all",
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
      signal,
    },
  );

  return parseMarkAllNotificationsReadResult(response);
}
