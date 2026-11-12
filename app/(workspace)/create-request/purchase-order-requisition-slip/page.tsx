import type { Metadata } from "next";
import PurchaseOrderPage from "@/components/requests/purchase-order/purchase-order-page";
import RequestTypeNav from "@/components/requests/common/request-type-nav";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Create Purchase Order Requisition Slip | SMCT Request Form",
};

export default async function CreatePurchaseOrderPage() {
  /*
   * This check runs on the Next.js server before the form is rendered.
   * Laravel performs its own policy check on every Purchase Order API call.
   */
  await requireRole([
    APP_ROLES.USER,
    APP_ROLES.APPROVER,
    APP_ROLES.ADMIN,
  ]);

  return (
    <div className="space-y-6">
      <RequestTypeNav currentHref="/create-request/purchase-order-requisition-slip" />
      <PurchaseOrderPage />
    </div>
  );
}
