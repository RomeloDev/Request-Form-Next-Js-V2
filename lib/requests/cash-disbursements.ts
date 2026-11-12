import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";
import {
  isRequestCurrency,
  type RequestCurrency,
} from "@/lib/requests/request-currencies";
import {
  isRequestKind,
  type RequestKind,
} from "@/lib/requests/request-kind-options";

/**
 * Exact backend form_type value from RequestFormType::CashDisbursement.
 * Renderer selection compares it directly; never match partial text.
 */
export const CASH_DISBURSEMENT_FORM_TYPE =
  "Cash Disbursement Requisition Slip";

/** Narrow any untrusted form_type string to the Cash Disbursement contract. */
export function isCashDisbursementFormType(
  value: string,
): value is typeof CASH_DISBURSEMENT_FORM_TYPE {
  return value === CASH_DISBURSEMENT_FORM_TYPE;
}

export type CashDisbursementItemInput = {
  quantity: string;
  description: string;
  unitCost: string;
  remarks: string;
};

export type CreateCashDisbursementInput = {
  kindOfRequest: RequestKind;
  currency: RequestCurrency;
  notedByIds: number[];
  approvedByIds: number[];
  items: CashDisbursementItemInput[];
  attachments: File[];
};

export type UpdateCashDisbursementInput =
  CreateCashDisbursementInput & {
    updatedAt: string;
    removedAttachmentIds: number[];
  };

export type CashDisbursementApprovalStep = {
  id: number;
  level: number;
  step_type:
    | "noted_by"
    | "approved_by"
    | "delegated_approval";
  status: string;
  approver: {
    id: number;
    firstname: string;
    lastname: string;
    position: string | null;
  };
};

export type CreatedCashDisbursement = {
  id: number;
  request_code: string;
  form_type: typeof CASH_DISBURSEMENT_FORM_TYPE;
  currency: RequestCurrency;
  status: string;
  grand_total: string;
  form_data: null;
  updated_at: string;
  approval_steps: CashDisbursementApprovalStep[];
};

export type CashDisbursementMutationResponse = {
  message: string;
  data: CreatedCashDisbursement;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1
  );
}

function validateApproverIds(
  ids: number[],
  field: "noted_by_ids" | "approved_by_ids",
  message: string,
): void {
  if (!Array.isArray(ids)) {
    throw new ApiError(422, message, {
      [field]: [message],
    });
  }

  for (const id of ids) {
    if (!isPositiveInteger(id)) {
      throw new ApiError(422, message, {
        [field]: [message],
      });
    }
  }

  if (new Set(ids).size !== ids.length) {
    throw new ApiError(422, message, {
      [field]: [message],
    });
  }
}

function validateCashDisbursementInput(
  input: CreateCashDisbursementInput,
): void {
  const kindOfRequest =
    typeof input.kindOfRequest === "string"
      ? input.kindOfRequest.trim()
      : "";

  if (!isRequestKind(kindOfRequest)) {
    throw new ApiError(422, "Choose a valid kind of request.", {
      kind_of_request: ["Choose a valid kind of request."],
    });
  }

  if (
    typeof input.currency !== "string" ||
    !isRequestCurrency(input.currency)
  ) {
    throw new ApiError(422, "Choose a valid currency.", {
      currency: ["Choose a valid currency."],
    });
  }

  if (
    !Array.isArray(input.approvedByIds) ||
    input.approvedByIds.length === 0
  ) {
    throw new ApiError(422, "At least one approver is required.", {
      approved_by_ids: ["At least one approver is required."],
    });
  }

  validateApproverIds(
    input.approvedByIds,
    "approved_by_ids",
    "Approver IDs must be positive, unique integers.",
  );

  validateApproverIds(
    input.notedByIds,
    "noted_by_ids",
    "Noted By IDs must be positive, unique integers.",
  );

  const notedIds = new Set(input.notedByIds);
  if (input.approvedByIds.some((id) => notedIds.has(id))) {
    throw new ApiError(
      422,
      "A user cannot be both Noted By and Approved By.",
      {
        approved_by_ids: [
          "A user cannot be both Noted By and Approved By.",
        ],
      },
    );
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ApiError(422, "At least one item is required.", {
      items: ["At least one item is required."],
    });
  }
}

function validateUpdateInput(
  input: UpdateCashDisbursementInput,
): void {
  const updatedAt =
    typeof input.updatedAt === "string"
      ? input.updatedAt.trim()
      : "";

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

  if (!Array.isArray(input.removedAttachmentIds)) {
    throw new ApiError(422, "Choose valid attachments to remove.", {
      removed_attachment_ids: [
        "Choose valid attachments to remove.",
      ],
    });
  }

  for (const id of input.removedAttachmentIds) {
    if (!isPositiveInteger(id)) {
      throw new ApiError(422, "Choose valid attachments to remove.", {
        removed_attachment_ids: [
          "Choose valid attachments to remove.",
        ],
      });
    }
  }

  if (
    new Set(input.removedAttachmentIds).size !==
    input.removedAttachmentIds.length
  ) {
    throw new ApiError(422, "Choose valid attachments to remove.", {
      removed_attachment_ids: [
        "Choose valid attachments to remove.",
      ],
    });
  }
}

/**
 * Build the multipart body for a new Cash Disbursement.
 *
 * Only requester-editable business fields are appended. Identity, status,
 * form type, form_data, and calculated totals stay server-owned.
 */
