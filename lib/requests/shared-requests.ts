import { ApiError, apiRequest } from "@/lib/api";
import type {
  MyRequestDetails,
  MyRequestPerson,
  MyRequestStatus,
} from "@/lib/requests/my-requests";
import { parseMyRequestDetailsResponse } from "@/lib/requests/my-requests";

/**
 * The shared-request list contract returns a narrower branch object than the
 * request details contract (no id/acronym), so it has its own type instead of
 * reusing MyRequest["branch"].
 */
export type SharedRequestBranch = {
  branch_code: string;
  branch_name: string;
  branch: string;
};

export type SharedRequest = {
  id: number;
  request_code: string;
  form_type: string;
  kind_of_request: string | null;
  status: MyRequestStatus;
  requester: MyRequestPerson;
  branch: SharedRequestBranch;
  shared_at: string | null;
  created_at: string | null;
};

/** Laravel paginator links shape. */
export type SharedRequestLinks = {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
};

export type SharedRequestPage = {
  data: SharedRequest[];
  links: SharedRequestLinks;
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

export type SharedRequestFilters = {
  search?: string;
  page?: number;
  perPage?: 10 | 20 | 50;
};

const requestStatuses: readonly string[] = [
  "Pending",
  "Ongoing",
  "Completed",
  "Disapproved",
  "Canceled",
];

function sharedRequestQuery(
  filters: SharedRequestFilters,
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

function isNullableString(
  value: unknown,
): value is string | null {
  return value === null || typeof value === "string";
}

function isRequestStatus(
  value: unknown,
): value is MyRequestStatus {
  return (
    typeof value === "string" &&
    requestStatuses.includes(value)
  );
}

/**
 * Mirrors the My Request person validator exactly: the shared list contract
 * returns the identical person shape.
 */
function isSharedRequestPerson(
  value: unknown,
): value is MyRequestPerson {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Number.isInteger(value.id) &&
    typeof value.firstname === "string" &&
    typeof value.lastname === "string" &&
    isNullableString(value.position)
  );
}

function isSharedRequestBranch(
  value: unknown,
): value is SharedRequestBranch {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.branch_code === "string" &&
    typeof value.branch_name === "string" &&
    typeof value.branch === "string"
  );
}

function isSharedRequest(
  value: unknown,
): value is SharedRequest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Number.isInteger(value.id) &&
    typeof value.request_code === "string" &&
    typeof value.form_type === "string" &&
    isNullableString(value.kind_of_request) &&
    isRequestStatus(value.status) &&
    isSharedRequestPerson(value.requester) &&
    isSharedRequestBranch(value.branch) &&
    isNullableString(value.shared_at) &&
    isNullableString(value.created_at)
  );
}

function isSharedRequestPage(
  value: unknown,
): value is SharedRequestPage {
  if (!isRecord(value)) {
    return false;
  }

  const links = value.links;
  const meta = value.meta;

  return (
    typeof value.message === "string" &&
    Array.isArray(value.data) &&
    value.data.every(isSharedRequest) &&
    isRecord(links) &&
    isNullableString(links.first) &&
    isNullableString(links.last) &&
    isNullableString(links.prev) &&
    isNullableString(links.next) &&
    isRecord(meta) &&
    Number.isInteger(meta.current_page) &&
    Number.isInteger(meta.last_page) &&
    Number.isInteger(meta.per_page) &&
    Number.isInteger(meta.total) &&
    (
      meta.from === null ||
      Number.isInteger(meta.from)
    ) &&
    (
      meta.to === null ||
      Number.isInteger(meta.to)
    )
  );
}

