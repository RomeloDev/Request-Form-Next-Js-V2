import {
  REQUEST_KIND_OPTIONS,
  type RequestKind,
  isRequestKind,
} from "@/lib/requests/request-kind-options";

/**
 * Approved Stock Requisition categories from the reference application.
 *
 * Keep the stored values stable because existing reports and backend data may
 * compare these exact strings.
 */
export const STOCK_REQUISITION_KIND_OPTIONS = REQUEST_KIND_OPTIONS;

export type StockRequisitionKind = RequestKind;

export const STOCK_REQUISITION_PURPOSE_OPTIONS = [
  {
    value: "Repair & Maintenance",
    label: "Repair & Maintenance",
    description: "Repairs, servicing, or maintenance-related needs.",
  },
  {
    value: "Repo. Recon",
    label: "Repo. Recon",
    description: "A request related to repossessed-unit reconditioning.",
  },
  {
    value: "Office/Service Used",
    label: "Office/Service Used",
    description: "Items intended for office operations or service use.",
  },
] as const;

export type StockRequisitionPurpose =
  (typeof STOCK_REQUISITION_PURPOSE_OPTIONS)[number]["value"];

/** Narrow a native select value back to the approved option union. */
export function isStockRequisitionKind(
  value: string,
): value is StockRequisitionKind {
  return isRequestKind(value);
}

export function isStockRequisitionPurpose(
  value: string,
): value is StockRequisitionPurpose {
  return STOCK_REQUISITION_PURPOSE_OPTIONS.some(
    (option) => option.value === value,
  );
}
