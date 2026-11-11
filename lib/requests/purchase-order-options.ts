import {
  REQUEST_KIND_OPTIONS,
  type RequestKind,
  isRequestKind,
} from "@/lib/requests/request-kind-options";

/**
 * Approved Purchase Order categories from the shared request kinds.
 *
 * Keep the stored values stable because existing reports and backend data
 * compare these exact strings.
 */
export const PURCHASE_ORDER_KIND_OPTIONS = REQUEST_KIND_OPTIONS;

export type PurchaseOrderKind = RequestKind;

/** Narrow a native select value back to the approved Purchase Order kind union. */
export function isPurchaseOrderKind(
  value: string,
): value is PurchaseOrderKind {
  return isRequestKind(value);
}

