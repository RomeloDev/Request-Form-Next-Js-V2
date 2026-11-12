import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";
import {
  PURCHASE_ORDER_KIND_OPTIONS,
  type PurchaseOrderKind,
  isPurchaseOrderKind,
} from "@/lib/requests/purchase-order-options";

export {
  PURCHASE_ORDER_KIND_OPTIONS,
  type PurchaseOrderKind,
  isPurchaseOrderKind,
};

export type SupplierSuggestion = {
  name: string;
  address: string;
};

export type SupplierPaginationLinks = {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
};

export type SupplierPaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type SupplierSuggestionPage = {
  data: SupplierSuggestion[];
  links: SupplierPaginationLinks;
  meta: SupplierPaginationMeta;
  message: string;
};

export type SupplierSuggestionFilters = {
  search?: string;
  page?: number;
  perPage?: 10 | 20 | 50;
};

export type PurchaseOrderItemInput = {
  quantity: string;
  description: string;
  unitCost: string;
  remarks: string;
};

export type CreatePurchaseOrderInput = {
  kindOfRequest: PurchaseOrderKind;
  supplier: string;
  address: string;
  notedByIds: number[];
  approvedByIds: number[];
  items: PurchaseOrderItemInput[];
  attachments: File[];
};

export type PurchaseOrderApprovalStep = {
  id: number;
  level: number;
  step_type: "noted_by" | "approved_by" | "delegated_approval";
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

export type CreatedPurchaseOrder = {
  id: number;
  request_code: string;
  status: string;
  grand_total: string;
  approval_steps: PurchaseOrderApprovalStep[];
};

export type CreatePurchaseOrderResponse = {
  message: string;
  data: CreatedPurchaseOrder;
};

/**
 * Exact backend form_type value from RequestFormType::PurchaseOrder.
 * Keep this literal stable; renderer selection compares it directly.
 */
export const PURCHASE_ORDER_FORM_TYPE = "Purchase Order Requisition Slip";

/** Narrow any untrusted form_type string to the Purchase Order contract. */
export function isPurchaseOrderFormType(
  value: string,
): value is typeof PURCHASE_ORDER_FORM_TYPE {
  return value === PURCHASE_ORDER_FORM_TYPE;
}

export type PurchaseOrderFormData = {
  supplier: string;
  address: string;
};

/**
 * Safely read the Purchase Order supplier fields out of the untrusted,
 * optional form_data object returned by the details APIs. Missing or
 * malformed fields become empty strings; the renderer shows a dash.
 */
export function parsePurchaseOrderFormData(
  formData: Record<string, unknown> | null,
): PurchaseOrderFormData {
  if (!isRecord(formData)) {
    return { supplier: "", address: "" };
  }

  return {
    supplier:
      typeof formData.supplier === "string"
        ? formData.supplier.trim()
        : "",
    address:
      typeof formData.address === "string"
        ? formData.address.trim()
        : "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isOptionalOrNullableString(
  value: unknown,
): value is string | null | undefined {
  return (
    value === undefined || value === null || typeof value === "string"
  );
}

function isNullableNonNegativeInteger(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0)
  );
}

