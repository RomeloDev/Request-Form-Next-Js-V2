import type { Metadata } from "next";
import CheckIssuancePage from "@/components/requests/check-issuance/check-issuance-page";
import RequestTypeNav from "@/components/requests/common/request-type-nav";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Create Check Issuance Requisition Slip | SMCT Request Form",
};

export default async function CreateCheckIssuancePage() {
  /*
   * This check runs on the Next.js server before the form is rendered.
   * Laravel performs its own policy check on every Check Issuance API call.
   */
  await requireRole([
    APP_ROLES.USER,
    APP_ROLES.APPROVER,
    APP_ROLES.ADMIN,
  ]);

  return (
    <div className="space-y-6">
      <RequestTypeNav currentHref="/create-request/check-issuance-requisition-slip" />
      <CheckIssuancePage />
    </div>
  );
}
