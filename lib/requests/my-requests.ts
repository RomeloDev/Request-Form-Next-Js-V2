import {
  ApiError,
  apiFileRequest,
  apiRequest,
} from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type MyRequestStatus =
  | "Pending"
  | "Ongoing"
  | "Completed"
  | "Disapproved"
  | "Canceled";

export type MyRequestSummary = {
  total: number;
  pending: number;
  ongoing: number;
  completed: number;
  disapproved: number;
  canceled: number;
};

export type MyRequest = {
  id: number;
  request_code: string;
  form_type: string;
  kind_of_request: string | null;
  currency: string;
  status: MyRequestStatus;
  cancellation_reason: string | null;
  form_data: Record<string, unknown> | null;
  grand_total: string;
  branch: {
    id: number;
    branch_code: string;
    branch_name: string;
    branch: string;
    acronym: string;
  };
  created_at: string | null;
  updated_at: string | null;
};

export type MyRequestPage = {
  data: MyRequest[];
  summary: MyRequestSummary;
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

export type MyRequestFilters = {
  search?: string;
  status?: "ALL" | MyRequestStatus;
  page?: number;
  perPage?: 10 | 20 | 50;
};

export type MyRequestPerson = {
  id: number;
  firstname: string;
  lastname: string;
  position: string | null;
};

export type MyRequestItem = {
  id: number;
  line_number: number;
  quantity: number;
  description: string;
  unit_cost: string;
  line_total: string;
  remarks: string | null;
  item_data: Record<string, unknown> | null;
};

export type MyRequestAttachment = {
  id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
};

export type MyRequestApprovalStep = {
  id: number;
  level: number;
  step_type:
    | "noted_by"
    | "approved_by"
    | "delegated_approval";
  status:
    | "Pending"
    | "Approved"
    | "Disapproved"
    | "Skipped"
    | "Canceled";
  comment: string | null;
  acted_at: string | null;
  approver: MyRequestPerson;
};

export type MyRequestDetails = MyRequest & {
  requester: MyRequestPerson;
  items: MyRequestItem[];
  attachments: MyRequestAttachment[];
  approval_steps: MyRequestApprovalStep[];
};

type MyRequestDetailsResponse = {
  message: string;
  data: MyRequestDetails;
};

export type CancelMyRequestResult = {
  id: number;
  status: "Canceled";
  cancellation_reason: string;
};

type CancelMyRequestResponse = {
  message: string;
  data: CancelMyRequestResult;
};

export type DeleteMyRequestResult = {
  id: number;
};

type DeleteMyRequestResponse = {
  message: string;
  data: DeleteMyRequestResult;
};

const requestStatuses: readonly MyRequestStatus[] = [
  "Pending",
  "Ongoing",
  "Completed",
  "Disapproved",
  "Canceled",
];

const approvalStepTypes: readonly MyRequestApprovalStep["step_type"][] = [
  "noted_by",
  "approved_by",
  "delegated_approval",
];

const approvalStepStatuses: readonly MyRequestApprovalStep["status"][] = [
  "Pending",
  "Approved",
  "Disapproved",
  "Skipped",
  "Canceled",
];

export function isEditCandidate(
  request: Pick<MyRequest, "form_type" | "status">,
): boolean {
  return (
    request.form_type === "Stock Requisition Slip" &&
    (request.status === "Pending" ||
      request.status === "Disapproved")
  );
}

export function canEditRequestDetails(
  request: MyRequestDetails,
): boolean {
  if (!isEditCandidate(request) || !request.updated_at) {
    return false;
  }

  if (request.status === "Disapproved") {
    return true;
  }

  return request.approval_steps.every(
    (step) => step.status === "Pending" && step.acted_at === null,
  );
}

const previewableAttachmentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const downloadableAttachmentTypes = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type RequestAttachmentAction =
  | "preview"
  | "download";

export function getRequestAttachmentAction(
  mimeType: string,
): RequestAttachmentAction | null {
  if (previewableAttachmentTypes.has(mimeType)) {
    return "preview";
  }

  if (downloadableAttachmentTypes.has(mimeType)) {
    return "download";
  }

  return null;
}

export async function getRequestAttachmentFile(
  requestId: number,
  attachmentId: number,
  action: RequestAttachmentAction,
  signal?: AbortSignal,
): Promise<Blob> {
  if (!Number.isInteger(requestId) || requestId < 1) {
    throw new ApiError(
      400,
      "A valid request ID is required.",
    );
  }

  if (!Number.isInteger(attachmentId) || attachmentId < 1) {
    throw new ApiError(
      400,
      "A valid attachment ID is required.",
    );
  }

  return apiFileRequest(
    `/request-forms/${requestId}/attachments/${attachmentId}/${action}`,
    signal,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRequestStatus(value: unknown): value is MyRequestStatus {
  return (
    typeof value === "string" &&
    requestStatuses.includes(value as MyRequestStatus)
  );
}

function isPerson(value: unknown): value is MyRequestPerson {
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

function isBranch(value: unknown): value is MyRequest["branch"] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Number.isInteger(value.id) &&
    typeof value.branch_code === "string" &&
    typeof value.branch_name === "string" &&
    typeof value.branch === "string" &&
    typeof value.acronym === "string"
  );
}

function isRequestItem(value: unknown): value is MyRequestItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Number.isInteger(value.id) &&
    Number.isInteger(value.line_number) &&
    Number.isInteger(value.quantity) &&
    (value.quantity as number) >= 1 &&
    typeof value.description === "string" &&
    typeof value.unit_cost === "string" &&
    typeof value.line_total === "string" &&
    isNullableString(value.remarks) &&
    (value.item_data === null || isRecord(value.item_data))
  );
}

