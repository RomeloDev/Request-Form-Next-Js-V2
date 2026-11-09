import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";
import type {
  StockRequisitionKind,
  StockRequisitionPurpose,
} from "@/lib/requests/stock-requisition-options";

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

export type StockRequisitionItemInput = {
  quantity: string;
  //unit: string;
  description: string;
  unitCost: string;
  remarks: string;
};

export type CreateStockRequisitionInput = {
  kindOfRequest: StockRequisitionKind;
  purpose: StockRequisitionPurpose;
  notedByIds: number[];
  approvedByIds: number[];
  items: StockRequisitionItemInput[];
  attachments: File[];
};

export type CreatedApprovalStep = {
  id: number;
  level: number;
  step_type:
    | "noted_by"
    | "approved_by"
    | "delegated_approval";
  status: string;
  comment: string | null;
  acted_at: string | null;
  approver: {
    id: number;
    firstname: string;
    lastname: string;
    position: string | null;
  };
};

export type CreatedStockRequisition = {
  id: number;
  request_code: string;
  status: string;
  grand_total: string;
  approval_steps: CreatedApprovalStep[];
};

export type CreateStockRequisitionResponse = {
  message: string;
  data: CreatedStockRequisition;
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
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<ApproverCandidatePage>;

  return (
    Array.isArray(response.data) &&
    typeof response.meta?.current_page === "number" &&
    typeof response.meta.last_page === "number" &&
    typeof response.meta.per_page === "number" &&
    typeof response.meta.total === "number"
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

function buildStockRequisitionFormData(
  input: CreateStockRequisitionInput,
): FormData {
  const formData = new FormData();

  const kindOfRequest = input.kindOfRequest.trim();

  if (kindOfRequest) {
    formData.append("kind_of_request", kindOfRequest);
  }

  formData.append(
    "form_data[purpose]",
    input.purpose.trim(),
  );

  input.notedByIds.forEach((id, index) => {
    formData.append(
      `noted_by_ids[${index}]`,
      String(id),
    );
  });

  input.approvedByIds.forEach((id, index) => {
    formData.append(
      `approved_by_ids[${index}]`,
      String(id),
    );
  });

  input.items.forEach((item, index) => {
    formData.append(
      `items[${index}][quantity]`,
      item.quantity,
    );

    // formData.append(
    //   `items[${index}][unit]`,
    //   item.unit.trim(),
    // );

    formData.append(
      `items[${index}][description]`,
      item.description.trim(),
    );

    formData.append(
      `items[${index}][unit_cost]`,
      item.unitCost,
    );

    formData.append(
      `items[${index}][remarks]`,
      item.remarks.trim(),
    );
  });

  input.attachments.forEach((file, index) => {
    formData.append(
      `attachments[${index}]`,
      file,
    );
  });

  return formData;
}

function isCreateStockRequisitionResponse(
  value: unknown,
): value is CreateStockRequisitionResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response =
    value as Partial<CreateStockRequisitionResponse>;

  const request = response.data;

  return (
    typeof response.message === "string" &&
    typeof request?.id === "number" &&
    typeof request.request_code === "string" &&
    typeof request.status === "string" &&
    typeof request.grand_total === "string" &&
    Array.isArray(request.approval_steps)
  );
}

export async function createStockRequisition(
  input: CreateStockRequisitionInput,
): Promise<CreateStockRequisitionResponse> {
  const csrfToken = await prepareCsrfSession();
  const body = buildStockRequisitionFormData(input);

  const response = await apiRequest<unknown>(
    "/request-forms/stock-requisitions",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
      body,
    },
  );

  if (!isCreateStockRequisitionResponse(response)) {
    throw new ApiError(
      502,
      "The service returned an unexpected request response.",
    );
  }

  return response;
}
