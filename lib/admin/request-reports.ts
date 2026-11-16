import { ApiError, apiRequest } from "@/lib/api";
import { CASH_DISBURSEMENT_FORM_TYPE } from "@/lib/requests/cash-disbursements";
import { CHECK_ISSUANCE_FORM_TYPE } from "@/lib/requests/check-issuances";
import { PURCHASE_ORDER_FORM_TYPE } from "@/lib/requests/purchase-orders";
import {
  isRequestCurrency,
  type RequestCurrency,
} from "@/lib/requests/request-currencies";
import {
  parseMyRequestDetailsResponse,
  type MyRequest,
  type MyRequestDetails,
  type MyRequestPerson,
  type MyRequestStatus,
} from "@/lib/requests/my-requests";
import { STOCK_REQUISITION_FORM_TYPE } from "@/lib/requests/stock-requisitions";

/**
 * Exact RequestFormType values accepted by the Admin Reports filters.
 *
 * Four of these values already exist as feature constants; the other four
 * are declared here so the report contract has one complete allowlist.
 * Never match form types by partial text.
 */
export const REQUEST_REPORT_FORM_TYPES = [
  STOCK_REQUISITION_FORM_TYPE,
  PURCHASE_ORDER_FORM_TYPE,
  CASH_DISBURSEMENT_FORM_TYPE,
  CHECK_ISSUANCE_FORM_TYPE,
] as const;

export type RequestReportFormType =
  (typeof REQUEST_REPORT_FORM_TYPES)[number];

export type RequestReportStatus = MyRequestStatus;

export type RequestReportStatusFilter = "ALL" | RequestReportStatus;

export type RequestReportFormTypeFilter =
  | "ALL"
  | RequestReportFormType;

export type RequestReportSort =
  | "id"
  | "request_code"
  | "form_type"
  | "status"
  | "grand_total"
  | "created_at";

export type RequestReportDirection = "asc" | "desc";

export type RequestReportPerPage = 10 | 20 | 50;

export type RequestReportFilters = {
  search?: string;
  status?: RequestReportStatusFilter;
  formType?: RequestReportFormTypeFilter;
  branchId?: number;
  /** Calendar date in YYYY-MM-DD. Laravel owns timezone interpretation. */
  dateFrom?: string;
  /** Calendar date in YYYY-MM-DD. Laravel owns timezone interpretation. */
  dateTo?: string;
  sort?: RequestReportSort;
  direction?: RequestReportDirection;
  page?: number;
  perPage?: RequestReportPerPage;
};

export type RequestReportRequester = MyRequestPerson;

export type RequestReportBranch = MyRequest["branch"];

export type RequestReportListItem = {
  id: number;
  request_code: string;
  form_type: RequestReportFormType;
  kind_of_request: string | null;
  currency: RequestCurrency;
  status: RequestReportStatus;
  grand_total: string;
  requester: RequestReportRequester;
  branch: RequestReportBranch;
  created_at: string | null;
};

export type RequestReportPaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: RequestReportPerPage;
  total: number;
  from: number | null;
  to: number | null;
};

export type RequestReportPage = {
  data: RequestReportListItem[];
  meta: RequestReportPaginationMeta;
};

const REQUEST_REPORT_STATUSES: readonly RequestReportStatus[] = [
  "Pending",
  "Ongoing",
  "Completed",
  "Disapproved",
  "Canceled",
];

const REQUEST_REPORT_SORTS: readonly RequestReportSort[] = [
  "id",
  "request_code",
  "form_type",
  "status",
  "grand_total",
  "created_at",
];

const REQUEST_REPORT_DIRECTIONS: readonly RequestReportDirection[] = [
  "asc",
  "desc",
];

const REQUEST_REPORT_PER_PAGE: readonly RequestReportPerPage[] = [
  10,
  20,
  50,
];

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;

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

/** A decimal string, as returned by Laravel decimal casts. */
function isDecimalString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    DECIMAL_PATTERN.test(value)
  );
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

/**
 * Validate a calendar date string without converting it between timezones.
 * The UTC arithmetic only checks that the day exists; it never shifts the
 * value, because Laravel owns the Asia/Manila-to-UTC interpretation.
 */
