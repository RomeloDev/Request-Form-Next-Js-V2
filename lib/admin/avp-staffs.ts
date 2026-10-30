import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type SortDirection = "asc" | "desc";
export type AvpStaffAssignmentSort = "id" | "created_at";
export type AvpStaffCandidateSort =
  | "id"
  | "firstname"
  | "lastname"
  | "position"
  | "branch";
export type AvpStaffBranchSort =
  | "id"
  | "branch_code"
  | "branch_name"
  | "branch"
  | "acronym";

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
};

export type AvpStaffPerson = {
  id: number;
  firstname: string;
  lastname: string;
  position: string;
};

export type AvpStaffCandidate = AvpStaffPerson & {
  branch_code: string | null;
  branch: string | null;
};

export type AvpStaffBranch = {
  id: number;
  branch_code: string;
  branch_name: string;
  branch: string;
  acronym: string;
};

export type AvpStaffAssignment = {
  id: number;
  avp: AvpStaffPerson;
  staff: AvpStaffPerson;
  branches: AvpStaffBranch[];
  created_at: string;
  updated_at: string;
};

export type Page<T> = {
  records: T[];
  meta: PaginationMeta;
};

export type AvpStaffAssignmentQuery = {
  search: string;
  sort: AvpStaffAssignmentSort;
  direction: SortDirection;
  page: number;
  pageSize: number;
};

export type AvpStaffCandidateQuery = {
  search: string;
  sort?: AvpStaffCandidateSort;
  direction?: SortDirection;
  page: number;
  pageSize: number;
};

export type AvpStaffBranchQuery = {
  search: string;
  sort?: AvpStaffBranchSort;
  direction?: SortDirection;
  page: number;
  pageSize: number;
};

export type CreateAvpStaffAssignmentInput = {
  avp_user_id: number;
  staff_user_id: number;
  branch_ids: number[];
};

export type UpdateAvpStaffAssignmentInput = {
  branch_ids: number[];
};

type CollectionResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

type ItemResponse<T> = {
  message: string;
  data: T;
};

type MutationResponse = {
  message: string;
};

function hasValidPagination(meta: PaginationMeta | undefined): meta is PaginationMeta {
  return Boolean(
    meta &&
      Number.isInteger(meta.current_page) &&
      Number.isInteger(meta.per_page) &&
      Number.isInteger(meta.total) &&
      Number.isInteger(meta.last_page) &&
      meta.current_page >= 1 &&
      meta.per_page >= 1 &&
      meta.total >= 0 &&
      meta.last_page >= 1,
  );
}

function parseCollection<T>(response: CollectionResponse<T>, label: string): Page<T> {
  if (!Array.isArray(response.data) || !hasValidPagination(response.meta)) {
    throw new ApiError(502, `Unexpected ${label} response.`);
  }

  return { records: response.data, meta: response.meta };
}

function buildQuery(query: {
  search: string;
  sort?: string;
  direction?: SortDirection;
  page: number;
  pageSize: number;
}): string {
  const parameters = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.pageSize),
  });

  if (query.sort) parameters.set("sort", query.sort);
  if (query.direction) parameters.set("direction", query.direction);
  if (query.search.trim()) parameters.set("search", query.search.trim());

  return parameters.toString();
}

async function getCollection<T>(
  path: string,
  query: Parameters<typeof buildQuery>[0],
  label: string,
  signal?: AbortSignal,
): Promise<Page<T>> {
  const response = await apiRequest<CollectionResponse<T>>(
    `${path}?${buildQuery(query)}`,
    { credentials: "include", signal },
  );

  return parseCollection(response, label);
}

export function getAvpStaffAssignments(
  query: AvpStaffAssignmentQuery,
  signal?: AbortSignal,
) {
  return getCollection<AvpStaffAssignment>(
    "/avp-staffs",
    query,
    "AVP staff assignments",
    signal,
  );
}

export function getAvpCandidates(
  query: AvpStaffCandidateQuery,
  signal?: AbortSignal,
) {
  return getCollection<AvpStaffCandidate>(
    "/avp-staffs/avp-candidates",
    query,
    "AVP candidates",
    signal,
  );
}

export function getStaffCandidates(
  avpId: number,
  query: AvpStaffCandidateQuery,
  signal?: AbortSignal,
) {
  return getCollection<AvpStaffCandidate>(
    `/avp-staffs/staff-candidates/${avpId}`,
    query,
    "staff candidates",
    signal,
  );
}

export function getAvailableBranches(
  query: AvpStaffBranchQuery,
  signal?: AbortSignal,
) {
  return getCollection<AvpStaffBranch>(
    "/avp-staffs/available-branches",
    query,
    "available branches",
    signal,
  );
}

async function sendMutation<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  payload?: object,
): Promise<T> {
  const csrfToken = await prepareCsrfSession();
  const headers: Record<string, string> = { "X-XSRF-TOKEN": csrfToken };

  if (payload) headers["Content-Type"] = "application/json";

  return apiRequest<T>(path, {
    method,
    credentials: "include",
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export function createAvpStaffAssignment(input: CreateAvpStaffAssignmentInput) {
  return sendMutation<ItemResponse<AvpStaffAssignment>>(
    "/avp-staffs",
    "POST",
    input,
  );
}

export function updateAvpStaffAssignment(
  assignmentId: number,
  input: UpdateAvpStaffAssignmentInput,
) {
  return sendMutation<ItemResponse<AvpStaffAssignment>>(
    `/avp-staffs/${assignmentId}`,
    "PUT",
    input,
  );
}

export function deleteAvpStaffAssignment(assignmentId: number) {
  return sendMutation<MutationResponse>(`/avp-staffs/${assignmentId}`, "DELETE");
}

export function avpStaffPersonName(person: AvpStaffPerson): string {
  return `${person.firstname ?? ""} ${person.lastname ?? ""}`.trim() || `User #${person.id}`;
}
