import {
  parsePurchaseOrderFormData,
} from "@/lib/requests/purchase-orders";

type PurchaseOrderDetailsProps = {
  /**
   * The untrusted, optional form_data object returned by the details API.
   * Parsing happens inside this renderer; nothing is assumed valid.
   */
  formData: Record<string, unknown> | null;
};

/**
 * Read-only Purchase Order renderer for the form-specific supplier data.
 *
 * Request code, status, kind of request, items, server-provided totals,
 * attachments, and the approval timeline are rendered by the shared details
 * dialogs; this component adds the Purchase Order fields on top and is
 * reused by My Requests, Assigned Requests, and Shared Requests details.
 * It renders values only and offers no actions.
 */
export default function PurchaseOrderDetails({
  formData,
}: PurchaseOrderDetailsProps) {
  const { supplier, address } = parsePurchaseOrderFormData(formData);

  return (
    <section
      aria-labelledby="purchase-order-details-title"
      className="rounded-2xl border border-line/60 bg-slate-50 p-5 sm:p-6"
    >
      <h3
        id="purchase-order-details-title"
        className="text-lg font-semibold text-ink"
      >
        Purchase order details
      </h3>
      <p className="mt-1 text-sm text-muted">
        Supplier information saved with this request.
      </p>

      <dl className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Supplier</dt>
          <dd className="mt-1 font-medium text-ink wrap-anywhere">
            {supplier || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Supplier address</dt>
          <dd className="mt-1 font-medium text-ink whitespace-pre-wrap wrap-anywhere">
            {address || "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