export function isRequestReportDate(
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // setUTCFullYear avoids Date.UTC()'s 1900 offset for years 0-99.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isRequestReportStatus(
  value: unknown,
): value is RequestReportStatus {
  return (
    typeof value === "string" &&
    (REQUEST_REPORT_STATUSES as readonly string[]).includes(
      value,
    )
  );
}

export function isRequestReportFormType(
  value: unknown,
): value is RequestReportFormType {
  return (
    typeof value === "string" &&
    (REQUEST_REPORT_FORM_TYPES as readonly string[]).includes(
      value,
    )
  );
}

export function isRequestReportSort(
  value: unknown,
): value is RequestReportSort {
  return (
    typeof value === "string" &&
    (REQUEST_REPORT_SORTS as readonly string[]).includes(value)
  );
}

export function isRequestReportDirection(
  value: unknown,
): value is RequestReportDirection {
  return (
    typeof value === "string" &&
    (REQUEST_REPORT_DIRECTIONS as readonly string[]).includes(
      value,
    )
  );
}

export function isRequestReportPerPage(
  value: unknown,
): value is RequestReportPerPage {
  return (
    typeof value === "number" &&
    (REQUEST_REPORT_PER_PAGE as readonly number[]).includes(
      value,
    )
  );
}

export function isRequestReportId(
  value: unknown,
): value is number {
  return isPositiveInteger(value);
}

/** Reject invalid IDs before building an API path. */
export function assertValidRequestReportId(
  requestId: number,
): void {
  if (!isRequestReportId(requestId)) {
    throw new ApiError(
      400,
      "A valid request ID is required.",
    );
  }
}

function isRequestReportRequester(
  value: unknown,
): value is RequestReportRequester {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPositiveInteger(value.id) &&
    typeof value.firstname === "string" &&
    typeof value.lastname === "string" &&
    isNullableString(value.position)
  );
}

function isRequestReportBranch(
  value: unknown,
): value is RequestReportBranch {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPositiveInteger(value.id) &&
    typeof value.branch_code === "string" &&
    typeof value.branch_name === "string" &&
    typeof value.branch === "string" &&
    typeof value.acronym === "string"
  );
}

function isNullablePositiveInteger(
  value: unknown,
): value is number | null {
  return value === null || isPositiveInteger(value);
}

/**
 * Laravel paginator links use string URLs or null. They are validated so a
 * malformed payload is rejected, but they are intentionally not returned:
 * the report UI paginates by number and must never render an API-supplied
 * URL without its own validation.
 */
function hasRequestReportPaginationLinks(
  value: unknown,
): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return ["first", "last", "prev", "next"].every(
    (key) => isNullableString(value[key]),
  );
}

function toRequestReportListItem(
  value: unknown,
): RequestReportListItem | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isPositiveInteger(value.id) ||
    typeof value.request_code !== "string" ||
    !isRequestReportFormType(value.form_type) ||
    !isNullableString(value.kind_of_request) ||
    typeof value.currency !== "string" ||
    !isRequestCurrency(value.currency) ||
    !isRequestReportStatus(value.status) ||
    !isDecimalString(value.grand_total) ||
    !isRequestReportRequester(value.requester) ||
    !isRequestReportBranch(value.branch) ||
    !isNullableIsoDateTimeString(value.created_at)
  ) {
    return null;
  }

  return {
    id: value.id,
    request_code: value.request_code,
    form_type: value.form_type,
    kind_of_request: value.kind_of_request,
    currency: value.currency,
    status: value.status,
    grand_total: value.grand_total,
    requester: {
      id: value.requester.id,
      firstname: value.requester.firstname,
      lastname: value.requester.lastname,
      position: value.requester.position,
    },
    branch: {
      id: value.branch.id,
      branch_code: value.branch.branch_code,
      branch_name: value.branch.branch_name,
      branch: value.branch.branch,
      acronym: value.branch.acronym,
    },
    created_at: value.created_at,
  };
}

function toRequestReportPaginationMeta(
  value: unknown,
): RequestReportPaginationMeta | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isPositiveInteger(value.current_page) ||
    !isPositiveInteger(value.last_page) ||
    !isRequestReportPerPage(value.per_page) ||
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
 * Validate an untrusted Admin Reports list response and return only the
 * fields the UI needs. Unknown extra fields are dropped, never forwarded.
 */