export function parseSharedRequestPage(
  value: unknown,
): SharedRequestPage {
  if (!isSharedRequestPage(value)) {
    throw new ApiError(
      502,
      "The service returned an unexpected shared-request list.",
    );
  }

  /*
   * Rebuild the response from the allowlisted contract. Validation alone
   * narrows the TypeScript type but would leave unexpected runtime keys on
   * the object passed from the Server Component to Client Components.
   */
  return {
    data: value.data.map((request) => ({
      id: request.id,
      request_code: request.request_code,
      form_type: request.form_type,
      kind_of_request: request.kind_of_request,
      status: request.status,
      requester: {
        id: request.requester.id,
        firstname: request.requester.firstname,
        lastname: request.requester.lastname,
        position: request.requester.position,
      },
      branch: {
        branch_code: request.branch.branch_code,
        branch_name: request.branch.branch_name,
        branch: request.branch.branch,
      },
      shared_at: request.shared_at,
      created_at: request.created_at,
    })),
    links: {
      first: value.links.first,
      last: value.links.last,
      prev: value.links.prev,
      next: value.links.next,
    },
    meta: {
      current_page: value.meta.current_page,
      last_page: value.meta.last_page,
      per_page: value.meta.per_page,
      total: value.meta.total,
      from: value.meta.from,
      to: value.meta.to,
    },
    message: value.message,
  };
}

export async function getSharedRequests(
  filters: SharedRequestFilters = {},
  signal?: AbortSignal,
): Promise<SharedRequestPage> {
  const response = await apiRequest<unknown>(
    `/shared-requests${sharedRequestQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseSharedRequestPage(response);
}

function validateRequestId(requestId: number): void {
  if (!Number.isInteger(requestId) || requestId < 1) {
    throw new ApiError(
      400,
      "A valid request ID is required.",
    );
  }
}

/**
 * The shared-request details endpoint returns the same safe
 * RequestFormResource contract as the My Request details endpoint, so the
 * existing (unmodified, equally strict) validator is reused.
 */
export function parseSharedRequestDetailsResponse(
  value: unknown,
): MyRequestDetails {
  const details = parseMyRequestDetailsResponse(value);

  return {
    id: details.id,
    request_code: details.request_code,
    form_type: details.form_type,
    kind_of_request: details.kind_of_request,
    currency: details.currency,
    status: details.status,
    cancellation_reason: details.cancellation_reason,
    form_data: details.form_data,
    grand_total: details.grand_total,
    requester: {
      id: details.requester.id,
      firstname: details.requester.firstname,
      lastname: details.requester.lastname,
      position: details.requester.position,
    },
    branch: {
      id: details.branch.id,
      branch_code: details.branch.branch_code,
      branch_name: details.branch.branch_name,
      branch: details.branch.branch,
      acronym: details.branch.acronym,
    },
    items: details.items.map((item) => ({
      id: item.id,
      line_number: item.line_number,
      quantity: item.quantity,
      description: item.description,
      unit_cost: item.unit_cost,
      line_total: item.line_total,
      remarks: item.remarks,
      item_data: item.item_data,
    })),
    attachments: details.attachments.map((attachment) => ({
      id: attachment.id,
      original_name: attachment.original_name,
      mime_type: attachment.mime_type,
      size_bytes: attachment.size_bytes,
    })),
    approval_steps: details.approval_steps.map((step) => ({
      id: step.id,
      level: step.level,
      step_type: step.step_type,
      status: step.status,
      comment: step.comment,
      acted_at: step.acted_at,
      attachments: step.attachments.map((attachment) => ({
        id: attachment.id,
        original_name: attachment.original_name,
        mime_type: attachment.mime_type,
        size_bytes: attachment.size_bytes,
      })),
      approver: {
        id: step.approver.id,
        firstname: step.approver.firstname,
        lastname: step.approver.lastname,
        position: step.approver.position,
      },
    })),
    created_at: details.created_at,
    updated_at: details.updated_at,
  };
}

export async function getSharedRequest(
  requestId: number,
  signal?: AbortSignal,
): Promise<MyRequestDetails> {
  validateRequestId(requestId);

  const response = await apiRequest<unknown>(
    `/shared-requests/${requestId}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseSharedRequestDetailsResponse(response);
}
