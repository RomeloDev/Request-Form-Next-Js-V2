import type { Metadata } from "next";
import {
  forbidden,
  notFound,
  redirect,
} from "next/navigation";
import CashDisbursementPrintPage from "@/components/requests/print/cash-disbursement-print-page";
import PurchaseOrderPrintPage from "@/components/requests/print/purchase-order-print-page";
import StockRequisitionPrintPage from "@/components/requests/print/stock-requisition-print-page";
import { ApiError } from "@/lib/api";
import { isCashDisbursementFormType } from "@/lib/requests/cash-disbursements";
import { isPurchaseOrderFormType } from "@/lib/requests/purchase-orders";
import { getPrintableRequestServer } from "@/lib/requests/printable-request-server";
import type { PrintableRequest } from "@/lib/requests/printable-requests";
import { STOCK_REQUISITION_FORM_TYPE } from "@/lib/requests/stock-requisitions";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Print Request | SMCT Request Form",
};

export default async function PrintRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  await requireRole([
    APP_ROLES.USER,
    APP_ROLES.APPROVER,
    APP_ROLES.ADMIN,
  ]);

  const { requestId: requestIdValue } = await params;
  const requestId = Number(requestIdValue);

  if (!Number.isInteger(requestId) || requestId < 1) {
    notFound();
  }

  let data: PrintableRequest | null = null;
  let unavailableMessage =
    "The printable request could not be loaded. Try again later.";

  try {
    data = await getPrintableRequestServer(requestId);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 419) {
        redirect("/login");
      }

      if (error.status === 403) forbidden();
      if (error.status === 404) notFound();

      if (error.status === 409) {
        unavailableMessage =
          "Canceled requests cannot be printed.";
      }
    }
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-white p-8 text-center text-ink">
        <div>
          <h1 className="text-2xl font-semibold">
            Print document unavailable
          </h1>
          <p className="mt-3 text-muted">
            {unavailableMessage}
          </p>
        </div>
      </main>
    );
  }

  // Renderer selection uses the exact form_type returned by the protected
  // printable-request contract. Anything not implemented yet fails safely
  // instead of rendering the wrong document template.
  if (isPurchaseOrderFormType(data.form_type)) {
    return <PurchaseOrderPrintPage data={data} />;
  }

  if (isCashDisbursementFormType(data.form_type)) {
    return <CashDisbursementPrintPage data={data} />;
  }

  if (data.form_type === STOCK_REQUISITION_FORM_TYPE) {
    return <StockRequisitionPrintPage data={data} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white p-8 text-center text-ink">
      <div>
        <h1 className="text-2xl font-semibold">
          Print document unavailable
        </h1>
        <p className="mt-3 text-muted">
          Printing is not available for this request type.
        </p>
      </div>
    </main>
  );
}
