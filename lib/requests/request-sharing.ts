import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type RequestShareFilters = {
  search?: string;
  page?: number;
  perPage?: 10 | 20 | 50;
};

export type RequestShareCandidate = {
  id: number;
  firstname: string;
  lastname: string;
  position: string | null;
  branch_code: string;
  branch_name: string;
};

export type RequestShareRecipient = RequestShareCandidate & {
  shared_at: string | null;
};

export type RequestSharePageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type RequestShareLinks = {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
};

export type RequestShareCandidatePage = {
  data: RequestShareCandidate[];
  links: RequestShareLinks;
  meta: RequestSharePageMeta;
  message: string;
};

export type RequestShareRecipientPage = {
  data: RequestShareRecipient[];
  links: RequestShareLinks;
  meta: RequestSharePageMeta;
  message: string;
};

export type ShareRequestResult = {
  request_id: number;
  shared_count: number;
};

export type RevokeRequestShareResult = {
  request_id: number;
  recipient_id: number;
};

const MAX_SHARE_RECIPIENTS = 50;

function requestShareQuery(
  filters: RequestShareFilters,
): string {
  const query = new URLSearchParams();
  const search = filters.search?.trim();

  if (search) {
    query.set("search", search);
  }

  if (filters.page) {
    query.set("page", String(filters.page));
  }

  if (filters.perPage) {
    query.set("per_page", String(filters.perPage));
  }

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
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

function isPositiveInteger(
  value: unknown,
): value is number {
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

function isNullableString(
  value: unknown,
): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNonNegativeInteger(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0)
  );
}

function validateRequestId(requestId: number): void {
  if (!isPositiveInteger(requestId)) {
    throw new ApiError(
      400,
      "A valid request ID is required.",
    );
  }
}

function validateRecipientId(recipientId: number): void {
  if (!isPositiveInteger(recipientId)) {
    throw new ApiError(
      400,
      "A valid recipient ID is required.",
    );
  }
}

/**
 * Validates the share payload before any network call: at least one
 * recipient, at most 50, each a positive integer, with no duplicates.
 */
function validateShareUserIds(
  userIds: number[],
): number[] {
  if (userIds.length === 0) {
    throw new ApiError(
      422,
      "Select at least one recipient to share this request with.",
      {
        user_ids: [
          "Select at least one recipient to share this request with.",
        ],
      },
    );
  }

  if (userIds.length > MAX_SHARE_RECIPIENTS) {
    throw new ApiError(
      422,
      "Select no more than 50 recipients.",
      {
        user_ids: ["Select no more than 50 recipients."],
      },
    );
  }

  for (const userId of userIds) {
    if (!isPositiveInteger(userId)) {
      throw new ApiError(
        422,
        "Recipient IDs must be positive integers.",
        {
          user_ids: [
            "Recipient IDs must be positive integers.",
          ],
        },
      );
    }
  }

  if (new Set(userIds).size !== userIds.length) {
    throw new ApiError(
      422,
      "Remove duplicate recipients from the selection.",
      {
        user_ids: [
          "Remove duplicate recipients from the selection.",
        ],
      },
    );
  }

  return userIds;
}

/**
 * Rebuilds a candidate from allowlisted fields only, so unexpected backend
 * keys (e.g. email, role) are discarded and never reach the UI.
 */
function toRequestShareCandidate(
  value: unknown,
): RequestShareCandidate | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  if (!isPositiveInteger(id)) {
    return null;
  }

  const firstname = value.firstname;
  if (typeof firstname !== "string") {
    return null;
  }

  const lastname = value.lastname;
  if (typeof lastname !== "string") {
    return null;
  }

  const position = value.position;
  if (!isNullableString(position)) {
    return null;
  }

  const branchCode = value.branch_code;
  if (typeof branchCode !== "string") {
    return null;
  }

  const branchName = value.branch_name;
  if (typeof branchName !== "string") {
    return null;
  }

  return {
    id,
    firstname,
    lastname,
    position,
    branch_code: branchCode,
    branch_name: branchName,
  };
}

function toRequestShareRecipient(
  value: unknown,
): RequestShareRecipient | null {
  const candidate = toRequestShareCandidate(value);

  if (!candidate || !isRecord(value)) {
    return null;
  }

  const sharedAt = value.shared_at;
  if (!isNullableString(sharedAt)) {
    return null;
  }

  return {
    ...candidate,
    shared_at: sharedAt,
  };
}

function toPaginationMeta(
  value: unknown,
): RequestSharePageMeta | null {
  if (!isRecord(value)) {
    return null;
  }

  const currentPage = value.current_page;
  if (!isPositiveInteger(currentPage)) {
    return null;
  }

  const lastPage = value.last_page;
  if (!isPositiveInteger(lastPage)) {
    return null;
  }

  const perPage = value.per_page;
  if (!isPositiveInteger(perPage)) {
    return null;
  }

  const total = value.total;
  if (!isNonNegativeInteger(total)) {
    return null;
  }

  const from = value.from;
  if (!isNullableNonNegativeInteger(from)) {
    return null;
  }

  const to = value.to;
  if (!isNullableNonNegativeInteger(to)) {
    return null;
  }

  return {
    current_page: currentPage,
    last_page: lastPage,
    per_page: perPage,
    total,
    from,
    to,
  };
}