function isAttachment(
  value: unknown,
): value is MyRequestAttachment {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Number.isInteger(value.id) &&
    typeof value.original_name === "string" &&
    typeof value.mime_type === "string" &&
    Number.isInteger(value.size_bytes) &&
    (value.size_bytes as number) >= 0
  );
}

function isApprovalStep(
  value: unknown,
): value is MyRequestApprovalStep {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Number.isInteger(value.id) &&
    Number.isInteger(value.level) &&
    typeof value.step_type === "string" &&
    approvalStepTypes.includes(
      value.step_type as MyRequestApprovalStep["step_type"],
    ) &&
    typeof value.status === "string" &&
    approvalStepStatuses.includes(
      value.status as MyRequestApprovalStep["status"],
    ) &&
    isNullableString(value.comment) &&
    isNullableString(value.acted_at) &&
    isPerson(value.approver)
  );
}

function isMyRequestDetailsResponse(
  value: unknown,
): value is MyRequestDetailsResponse {
  if (!isRecord(value) || typeof value.message !== "string") {
    return false;
  }

  const details = value.data;

  if (!isRecord(details)) {
    return false;
  }

  return (
    Number.isInteger(details.id) &&
    typeof details.request_code === "string" &&
    typeof details.form_type === "string" &&
    isNullableString(details.kind_of_request) &&
    typeof details.currency === "string" &&
    isRequestStatus(details.status) &&
    isNullableString(details.cancellation_reason) &&
    (details.form_data === null || isRecord(details.form_data)) &&
    typeof details.grand_total === "string" &&
    isPerson(details.requester) &&
    isBranch(details.branch) &&
    Array.isArray(details.items) &&
    details.items.every(isRequestItem) &&
    Array.isArray(details.attachments) &&
    details.attachments.every(isAttachment) &&
    Array.isArray(details.approval_steps) &&
    details.approval_steps.every(isApprovalStep) &&
    isNullableString(details.created_at) &&
    isNullableString(details.updated_at)
  );
}

export function parseMyRequestDetailsResponse(
  value: unknown,
): MyRequestDetails {
  if (!isMyRequestDetailsResponse(value)) {
    throw new ApiError(
      502,
      "The service returned unexpected request details.",
    );
  }

  return value.data;
}

