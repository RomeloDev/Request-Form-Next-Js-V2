import { ApiError, apiRequest } from "@/lib/api";

export type ApproverCandidate = {
  id: number;
  firstname: string;
  lastname: string;
  position: string | null;
  branch_code: string | null;
  branch: string | null;
};

export type CandidatePaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type ApproverCandidatePage = {
  data: ApproverCandidate[];
  meta: CandidatePaginationMeta;
};

export type ApproverCandidateFilters = {
  search?: string;
  sort?: "firstname" | "lastname" | "position" | "branch";
  direction?: "asc" | "desc";
  page?: number;
  perPage?: 10 | 20 | 50;
};

function candidateQuery(
  filters: ApproverCandidateFilters,
): string {
  const query = new URLSearchParams();

  const search = filters.search?.trim();

  if (search) {
    query.set("search", search);
  }

  if (filters.sort) {
    query.set("sort", filters.sort);
  }

  if (filters.direction) {
    query.set("direction", filters.direction);
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

function isCandidatePage(
  value: unknown,
): value is ApproverCandidatePage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const response = value as Record<string, unknown>;
  const meta = response.meta;

  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return false;
  }

  const pagination = meta as Record<string, unknown>;

  const candidatesAreValid =
    Array.isArray(response.data) &&
    response.data.every((candidate) => {
      if (
        !candidate ||
        typeof candidate !== "object" ||
        Array.isArray(candidate)
      ) {
        return false;
      }

      const item = candidate as Record<string, unknown>;

      return (
        typeof item.id === "number" &&
        Number.isInteger(item.id) &&
        item.id > 0 &&
        typeof item.firstname === "string" &&
        typeof item.lastname === "string" &&
        (item.position === null ||
          typeof item.position === "string") &&
        (item.branch_code === null ||
          typeof item.branch_code === "string") &&
        (item.branch === null || typeof item.branch === "string")
      );
    });

  return (
    candidatesAreValid &&
    typeof pagination.current_page === "number" &&
    Number.isInteger(pagination.current_page) &&
    pagination.current_page >= 1 &&
    typeof pagination.last_page === "number" &&
    Number.isInteger(pagination.last_page) &&
    pagination.last_page >= 1 &&
    typeof pagination.per_page === "number" &&
    Number.isInteger(pagination.per_page) &&
    pagination.per_page >= 1 &&
    typeof pagination.total === "number" &&
    Number.isInteger(pagination.total) &&
    pagination.total >= 0 &&
    (pagination.from === null ||
      (typeof pagination.from === "number" &&
        Number.isInteger(pagination.from) &&
        pagination.from >= 1)) &&
    (pagination.to === null ||
      (typeof pagination.to === "number" &&
        Number.isInteger(pagination.to) &&
        pagination.to >= 1))
  );
}

export async function getApproverCandidates(
  filters: ApproverCandidateFilters = {},
  signal?: AbortSignal,
): Promise<ApproverCandidatePage> {
  const response = await apiRequest<unknown>(
    `/request-forms/approver-candidates${candidateQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  if (!isCandidatePage(response)) {
    throw new ApiError(
      502,
      "The service returned an unexpected approver list.",
    );
  }

  return response;
}