export function buildCashDisbursementFormData(
  input: CreateCashDisbursementInput,
): FormData {
  validateCashDisbursementInput(input);

  const formData = new FormData();

  formData.append(
    "kind_of_request",
    input.kindOfRequest.trim(),
  );
  formData.append("currency", input.currency);

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
      item.quantity.trim(),
    );

    formData.append(
      `items[${index}][description]`,
      item.description.trim(),
    );

    formData.append(
      `items[${index}][unit_cost]`,
      item.unitCost.trim(),
    );

    formData.append(
      `items[${index}][remarks]`,
      item.remarks.trim(),
    );
  });

  input.attachments.forEach((file, index) => {
    formData.append(`attachments[${index}]`, file);
  });

  return formData;
}

/**
 * Build the multipart body for an existing Cash Disbursement.
 *
 * PHP parses multipart files from POST reliably. Laravel applies the
 * method override after parsing and routes this request as PATCH.
 */
export function buildUpdateCashDisbursementFormData(
  input: UpdateCashDisbursementInput,
): FormData {
  validateUpdateInput(input);

  const formData = buildCashDisbursementFormData(input);

  formData.append("_method", "PATCH");
  formData.append("updated_at", input.updatedAt.trim());

  input.removedAttachmentIds.forEach((id, index) => {
    formData.append(
      `removed_attachment_ids[${index}]`,
      String(id),
    );
  });

  return formData;
}

function unexpectedResponse(): never {
  throw new ApiError(
    502,
    "The service returned an unexpected cash disbursement response.",
  );
}

function toApprovalStep(
  value: unknown,
): CashDisbursementApprovalStep | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  if (!isPositiveInteger(id)) {
    return null;
  }

  const level = value.level;
  if (!isPositiveInteger(level)) {
    return null;
  }

  const stepType = value.step_type;
  if (
    stepType !== "noted_by" &&
    stepType !== "approved_by" &&
    stepType !== "delegated_approval"
  ) {
    return null;
  }

  const status = value.status;
  if (typeof status !== "string") {
    return null;
  }

  const approver = value.approver;
  if (!isRecord(approver)) {
    return null;
  }

  const approverId = approver.id;
  if (!isPositiveInteger(approverId)) {
    return null;
  }

  const firstname = approver.firstname;
  if (typeof firstname !== "string") {
    return null;
  }

  const lastname = approver.lastname;
  if (typeof lastname !== "string") {
    return null;
  }

  const position = approver.position;
  if (position !== null && typeof position !== "string") {
    return null;
  }

  return {
    id,
    level,
    step_type: stepType,
    status,
    approver: {
      id: approverId,
      firstname,
      lastname,
      position,
    },
  };
}

export function parseCashDisbursementMutationResponse(
  value: unknown,
): CashDisbursementMutationResponse {
  if (!isRecord(value)) {
    return unexpectedResponse();
  }

  const message = value.message;
  if (typeof message !== "string") {
    return unexpectedResponse();
  }

  const data = value.data;
  if (!isRecord(data)) {
    return unexpectedResponse();
  }

  const id = data.id;
  if (!isPositiveInteger(id)) {
    return unexpectedResponse();
  }

  const requestCode = data.request_code;
  if (typeof requestCode !== "string") {
    return unexpectedResponse();
  }

  const formType = data.form_type;
  if (
    typeof formType !== "string" ||
    !isCashDisbursementFormType(formType)
  ) {
    return unexpectedResponse();
  }

  const currency = data.currency;
  if (
    typeof currency !== "string" ||
    !isRequestCurrency(currency)
  ) {
    return unexpectedResponse();
  }

  const status = data.status;
  if (typeof status !== "string") {
    return unexpectedResponse();
  }

  const grandTotal = data.grand_total;
  if (typeof grandTotal !== "string") {
    return unexpectedResponse();
  }

  if (data.form_data !== null) {
    return unexpectedResponse();
  }

  const updatedAt = data.updated_at;
  if (typeof updatedAt !== "string") {
    return unexpectedResponse();
  }

  if (!Array.isArray(data.approval_steps)) {
    return unexpectedResponse();
  }

  const approvalSteps: CashDisbursementApprovalStep[] = [];
  for (const step of data.approval_steps) {
    const parsedStep = toApprovalStep(step);
    if (!parsedStep) {
      return unexpectedResponse();
    }
    approvalSteps.push(parsedStep);
  }

  return {
    message,
    data: {
      id,
      request_code: requestCode,
      form_type: formType,
      currency,
      status,
      grand_total: grandTotal,
      form_data: null,
      updated_at: updatedAt,
      approval_steps: approvalSteps,
    },
  };
}

export async function createCashDisbursement(
  input: CreateCashDisbursementInput,
): Promise<CashDisbursementMutationResponse> {
  const body = buildCashDisbursementFormData(input);
  const csrfToken = await prepareCsrfSession();

  const response = await apiRequest<unknown>(
    "/request-forms/cash-disbursements",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
      body,
    },
  );

  return parseCashDisbursementMutationResponse(response);
}

export async function updateCashDisbursement(
  requestId: number,
  input: UpdateCashDisbursementInput,
): Promise<CashDisbursementMutationResponse> {
  if (!isPositiveInteger(requestId)) {
    throw new ApiError(400, "A valid request ID is required.");
  }

  const body = buildUpdateCashDisbursementFormData(input);
  const csrfToken = await prepareCsrfSession();

  const response = await apiRequest<unknown>(
    `/request-forms/${requestId}/cash-disbursement`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
      body,
    },
  );

  return parseCashDisbursementMutationResponse(response);
}