function toRequestShareLinks(
  value: unknown,
): RequestShareLinks | null {
  if (!isRecord(value)) {
    return null;
  }

  const first = value.first;
  if (!isNullableString(first)) {
    return null;
  }

  const last = value.last;
  if (!isNullableString(last)) {
    return null;
  }

  const prev = value.prev;
  if (!isNullableString(prev)) {
    return null;
  }

  const next = value.next;
  if (!isNullableString(next)) {
    return null;
  }

  return {
    first,
    last,
    prev,
    next,
  };
}

type RequestShareListPayload<T> = {
  data: T[];
  links: RequestShareLinks;
  meta: RequestSharePageMeta;
  message: string;
};

/**
 * Rebuilds a paginated list response: data items are allowlist-rebuilt via
 * toItem (any malformed item invalidates the whole response), meta is
 * required, including the standard paginator links and response message.
 */
function toRequestShareList<T>(
  value: unknown,
  toItem: (item: unknown) => T | null,
): RequestShareListPayload<T> | null {
  if (!isRecord(value)) {
    return null;
  }

  const meta = toPaginationMeta(value.meta);
  const links = toRequestShareLinks(value.links);

  if (
    !meta ||
    !links ||
    typeof value.message !== "string" ||
    !Array.isArray(value.data)
  ) {
    return null;
  }

  const data: T[] = [];

  for (const item of value.data) {
    const parsedItem = toItem(item);

    if (!parsedItem) {
      return null;
    }

    data.push(parsedItem);
  }

  const payload: RequestShareListPayload<T> = {
    data,
    links,
    meta,
    message: value.message,
  };

  return payload;
}

function toShareRequestResult(
  value: unknown,
): ShareRequestResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const requestId = value.request_id;
  if (!isPositiveInteger(requestId)) {
    return null;
  }

  const sharedCount = value.shared_count;
  if (!isNonNegativeInteger(sharedCount)) {
    return null;
  }

  return {
    request_id: requestId,
    shared_count: sharedCount,
  };
}

function toRevokeRequestShareResult(
  value: unknown,
): RevokeRequestShareResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const requestId = value.request_id;
  if (!isPositiveInteger(requestId)) {
    return null;
  }

  const recipientId = value.recipient_id;
  if (!isPositiveInteger(recipientId)) {
    return null;
  }

  return {
    request_id: requestId,
    recipient_id: recipientId,
  };
}

export async function getRequestShareCandidates(
  requestId: number,
  filters: RequestShareFilters = {},
  signal?: AbortSignal,
): Promise<RequestShareCandidatePage> {
  validateRequestId(requestId);

  const response = await apiRequest<unknown>(
    `/request-forms/${requestId}/share-candidates${requestShareQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  const payload = toRequestShareList(
    response,
    toRequestShareCandidate,
  );

  if (!payload) {
    throw new ApiError(
      502,
      "The service returned an unexpected share candidate list.",
    );
  }

  return payload;
}

export async function shareRequestWithUsers(
  requestId: number,
  userIds: number[],
): Promise<ShareRequestResult> {
  validateRequestId(requestId);
  const validatedUserIds = validateShareUserIds(userIds);

  const csrfToken = await prepareCsrfSession();
  const response = await apiRequest<unknown>(
    `/request-forms/${requestId}/shares`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify({ user_ids: validatedUserIds }),
    },
  );

  if (!isRecord(response) || typeof response.message !== "string") {
    throw new ApiError(
      502,
      "The service returned an unexpected share response.",
    );
  }

  const data = toShareRequestResult(response.data);

  if (!data) {
    throw new ApiError(
      502,
      "The service returned an unexpected share response.",
    );
  }

  return data;
}

export async function getRequestShareRecipients(
  requestId: number,
  filters: RequestShareFilters = {},
  signal?: AbortSignal,
): Promise<RequestShareRecipientPage> {
  validateRequestId(requestId);

  const response = await apiRequest<unknown>(
    `/request-forms/${requestId}/shares${requestShareQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  const payload = toRequestShareList(
    response,
    toRequestShareRecipient,
  );

  if (!payload) {
    throw new ApiError(
      502,
      "The service returned an unexpected share recipient list.",
    );
  }

  return payload;
}

export async function revokeRequestShare(
  requestId: number,
  recipientId: number,
): Promise<RevokeRequestShareResult> {
  validateRequestId(requestId);
  validateRecipientId(recipientId);

  const csrfToken = await prepareCsrfSession();
  const response = await apiRequest<unknown>(
    `/request-forms/${requestId}/shares/${recipientId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
    },
  );

  if (!isRecord(response) || typeof response.message !== "string") {
    throw new ApiError(
      502,
      "The service returned an unexpected revoke response.",
    );
  }

  const data = toRevokeRequestShareResult(response.data);

  if (!data) {
    throw new ApiError(
      502,
      "The service returned an unexpected revoke response.",
    );
  }

  return data;
}
