import { ApiError, apiFileRequest } from "@/lib/api";

export type PrintableRequestStatus =
  | "Pending"
  | "Ongoing"
  | "Completed"
  | "Disapproved";

export type PrintablePerson = {
  id: number;
  firstname: string;
  lastname: string;
  position: string | null;
};

export type PrintableApprovalStep = {
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
  approver: PrintablePerson;
};

export type PrintableRequest = {
  id: number;
  request_code: string;
  form_type: string;
  currency: string;
  status: PrintableRequestStatus;
  purpose: string;
  grand_total: string;
  branch: {
    branch_code: string;
    branch_name: string;
    branch: string;
    acronym: string;
  };
  requester: PrintablePerson;
  items: Array<{
    line_number: number;
    quantity: number;
    description: string;
    unit_cost: string;
    line_total: string;
    remarks: string | null;
  }>;
  approval_steps: PrintableApprovalStep[];
  created_at: string;
  /**
   * Optional raw form_data projection for form-specific print fields such as
   * the Purchase Order supplier and address. It is never trusted: the parser
   * only accepts a plain object or null, and feature renderers must project
   * individual fields through their own safe parser before display. The
   * Stock Requisition print contract omits this field entirely.
   */
  form_data?: Record<string, unknown> | null;
};

type PrintableRequestResponse = {
  message: string;
  data: PrintableRequest;
};

const printableStatuses: readonly PrintableRequestStatus[] = [
  "Pending",
  "Ongoing",
  "Completed",
  "Disapproved",
];

const approvalStepTypes: readonly PrintableApprovalStep["step_type"][] = [
  "noted_by",
  "approved_by",
  "delegated_approval",
];

const approvalStepStatuses: readonly PrintableApprovalStep["status"][] = [
  "Pending",
  "Approved",
  "Disapproved",
  "Skipped",
  "Canceled",
];

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

function isPerson(value: unknown): value is PrintablePerson {
  if (!isRecord(value)) return false;

  return (
    Number.isInteger(value.id) &&
    typeof value.firstname === "string" &&
    typeof value.lastname === "string" &&
    isNullableString(value.position)
  );
}

function isApprovalStep(
  value: unknown,
): value is PrintableApprovalStep {
  if (!isRecord(value)) return false;

  return (
    Number.isInteger(value.level) &&
    typeof value.step_type === "string" &&
    approvalStepTypes.includes(
      value.step_type as PrintableApprovalStep["step_type"],
    ) &&
    typeof value.status === "string" &&
    approvalStepStatuses.includes(
      value.status as PrintableApprovalStep["status"],
    ) &&
    isPerson(value.approver)
  );
}

function isPrintableRequestResponse(
  value: unknown,
): value is PrintableRequestResponse {
  if (
    !isRecord(value) ||
    typeof value.message !== "string" ||
    !isRecord(value.data)
  ) {
    return false;
  }

  const data = value.data;

  if (!isRecord(data.branch) || !isPerson(data.requester)) {
    return false;
  }

  return (
    Number.isInteger(data.id) &&
    typeof data.request_code === "string" &&
    typeof data.form_type === "string" &&
    typeof data.currency === "string" &&
    typeof data.status === "string" &&
    printableStatuses.includes(
      data.status as PrintableRequestStatus,
    ) &&
    typeof data.purpose === "string" &&
    typeof data.grand_total === "string" &&
    typeof data.branch.branch_code === "string" &&
    typeof data.branch.branch_name === "string" &&
    typeof data.branch.branch === "string" &&
    typeof data.branch.acronym === "string" &&
    Array.isArray(data.items) &&
    data.items.every(
      (item) =>
        isRecord(item) &&
        Number.isInteger(item.line_number) &&
        typeof item.quantity === "number" &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        typeof item.description === "string" &&
        typeof item.unit_cost === "string" &&
        typeof item.line_total === "string" &&
        isNullableString(item.remarks),
    ) &&
    Array.isArray(data.approval_steps) &&
    data.approval_steps.every(isApprovalStep) &&
    typeof data.created_at === "string" &&
    // form_data is optional: absent for Stock Requisition, a plain object
    // (or null) for Purchase Order. Any other shape is unexpected data.
    (data.form_data === undefined ||
      data.form_data === null ||
      isRecord(data.form_data))
  );
}

export function parsePrintableRequestResponse(
  value: unknown,
): PrintableRequest {
  if (!isPrintableRequestResponse(value)) {
    throw new ApiError(
      502,
      "The service returned unexpected printable request data.",
    );
  }

  return value.data;
}

export async function getPrintableSignature(
  requestId: number,
  userId: number,
  signal?: AbortSignal,
): Promise<Blob> {
  if (!Number.isInteger(requestId) || requestId < 1) {
    throw new ApiError(400, "A valid request ID is required.");
  }

  if (!Number.isInteger(userId) || userId < 1) {
    throw new ApiError(400, "A valid signature owner is required.");
  }

  return apiFileRequest(
    `/request-forms/${requestId}/print/signatures/${userId}`,
    signal,
  );
}
