/**
 * Approved Request kinds / categories from the reference application.
 *
 * Keep the stored values stable because existing reports and backend data
 * compare these exact strings.
 */
export const REQUEST_KIND_OPTIONS = [
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

export type RequestKind = (typeof REQUEST_KIND_OPTIONS)[number];

/** Narrow a native select value back to the approved request kind union. */
export function isRequestKind(value: string): value is RequestKind {
  return (REQUEST_KIND_OPTIONS as readonly string[]).includes(value);
}

