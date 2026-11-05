import { ApiError, apiRequest } from "@/lib/api";

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
