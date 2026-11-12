import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";
import type {
  StockRequisitionKind,
  StockRequisitionPurpose,
} from "@/lib/requests/stock-requisition-options";

/**
 * Exact backend form_type value from RequestFormType::StockRequisition.
 * Renderer selection compares it directly; never match partial text.
 */
export const STOCK_REQUISITION_FORM_TYPE = "Stock Requisition Slip";

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

export type UpdateStockRequisitionInput = {
  updatedAt: string;
  kindOfRequest: string;
  purpose: string;
  notedByIds: number[];
  approvedByIds: number[];
  items: StockRequisitionItemInput[];
  attachments: File[];
  removedAttachmentIds: number[];
};

export type UpdateStockRequisitionResponse = CreateStockRequisitionResponse;

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

function isStockRequisitionMutationResponse(
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

  if (!isStockRequisitionMutationResponse(response)) {
    throw new ApiError(
      502,
      "The service returned an unexpected request response.",
    );
  }

  return response;
}

function buildUpdateStockRequisitionFormData(
  input: UpdateStockRequisitionInput,
): FormData {
  const formData = new FormData();

  /*
   * PHP reliably parses multipart files from POST requests.
   * Laravel changes this to PATCH after parsing the body.
   */
  formData.append("_method", "PATCH");
  formData.append("updated_at", input.updatedAt.trim());

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

  input.removedAttachmentIds.forEach((id, index) => {
    formData.append(
      `removed_attachment_ids[${index}]`,
      String(id),
    );
  });

  return formData;
}

export async function updateStockRequisition(
  requestId: number,
  input: UpdateStockRequisitionInput,
): Promise<UpdateStockRequisitionResponse> {
  if (!Number.isInteger(requestId) || requestId < 1) {
    throw new ApiError(
      400,
      "A valid request ID is required.",
    );
  }

  const updatedAt = input.updatedAt.trim();

  if (!updatedAt) {
    throw new ApiError(
      422,
      "The request version is missing. Refresh the request and try again.",
      {
        updated_at: [
          "The request version is missing. Refresh the request and try again.",
        ],
      },
    );
  }

  const csrfToken = await prepareCsrfSession();

  const body = buildUpdateStockRequisitionFormData(input);

  const response = await apiRequest<unknown>(
    `/request-forms/${requestId}/stock-requisition`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
      body,
    },
  );

  if (!isStockRequisitionMutationResponse(response)) {
    throw new ApiError(
      502,
      "The service returned an unexpected update response.",
    );
  }

  return response;
}