export function parseRequestReportPage(
  value: unknown,
): RequestReportPage {
  const unexpectedResponse = () =>
    new ApiError(
      502,
      "The service returned an unexpected request report list.",
    );

  if (
    !isRecord(value) ||
    typeof value.message !== "string" ||
    !Array.isArray(value.data) ||
    !hasRequestReportPaginationLinks(value.links) ||
    !isRecord(value.meta)
  ) {
    throw unexpectedResponse();
  }

  const data: RequestReportListItem[] = [];

  for (const entry of value.data) {
    const report = toRequestReportListItem(entry);

    if (!report) {
      throw unexpectedResponse();
    }

    data.push(report);
  }

  const meta = toRequestReportPaginationMeta(value.meta);

  if (!meta) {
    throw unexpectedResponse();
  }

  return { data, meta };
}

/**
 * Map camelCase filters to the backend's snake_case query parameters.
 *
 * Validation is fail-closed: an unexpected value for an allowlisted field
 * throws instead of being dropped, because silently dropping a filter would
 * show more reports than the caller asked for. Dates are the one exception:
 * both must be present and valid before either is sent, and Laravel performs
 * the actual range validation.
 */
export function buildRequestReportsQuery(
  filters: RequestReportFilters = {},
): string {
  const query = new URLSearchParams();
  const search = filters.search?.trim();

  if (search) {
    if (search.length > 100) {
      throw new ApiError(
        400,
        "The report search must not exceed 100 characters.",
      );
    }

    query.set("search", search);
  }

  if (filters.status !== undefined) {
    if (
      filters.status !== "ALL" &&
      !isRequestReportStatus(filters.status)
    ) {
      throw new ApiError(
        400,
        "Select a valid report status.",
      );
    }

    query.set("status", filters.status);
  }

  if (filters.formType !== undefined) {
    if (
      filters.formType !== "ALL" &&
      !isRequestReportFormType(filters.formType)
    ) {
      throw new ApiError(
        400,
        "Select a valid report form type.",
      );
    }

    query.set("form_type", filters.formType);
  }

  if (filters.branchId !== undefined) {
    if (!isPositiveInteger(filters.branchId)) {
      throw new ApiError(
        400,
        "Select a valid report branch.",
      );
    }

    query.set("branch_id", String(filters.branchId));
  }

  const dateFrom = filters.dateFrom?.trim();
  const dateTo = filters.dateTo?.trim();

  if (
    dateFrom &&
    dateTo &&
    isRequestReportDate(dateFrom) &&
    isRequestReportDate(dateTo)
  ) {
    query.set("date_from", dateFrom);
    query.set("date_to", dateTo);
  }

  if (filters.sort !== undefined) {
    if (!isRequestReportSort(filters.sort)) {
      throw new ApiError(
        400,
        "Select a valid report sort column.",
      );
    }

    query.set("sort", filters.sort);
  }

  if (filters.direction !== undefined) {
    if (!isRequestReportDirection(filters.direction)) {
      throw new ApiError(
        400,
        "Select a valid report sort direction.",
      );
    }

    query.set("direction", filters.direction);
  }

  if (filters.page !== undefined) {
    if (!isPositiveInteger(filters.page)) {
      throw new ApiError(
        400,
        "Select a valid report page.",
      );
    }

    query.set("page", String(filters.page));
  }

  if (filters.perPage !== undefined) {
    if (!isRequestReportPerPage(filters.perPage)) {
      throw new ApiError(
        400,
        "Select a valid report page size.",
      );
    }

    query.set("per_page", String(filters.perPage));
  }

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
}

export async function getRequestReports(
  filters: RequestReportFilters = {},
  signal?: AbortSignal,
): Promise<RequestReportPage> {
  const response = await apiRequest<unknown>(
    `/admin/request-reports${buildRequestReportsQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseRequestReportPage(response);
}

/**
 * Read-only Admin Reports detail. Reuses the exact same safe details parser
 * as My Requests and Assigned Requests so this endpoint cannot introduce a
 * second, looser contract.
 */
export async function getRequestReport(
  requestId: number,
  signal?: AbortSignal,
): Promise<MyRequestDetails> {
  assertValidRequestReportId(requestId);

  const response = await apiRequest<unknown>(
    `/admin/request-reports/${requestId}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseMyRequestDetailsResponse(response);
}
