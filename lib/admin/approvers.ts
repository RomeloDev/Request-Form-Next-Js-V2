import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type ApproverSort =
  | "id"
  | "firstname"
  | "lastname"
  | "email"
  | "position"
  | "branch";

export type SortDirection = "asc" | "desc";

export type ApproverUser = {
  id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  employee_id: string;
  role: string;
  position: string;
  contact: string;
  branch_code: string | null;
  branch: string | null;
  email_verified_at: string | null;
};

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
};

export type ApproverListQuery = {
  search: string;
  sort: ApproverSort;
  direction: SortDirection;
  page: number;
  pageSize: number;
};

export type ApproverPage = {
  records: ApproverUser[];
  meta: PaginationMeta;
};

type ApproverListResponse = {
  message: string;
  data: ApproverUser[];
  meta: PaginationMeta;
};

type ApproverMutationResponse = {
  message: string;
  data?: {
    updated_count: number;
  };
};

function buildQueryString(query: ApproverListQuery): string {
  const parameters = new URLSearchParams({
    sort: query.sort,
    direction: query.direction,
    page: String(query.page),
    per_page: String(query.pageSize),
  });

  const search = query.search.trim();

  if (search) {
    parameters.set("search", search);
  }

  return parameters.toString();
}

function validateApproverPage(
  response: ApproverListResponse,
): ApproverPage {
  if (
    !Array.isArray(response.data) ||
    !response.meta ||
    typeof response.meta.current_page !== "number" ||
    typeof response.meta.per_page !== "number" ||
    typeof response.meta.total !== "number" ||
    typeof response.meta.last_page !== "number"
  ) {
    throw new ApiError(
      502,
      "Unexpected approvers response.",
    );
  }

  return {
    records: response.data,
    meta: response.meta,
  };
}

async function getApproverPage(
  path: string,
  query: ApproverListQuery,
  signal?: AbortSignal,
): Promise<ApproverPage> {
  const queryString = buildQueryString(query);

  const response = await apiRequest<ApproverListResponse>(
    `${path}?${queryString}`,
    {
      credentials: "include",
      signal,
    },
  );

  return validateApproverPage(response);
}

export function getApprovers(
  query: ApproverListQuery,
  signal?: AbortSignal,
): Promise<ApproverPage> {
  return getApproverPage(
    "/approvers",
    query,
    signal,
  );
}

export function getApproverCandidates(
  query: ApproverListQuery,
  signal?: AbortSignal,
): Promise<ApproverPage> {
  return getApproverPage(
    "/approvers/candidates",
    query,
    signal,
  );
}

async function sendApproverMutation(
  path: string,
  method: "POST" | "DELETE",
  payload?: { user_ids: number[] },
): Promise<ApproverMutationResponse> {
  const csrfToken = await prepareCsrfSession();

  const headers: Record<string, string> = {
    "X-XSRF-TOKEN": csrfToken,
  };

  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return apiRequest<ApproverMutationResponse>(path, {
    method,
    credentials: "include",
    headers,
    body:
      payload === undefined
        ? undefined
        : JSON.stringify(payload),
  });
}

export function assignApprovers(userIds: number[]) {
  return sendApproverMutation(
    "/approvers",
    "POST",
    {
      user_ids: userIds,
    },
  );
}

export function removeApprover(id: number) {
  return sendApproverMutation(
    `/approvers/${id}`,
    "DELETE",
  );
}

export function approverFullName(
  user: ApproverUser,
): string {
  return (
    `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() ||
    user.username ||
    `User #${user.id}`
  );
}