function isCancelMyRequestResponse(
  value: unknown,
): value is CancelMyRequestResponse {
  if (!isRecord(value) || !isRecord(value.data)) {
    return false;
  }

  return (
    typeof value.message === "string" &&
    Number.isInteger(value.data.id) &&
    value.data.status === "Canceled" &&
    typeof value.data.cancellation_reason === "string"
  );
}

function isDeleteMyRequestResponse(
  value: unknown,
): value is DeleteMyRequestResponse {
  return (
    isRecord(value) &&
    typeof value.message === "string" &&
    isRecord(value.data) &&
    Number.isInteger(value.data.id)
  );
}

export async function deleteMyRequest(
  requestId: number,
): Promise<DeleteMyRequestResult> {
  if (!Number.isInteger(requestId) || requestId < 1) {
    throw new ApiError(
      400,
      "A valid request ID is required.",
    );
  }

  const csrfToken = await prepareCsrfSession();
  const response = await apiRequest<unknown>(
    `/request-forms/${requestId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
    },
  );

  if (!isDeleteMyRequestResponse(response)) {
    throw new ApiError(
      502,
      "The service returned an unexpected deletion response.",
    );
  }

  return response.data;
}

export async function cancelMyRequest(
  requestId: number,
  reason: string,
): Promise<CancelMyRequestResult> {
  if (!Number.isInteger(requestId) || requestId < 1) {
    throw new ApiError(
      400,
      "A valid request ID is required.",
    );
  }

  const cancellationReason = reason.trim();

  if (
    cancellationReason.length === 0 ||
    cancellationReason.length > 1000
  ) {
    throw new ApiError(
      422,
      "Please provide a cancellation reason of no more than 1,000 characters.",
      {
        cancellation_reason: [
          "Please provide a cancellation reason of no more than 1,000 characters.",
        ],
      },
    );
  }

  const csrfToken = await prepareCsrfSession();

  const response = await apiRequest<unknown>(
    `/request-forms/${requestId}/cancel`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify({
        cancellation_reason: cancellationReason,
      }),
    },
  );

  if (!isCancelMyRequestResponse(response)) {
    throw new ApiError(
      502,
      "The service returned an unexpected cancellation response.",
    );
  }

  return response.data;
}

export async function getMyRequest(
  requestId: number,
  signal?: AbortSignal,
): Promise<MyRequestDetails> {
  if (!Number.isInteger(requestId) || requestId < 1) {
    throw new ApiError(
      400,
      "A valid request ID is required.",
    );
  }

  const response = await apiRequest<unknown>(
    `/request-forms/${requestId}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseMyRequestDetailsResponse(response);
}

function myRequestQuery(filters: MyRequestFilters): string {
  const query = new URLSearchParams();
  const search = filters.search?.trim();

  if (search) {
    query.set("search", search);
  }

  if (filters.status) {
    query.set("status", filters.status);
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

function isMyRequestPage(value: unknown): value is MyRequestPage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<MyRequestPage>;
  const summary = response.summary;

  return (
    Array.isArray(response.data) &&
    typeof summary?.total === "number" &&
    typeof summary.pending === "number" &&
    typeof summary.ongoing === "number" &&
    typeof summary.completed === "number" &&
    typeof summary.disapproved === "number" &&
    typeof summary.canceled === "number" &&
    typeof response.meta?.current_page === "number" &&
    typeof response.meta.last_page === "number" &&
    typeof response.meta.per_page === "number" &&
    typeof response.meta.total === "number"
  );
}

export async function getMyRequests(
  filters: MyRequestFilters = {},
  signal?: AbortSignal,
): Promise<MyRequestPage> {
  const response = await apiRequest<unknown>(
    `/request-forms${myRequestQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  if (!isMyRequestPage(response)) {
    throw new ApiError(
      502,
      "The service returned an unexpected request list.",
    );
  }

  return response;
}
