import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type SortDirection = "asc" | "desc";
export type BranchHeadAssignmentSort = "id" | "created_at";
export type BranchHeadCandidateSort =
  | "id"
  | "firstname"
  | "lastname"
  | "position"
  | "branch";
export type BranchHeadBranchSort =
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

export type BranchHeadCandidate = {
  id: number;
  firstname: string;
  lastname: string;
  position: string;
  branch_code: string | null;
  branch: string | null;
};

export type BranchHeadBranch = {
  id: number;
  branch_code: string;
  branch_name: string;
  branch: string;
  acronym: string;
};

export type BranchHeadAssignment = {
  id: number;
  user: BranchHeadCandidate;
  branches: BranchHeadBranch[];
  created_at: string;
  updated_at: string;
};

export type Page<T> = { records: T[]; meta: PaginationMeta };

type CollectionQuery = {
  search: string;
  sort?: string;
  direction?: SortDirection;
  page: number;
  pageSize: number;
};

export type BranchHeadAssignmentQuery = CollectionQuery & {
  sort: BranchHeadAssignmentSort;
  direction: SortDirection;
};

export type BranchHeadCandidateQuery = CollectionQuery & {
  sort?: BranchHeadCandidateSort;
};

export type BranchHeadBranchQuery = CollectionQuery & {
  sort?: BranchHeadBranchSort;
};

type CollectionResponse<T> = { data: T[]; meta: PaginationMeta };
type ItemResponse<T> = { message: string; data: T };
type MutationResponse = { message: string };

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

function parseItem<T>(response: ItemResponse<T>, label: string): ItemResponse<T> {
  if (!response.data || typeof response.data !== "object") {
    throw new ApiError(502, `Unexpected ${label} response.`);
  }

  return response;
}

function buildQuery(query: CollectionQuery): string {
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
  query: CollectionQuery,
  label: string,
  signal?: AbortSignal,
): Promise<Page<T>> {
  const response = await apiRequest<CollectionResponse<T>>(
    `${path}?${buildQuery(query)}`,
    { credentials: "include", signal },
  );

  return parseCollection(response, label);
}

export function getBranchHeadAssignments(query: BranchHeadAssignmentQuery, signal?: AbortSignal) {
  return getCollection<BranchHeadAssignment>(
    "/branch-heads",
    query,
    "Branch Head assignments",
    signal,
  );
}

export function getBranchHeadCandidates(query: BranchHeadCandidateQuery, signal?: AbortSignal) {
  return getCollection<BranchHeadCandidate>(
    "/branch-heads/candidates",
    query,
    "Branch Head candidates",
    signal,
  );
}

export function getAvailableBranchHeadBranches(query: BranchHeadBranchQuery, signal?: AbortSignal) {
  return getCollection<BranchHeadBranch>(
    "/branch-heads/available-branches",
    query,
    "available Branch Head branches",
    signal,
  );
}

export async function getBranchHeadAssignment(id: number, signal?: AbortSignal) {
  const response = await apiRequest<ItemResponse<BranchHeadAssignment>>(
    `/branch-heads/${id}`,
    { credentials: "include", signal },
  );

  return parseItem(response, "Branch Head assignment");
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

export function createBranchHeadAssignment(input: { user_id: number; branch_ids: number[] }) {
  return sendMutation<ItemResponse<BranchHeadAssignment>>("/branch-heads", "POST", input);
}

export function updateBranchHeadAssignment(id: number, input: { branch_ids: number[] }) {
  return sendMutation<ItemResponse<BranchHeadAssignment>>(`/branch-heads/${id}`, "PUT", input);
}

export function deleteBranchHeadAssignment(id: number) {
  return sendMutation<MutationResponse>(`/branch-heads/${id}`, "DELETE");
}

export function branchHeadName(user: BranchHeadCandidate): string {
  return `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() || `User #${user.id}`;
}

