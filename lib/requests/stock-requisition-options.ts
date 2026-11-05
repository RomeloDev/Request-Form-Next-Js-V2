/**
 * Approved Stock Requisition categories from the reference application.
 *
 * Keep the stored values stable because existing reports and backend data may
 * compare these exact strings.
 */
export const STOCK_REQUISITION_KIND_OPTIONS = [
  "Office Supplies",
  "New Registration",
  "Utility Bills (Water, Electric, Guard Salary)",
  "Renewal of Unit",
  "Meal / Diesel / Gasoline Allowance",
  "Transfer Ownership of Unit",
  "Shipment Fee",
  "FFE (New / Replacement)",
  "Notarial Fee",
  "Professional Fee",
  "Retaineers Fee",
  "Appliance Repair (e.g. Aircon Cleaning)",
  "MC Service (Office / Service Used)",
  "LTO Accreditation",
  "DTI Accreditation",
  "Cash Advance - Logistics",
  "Others",
] as const;

export type StockRequisitionKind =
  (typeof STOCK_REQUISITION_KIND_OPTIONS)[number];

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
  return (STOCK_REQUISITION_KIND_OPTIONS as readonly string[])
    .includes(value);
}