export function buildSupplierQuery(
  filters: SupplierSuggestionFilters = {},
): string {
  const query = new URLSearchParams();

  const search = filters.search?.trim();
  if (search) {
    query.set("search", search);
  }

  if (
    filters.page !== undefined &&
    Number.isInteger(filters.page) &&
    filters.page > 0
  ) {
    query.set("page", String(filters.page));
  }

  const perPage = filters.perPage;
  if (
    perPage !== undefined &&
    (perPage === 10 || perPage === 20 || perPage === 50)
  ) {
    query.set("per_page", String(perPage));
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function toSupplierSuggestion(value: unknown): SupplierSuggestion | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = value.name;
  if (typeof name !== "string") {
    return null;
  }

  const address = value.address;
  if (typeof address !== "string") {
    return null;
  }

  return {
    name,
    address,
  };
}

function toSupplierPaginationLinks(
  value: unknown,
): SupplierPaginationLinks | null {
  if (!isRecord(value)) {
    return null;
  }

  const first = value.first;
  if (!isOptionalOrNullableString(first)) {
    return null;
  }

  const last = value.last;
  if (!isOptionalOrNullableString(last)) {
    return null;
  }

  const prev = value.prev;
  if (!isOptionalOrNullableString(prev)) {
    return null;
  }

  const next = value.next;
  if (!isOptionalOrNullableString(next)) {
    return null;
  }

  return {
    first: typeof first === "string" ? first : null,
    last: typeof last === "string" ? last : null,
    prev: typeof prev === "string" ? prev : null,
    next: typeof next === "string" ? next : null,
  };
}

function toSupplierPaginationMeta(
  value: unknown,
): SupplierPaginationMeta | null {
  if (!isRecord(value)) {
    return null;
  }

  const currentPage = value.current_page;
  if (!isPositiveInteger(currentPage)) {
    return null;
  }

  const lastPage = value.last_page;
  if (!isPositiveInteger(lastPage)) {
    return null;
  }

  const perPage = value.per_page;
  if (!isPositiveInteger(perPage)) {
    return null;
  }

  const total = value.total;
  if (!isNonNegativeInteger(total)) {
    return null;
  }

  const from = value.from;
  if (!isNullableNonNegativeInteger(from)) {
    return null;
  }

  const to = value.to;
  if (!isNullableNonNegativeInteger(to)) {
    return null;
  }

  return {
    current_page: currentPage,
    last_page: lastPage,
    per_page: perPage,
    total,
    from,
    to,
  };
}

export function parseSupplierSuggestionPage(
  value: unknown,
): SupplierSuggestionPage {
  if (!isRecord(value)) {
    throw new ApiError(
      502,
      "The service returned an unexpected supplier list.",
    );
  }

  if (typeof value.message !== "string") {
    throw new ApiError(
      502,
      "The service returned an unexpected supplier list.",
    );
  }

  const meta = toSupplierPaginationMeta(value.meta);
  if (!meta) {
    throw new ApiError(
      502,
      "The service returned an unexpected supplier list.",
    );
  }

  const links = toSupplierPaginationLinks(value.links);
  if (!links) {
    throw new ApiError(
      502,
      "The service returned an unexpected supplier list.",
    );
  }

  if (!Array.isArray(value.data)) {
    throw new ApiError(
      502,
      "The service returned an unexpected supplier list.",
    );
  }

  const data: SupplierSuggestion[] = [];
  for (const item of value.data) {
    const parsedItem = toSupplierSuggestion(item);
    if (!parsedItem) {
      throw new ApiError(
        502,
        "The service returned an unexpected supplier list.",
      );
    }
    data.push(parsedItem);
  }

  return {
    data,
    links,
    meta,
    message: value.message,
  };
}

export async function getSupplierSuggestions(
  filters: SupplierSuggestionFilters = {},
  signal?: AbortSignal,
): Promise<SupplierSuggestionPage> {
  const response = await apiRequest<unknown>(
    `/suppliers${buildSupplierQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseSupplierSuggestionPage(response);
}

function validatePurchaseOrderInput(input: CreatePurchaseOrderInput): void {
  const kindOfRequest = input.kindOfRequest.trim();
  if (!isPurchaseOrderKind(kindOfRequest)) {
    throw new ApiError(422, "Choose a valid kind of request.", {
      kind_of_request: ["Choose a valid kind of request."],
    });
  }

  const supplier = input.supplier.trim();

  if (!supplier) {
    throw new ApiError(422, "Supplier is required.", {
      "form_data.supplier": ["Supplier is required."],
    });
  }

  const address = input.address.trim();

  if (!address) {
    throw new ApiError(422, "Supplier address is required.", {
      "form_data.address": ["Supplier address is required."],
    });
  }

  if (!Array.isArray(input.approvedByIds) || input.approvedByIds.length === 0) {
    throw new ApiError(422, "At least one approver is required.", {
      approved_by_ids: ["At least one approver is required."],
    });
  }

  for (const id of input.approvedByIds) {
    if (!isPositiveInteger(id)) {
      throw new ApiError(422, "Approver IDs must be positive integers.", {
        approved_by_ids: ["Approver IDs must be positive integers."],
      });
    }
  }

  if (new Set(input.approvedByIds).size !== input.approvedByIds.length) {
    throw new ApiError(422, "Duplicate approvers are not allowed.", {
      approved_by_ids: ["Duplicate approvers are not allowed."],
    });
  }

  const notedByIds = input.notedByIds;
  if (!Array.isArray(notedByIds)) {
    throw new ApiError(422, "Noted By approvers must be an array.", {
      noted_by_ids: ["Noted By approvers must be an array."],
    });
  }

  for (const id of notedByIds) {
    if (!isPositiveInteger(id)) {
      throw new ApiError(422, "Noted By IDs must be positive integers.", {
        noted_by_ids: ["Noted By IDs must be positive integers."],
      });
    }
  }

  if (new Set(notedByIds).size !== notedByIds.length) {
    throw new ApiError(422, "Duplicate Noted By approvers are not allowed.", {
      noted_by_ids: ["Duplicate Noted By approvers are not allowed."],
    });
  }

  const notedSet = new Set(notedByIds);
  if (input.approvedByIds.some((id) => notedSet.has(id))) {
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

export function buildPurchaseOrderFormData(
  input: CreatePurchaseOrderInput,
): FormData {
  validatePurchaseOrderInput(input);

  const formData = new FormData();

  const kindOfRequest = input.kindOfRequest.trim();
  if (kindOfRequest) {
    formData.append("kind_of_request", kindOfRequest);
  }

  const supplier = input.supplier.trim();
  formData.append("form_data[supplier]", supplier);

  const address = input.address.trim();
  formData.append("form_data[address]", address);

  input.notedByIds.forEach((id, index) => {
    formData.append(`noted_by_ids[${index}]`, String(id));
  });

  input.approvedByIds.forEach((id, index) => {
    formData.append(`approved_by_ids[${index}]`, String(id));
  });

  input.items.forEach((item, index) => {
    formData.append(
      `items[${index}][quantity]`,
      String(item.quantity).trim(),
    );

    formData.append(
      `items[${index}][description]`,
      item.description.trim(),
    );

    const unitCost = item.unitCost.trim();
    formData.append(
      `items[${index}][unit_cost]`,
      unitCost,
    );

    const remarks = item.remarks.trim();
    formData.append(
      `items[${index}][remarks]`,
      remarks,
    );
  });

  input.attachments.forEach((file, index) => {
    formData.append(`attachments[${index}]`, file);
  });

  return formData;
}

function toPurchaseOrderApprovalStep(
  value: unknown,
): PurchaseOrderApprovalStep | null {
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

  const comment = value.comment;
  if (!isNullableString(comment)) {
    return null;
  }

  const actedAt = value.acted_at;
  if (!isNullableString(actedAt)) {
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
  if (!isNullableString(position)) {
    return null;
  }

  return {
    id,
    level,
    step_type: stepType,
    status,
    comment,
    acted_at: actedAt,
    approver: {
      id: approverId,
      firstname,
      lastname,
      position,
    },
  };
}

export function parseCreatePurchaseOrderResponse(
  value: unknown,
): CreatePurchaseOrderResponse {
  if (!isRecord(value)) {
    throw new ApiError(
      502,
      "The service returned an unexpected purchase order response.",
    );
  }

  if (typeof value.message !== "string") {
    throw new ApiError(
      502,
      "The service returned an unexpected purchase order response.",
    );
  }

  const data = value.data;
  if (!isRecord(data)) {
    throw new ApiError(
      502,
      "The service returned an unexpected purchase order response.",
    );
  }

  const id = data.id;
  if (!isPositiveInteger(id)) {
    throw new ApiError(
      502,
      "The service returned an unexpected purchase order response.",
    );
  }

  const requestCode = data.request_code;
  if (typeof requestCode !== "string") {
    throw new ApiError(
      502,
      "The service returned an unexpected purchase order response.",
    );
  }

  const status = data.status;
  if (typeof status !== "string") {
    throw new ApiError(
      502,
      "The service returned an unexpected purchase order response.",
    );
  }

  const grandTotal = data.grand_total;
  if (typeof grandTotal !== "string") {
    throw new ApiError(
      502,
      "The service returned an unexpected purchase order response.",
    );
  }

  if (!Array.isArray(data.approval_steps)) {
    throw new ApiError(
      502,
      "The service returned an unexpected purchase order response.",
    );
  }

  const approvalSteps: PurchaseOrderApprovalStep[] = [];
  for (const step of data.approval_steps) {
    const parsedStep = toPurchaseOrderApprovalStep(step);
    if (!parsedStep) {
      throw new ApiError(
        502,
        "The service returned an unexpected purchase order response.",
      );
    }
    approvalSteps.push(parsedStep);
  }

  return {
    message: value.message,
    data: {
      id,
      request_code: requestCode,
      status,
      grand_total: grandTotal,
      approval_steps: approvalSteps,
    },
  };
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
): Promise<CreatePurchaseOrderResponse> {
  const body = buildPurchaseOrderFormData(input);
  const csrfToken = await prepareCsrfSession();

  const response = await apiRequest<unknown>(
    "/request-forms/purchase-orders",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
      body,
    },
  );

  return parseCreatePurchaseOrderResponse(response);
}

