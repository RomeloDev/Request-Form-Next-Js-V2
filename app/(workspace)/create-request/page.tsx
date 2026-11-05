import type { Metadata } from "next";
import StockRequisitionPage from "@/components/requests/stock-requisition/stock-requisition-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Create Stock Requisition | SMCT Request Form",
};

export default async function CreateRequestPage() {
  /*
   * This check runs on the Next.js server before the form is rendered.
   * Laravel will perform its own policy check when APIs are called.
   */
  await requireRole([
    APP_ROLES.USER,
    APP_ROLES.APPROVER,
    APP_ROLES.ADMIN,
  ]);

  return <StockRequisitionPage />;
}