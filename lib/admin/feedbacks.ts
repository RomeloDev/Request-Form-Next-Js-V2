import { ApiError, apiRequest } from "@/lib/api";

export type FeedbackPerPage = 10 | 20 | 50;

export type FeedbackFilters = {
  page?: number;
  perPage?: FeedbackPerPage;
};

/**
 * Mirrors App\Http\Resources\FeedbackResource exactly.
 *
 * phone and other_opinion are nullable in the database, and created_at is
 * nullable in the Resource, so all three accept null. No other backend
 * fields are exposed to the UI.
 */
export type FeedbackListItem = {
  id: number;
  feedback_code: string;
  name: string;
  email: string;
  phone: string | null;
  department: string;
  opinion: string;
  other_opinion: string | null;
  message: string;
  created_at: string | null;
};

export type FeedbackPaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: FeedbackPerPage;
  total: number;
  from: number | null;
  to: number | null;
};

export type FeedbackPage = {
  data: FeedbackListItem[];
  meta: FeedbackPaginationMeta;
};

const FEEDBACK_PER_PAGE: readonly FeedbackPerPage[] = [
  10,
  20,
  50,
];

const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function isNullableString(
  value: unknown,
): value is string | null {
  return value === null || typeof value === "string";
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1
  );
}

function isNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isNullablePositiveInteger(
  value: unknown,
): value is number | null {
  return value === null || isPositiveInteger(value);
}

/** An ISO-8601 timestamp such as Laravel's toISOString() output. */
function isIsoDateTimeString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    ISO_DATE_TIME_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isNullableIsoDateTimeString(
  value: unknown,
): value is string | null {
  return value === null || isIsoDateTimeString(value);
}

export function isFeedbackPerPage(
  value: unknown,
): value is FeedbackPerPage {
  return (
    typeof value === "number" &&
    (FEEDBACK_PER_PAGE as readonly number[]).includes(value)
  );
}

/**
 * Laravel paginator links use string URLs or null. They are validated so a
 * malformed payload is rejected, but they are intentionally not returned:
 * the UI paginates by number and must never render an API-supplied URL
 * without its own validation.
 */
function hasFeedbackPaginationLinks(
  value: unknown,
): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return ["first", "last", "prev", "next"].every(
    (key) => isNullableString(value[key]),
  );
}

function toFeedbackListItem(
  value: unknown,
): FeedbackListItem | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isPositiveInteger(value.id) ||
    typeof value.feedback_code !== "string" ||
    typeof value.name !== "string" ||
    typeof value.email !== "string" ||
    !isNullableString(value.phone) ||
    typeof value.department !== "string" ||
    typeof value.opinion !== "string" ||
    !isNullableString(value.other_opinion) ||
    typeof value.message !== "string" ||
    !isNullableIsoDateTimeString(value.created_at)
  ) {
    return null;
  }

  return {
    id: value.id,
    feedback_code: value.feedback_code,
    name: value.name,
    email: value.email,
    phone: value.phone,
    department: value.department,
    opinion: value.opinion,
    other_opinion: value.other_opinion,
    message: value.message,
    created_at: value.created_at,
  };
}

function toFeedbackPaginationMeta(
  value: unknown,
): FeedbackPaginationMeta | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isPositiveInteger(value.current_page) ||
    !isPositiveInteger(value.last_page) ||
    !isFeedbackPerPage(value.per_page) ||
    !isNonNegativeInteger(value.total) ||
    !isNullablePositiveInteger(value.from) ||
    !isNullablePositiveInteger(value.to)
  ) {
    return null;
  }

  if (
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

/**
 * Validate an untrusted Admin Feedbacks list response and return only the
 * fields the UI needs. Unknown extra fields are dropped, never forwarded.
 */
export function parseFeedbackPage(
  value: unknown,
): FeedbackPage {
  const unexpectedResponse = () =>
    new ApiError(
      502,
      "The service returned an unexpected feedback list.",
    );

  if (
    !isRecord(value) ||
    typeof value.message !== "string" ||
    !Array.isArray(value.data) ||
    !hasFeedbackPaginationLinks(value.links) ||
    !isRecord(value.meta)
  ) {
    throw unexpectedResponse();
  }

  const data: FeedbackListItem[] = [];

  for (const entry of value.data) {
    const feedback = toFeedbackListItem(entry);

    if (!feedback) {
      throw unexpectedResponse();
    }

    data.push(feedback);
  }

  const meta = toFeedbackPaginationMeta(value.meta);

  if (!meta) {
    throw unexpectedResponse();
  }

  return { data, meta };
}

/**
 * Build query parameters from validated page and page-size values only.
 *
 * Laravel's ListFeedbackRequest accepts no search, filter, or sort
 * parameters, so none are sent. Invalid values throw instead of being
 * dropped, because silently dropping them would show a different page
 * than the caller asked for.
 */
export function buildFeedbacksQuery(
  filters: FeedbackFilters = {},
): string {
  const query = new URLSearchParams();

  if (filters.page !== undefined) {
    if (!isPositiveInteger(filters.page)) {
      throw new ApiError(
        400,
        "Select a valid feedback page.",
      );
    }

    query.set("page", String(filters.page));
  }

  if (filters.perPage !== undefined) {
    if (!isFeedbackPerPage(filters.perPage)) {
      throw new ApiError(
        400,
        "Select a valid feedback page size.",
      );
    }

    query.set("per_page", String(filters.perPage));
  }

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
}

export async function getFeedbacks(
  filters: FeedbackFilters = {},
  signal?: AbortSignal,
): Promise<FeedbackPage> {
  const response = await apiRequest<unknown>(
    `/admin/feedbacks${buildFeedbacksQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseFeedbackPage(response);
}
