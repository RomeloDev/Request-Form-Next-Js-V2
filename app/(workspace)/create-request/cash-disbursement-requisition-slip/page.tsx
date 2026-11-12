import type { Metadata } from "next";
import CashDisbursementPage from "@/components/requests/cash-disbursement/cash-disbursement-page";
import RequestTypeNav from "@/components/requests/common/request-type-nav";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Create Cash Disbursement Requisition Slip | SMCT Request Form",
};

export default async function CreateCashDisbursementPage() {
  /*
   * This check runs on the Next.js server before the form is rendered.
   * Laravel performs its own policy check on every Cash Disbursement API call.
   */
  await requireRole([
    APP_ROLES.USER,
    APP_ROLES.APPROVER,
    APP_ROLES.ADMIN,
  ]);

  return (
    <div className="space-y-6">
      <RequestTypeNav currentHref="/create-request/cash-disbursement-requisition-slip" />
      <CashDisbursementPage />
    </div>
  );
}
