import type { Metadata } from "next";
import Link from "next/link";
import {
  forbidden,
  notFound,
  redirect,
} from "next/navigation";
import CashDisbursementPage from "@/components/requests/cash-disbursement/cash-disbursement-page";
import PurchaseOrderPage from "@/components/requests/purchase-order/purchase-order-page";
import StockRequisitionPage from "@/components/requests/stock-requisition/stock-requisition-page";
import { ApiError } from "@/lib/api";
import { isCashDisbursementFormType } from "@/lib/requests/cash-disbursements";
import { APP_ROLES } from "@/lib/roles";
import { getMyRequestServer } from "@/lib/requests/my-request-server";
import {
  canEditRequestDetails,
  type MyRequestDetails,
} from "@/lib/requests/my-requests";
import { isPurchaseOrderFormType } from "@/lib/requests/purchase-orders";
import { STOCK_REQUISITION_FORM_TYPE } from "@/lib/requests/stock-requisitions";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Edit Request | SMCT Request Form",
};

export default async function EditRequestPage({
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

  let request: MyRequestDetails | null = null;

  try {
    request = await getMyRequestServer(requestId);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 419) {
        redirect("/login");
      }

      if (error.status === 403) forbidden();
      if (error.status === 404) notFound();
    }

  }

  if (!request) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-ink">
          Request unavailable
        </h1>
        <p className="mt-3 leading-7 text-muted">
          We couldn’t load this request for editing. Try again later.
        </p>
      </section>
    );
  }

  if (!canEditRequestDetails(request)) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-ink">
          Request cannot be edited
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          This request is no longer eligible for editing. It may have
          entered the approval process or changed since the request list
          was loaded.
        </p>
        <Link
          href="/request"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Return to My Requests
        </Link>
      </section>
    );
  }

  if (isPurchaseOrderFormType(request.form_type)) {
    return <PurchaseOrderPage initialRequest={request} />;
  }

  if (isCashDisbursementFormType(request.form_type)) {
    return <CashDisbursementPage initialRequest={request} />;
  }

  if (request.form_type === STOCK_REQUISITION_FORM_TYPE) {
    return <StockRequisitionPage initialRequest={request} />;
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold text-ink">
        Request type cannot be edited
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted">
        Editing is not available for this request type.
      </p>
      <Link
        href="/request"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Return to My Requests
      </Link>
    </section>
  );
}
