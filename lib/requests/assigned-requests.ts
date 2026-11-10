import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";
import type {
  MyRequest,
  MyRequestApprovalStep,
  MyRequestDetails,
  MyRequestPerson,
  MyRequestStatus,
} from "@/lib/requests/my-requests";
import { parseMyRequestDetailsResponse } from "@/lib/requests/my-requests";

export type AssignedRequestStep = Omit<
  MyRequestApprovalStep,
  "approver"
> & {
  can_process: boolean;
};

export type AssignedRequest = {
  id: number;
  request_code: string;
  form_type: string;
  kind_of_request: string | null;
  status: MyRequestStatus;
  grand_total: string;
  requester: MyRequestPerson;
  branch: MyRequest["branch"];
  my_step: AssignedRequestStep;
  created_at: string | null;
  updated_at: string | null;
};

export type AssignedRequestPage = {
  data: AssignedRequest[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

export type AssignedRequestFilters = {
  search?: string;
  status?: "ALL" | MyRequestStatus;
  assignmentStatus?: "ALL" | AssignedRequestStep["status"];
  page?: number;
  perPage?: 10 | 20 | 50;
};

export type RequestDecisionAction = "approve" | "disapprove";

function assignedRequestQuery(
  filters: AssignedRequestFilters,
): string {
  const query = new URLSearchParams();
  const search = filters.search?.trim();

  if (search) {
    query.set("search", search);
  }

  if (filters.status) {
    query.set("status", filters.status);
  }

  if (filters.assignmentStatus) {
    query.set("assignment_status", filters.assignmentStatus);
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

const requestStatuses: readonly MyRequestStatus[] = [
  "Pending",
  "Ongoing",
  "Completed",
  "Disapproved",
  "Canceled",
];

const stepTypes: readonly AssignedRequestStep["step_type"][] = [
  "noted_by",
  "approved_by",
  "delegated_approval",
];

const stepStatuses: readonly AssignedRequestStep["status"][] = [
  "Pending",
  "Approved",
  "Disapproved",
  "Skipped",
  "Canceled",
];

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

function isAssignedRequest(value: unknown): value is AssignedRequest {
  if (!isRecord(value)) {
    return false;
  }

  const requester = value.requester;
  const branch = value.branch;
  const step = value.my_step;

  return (
    Number.isInteger(value.id) &&
    typeof value.request_code === "string" &&
    typeof value.form_type === "string" &&
    isNullableString(value.kind_of_request) &&
    typeof value.status === "string" &&
    requestStatuses.includes(value.status as MyRequestStatus) &&
    typeof value.grand_total === "string" &&
    isRecord(requester) &&
    Number.isInteger(requester.id) &&
    typeof requester.firstname === "string" &&
    typeof requester.lastname === "string" &&
    isNullableString(requester.position) &&
    isRecord(branch) &&
    Number.isInteger(branch.id) &&
    typeof branch.branch_code === "string" &&
    typeof branch.branch_name === "string" &&
    typeof branch.branch === "string" &&
    typeof branch.acronym === "string" &&
    isRecord(step) &&
    Number.isInteger(step.id) &&
    Number.isInteger(step.level) &&
    typeof step.step_type === "string" &&
    stepTypes.includes(
      step.step_type as AssignedRequestStep["step_type"],
    ) &&
    typeof step.status === "string" &&
    stepStatuses.includes(
      step.status as AssignedRequestStep["status"],
    ) &&
    isNullableString(step.comment) &&
    isNullableString(step.acted_at) &&
    typeof step.can_process === "boolean" &&
    isNullableString(value.created_at) &&
    isNullableString(value.updated_at)
  );
}

function isAssignedRequestPage(
  value: unknown,
): value is AssignedRequestPage {
  if (!isRecord(value) || !isRecord(value.meta)) {
    return false;
  }

  return (
    Array.isArray(value.data) &&
    value.data.every(isAssignedRequest) &&
    Number.isInteger(value.meta.current_page) &&
    Number.isInteger(value.meta.last_page) &&
    Number.isInteger(value.meta.per_page) &&
    Number.isInteger(value.meta.total) &&
    (
      value.meta.from === null ||
      Number.isInteger(value.meta.from)
    ) &&
    (
      value.meta.to === null ||
      Number.isInteger(value.meta.to)
    )
  );
}

export function parseAssignedRequestPage(
  value: unknown,
): AssignedRequestPage {
  if (!isAssignedRequestPage(value)) {
    throw new ApiError(
      502,
      "The service returned an unexpected assigned-request list.",
    );
  }

  return value;
}

export async function getAssignedRequests(
  filters: AssignedRequestFilters = {},
  signal?: AbortSignal,
): Promise<AssignedRequestPage> {
  const response = await apiRequest<unknown>(
    `/approver/request-forms${assignedRequestQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseAssignedRequestPage(response);
}

function validateRequestId(requestId: number): void {
  if (!Number.isInteger(requestId) || requestId < 1) {
    throw new ApiError(
      400,
      "A valid request ID is required.",
    );
  }
}

export async function getAssignedRequest(
  requestId: number,
  signal?: AbortSignal,
): Promise<MyRequestDetails> {
  validateRequestId(requestId);

  const response = await apiRequest<unknown>(
    `/approver/request-forms/${requestId}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseMyRequestDetailsResponse(response);
}

export async function decideAssignedRequest(
  requestId: number,
  action: RequestDecisionAction,
  comment: string,
  attachments: File[] = [],
): Promise<MyRequestDetails> {
  validateRequestId(requestId);

  const normalizedComment = comment.trim();

  if (action !== "approve" && action !== "disapprove") {
    throw new ApiError(422, "Select a valid decision.");
  }

  if (action === "disapprove" && normalizedComment.length === 0) {
    throw new ApiError(
      422,
      "A comment is required when disapproving a request.",
      {
        comment: [
          "A comment is required when disapproving a request.",
        ],
      },
    );
  }

  if (normalizedComment.length > 2000) {
    throw new ApiError(
      422,
      "The comment must not exceed 2,000 characters.",
      {
        comment: [
          "The comment must not exceed 2,000 characters.",
        ],
      },
    );
  }

  if (attachments.length > 10) {
    throw new ApiError(422, "Select no more than 10 approved attachments.", {
      attachments: ["Select no more than 10 approved attachments."],
    });
  }

  const allowedTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/x-icon",
    "image/vnd.microsoft.icon",
  ]);

  if (attachments.some((file) => !allowedTypes.has(file.type))) {
    throw new ApiError(422, "Approved attachments must be image files.", {
      attachments: ["Use PNG, JPG, WEBP, GIF, or ICO image files."],
    });
  }

  if (attachments.some((file) => file.size > 5 * 1024 * 1024)) {
    throw new ApiError(422, "Each approved attachment must be 5 MB or smaller.", {
      attachments: ["Each approved attachment must be 5 MB or smaller."],
    });
  }

  const csrfToken = await prepareCsrfSession();
  const body = new FormData();
  body.append("_method", "PATCH");
  body.append("action", action);
  if (normalizedComment) body.append("comment", normalizedComment);
  attachments.forEach((file, index) => {
    body.append(`attachments[${index}]`, file);
  });

  const response = await apiRequest<unknown>(
    `/approver/request-forms/${requestId}/decision`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
      body,
    },
  );

  return parseMyRequestDetailsResponse(response);
}
