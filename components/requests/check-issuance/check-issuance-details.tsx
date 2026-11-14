import {
  parseCheckIssuanceFormData,
} from "@/lib/requests/check-issuances";

type CheckIssuanceDetailsProps = {
  /**
   * The untrusted, optional form_data object returned by the details API.
   * Parsing happens inside this renderer; nothing is assumed valid.
   */
  formData: Record<string, unknown> | null;
};

/**
 * Read-only Check Issuance renderer for the form-specific payee and bank
 * data.
 *
 * Request code, status, kind of request, items, server-provided totals,
 * attachments, and the approval timeline are rendered by the shared details
 * dialogs; this component adds the Check Issuance fields on top.
 * It renders values only and offers no actions.
 */
export default function CheckIssuanceDetails({
  formData,
}: CheckIssuanceDetailsProps) {
  const { payee, account_no: accountNumber, bank, swift_code: swiftCode } =
    parseCheckIssuanceFormData(formData);

  return (
    <section
      aria-labelledby="check-issuance-details-title"
      className="rounded-2xl border border-line/60 bg-slate-50 p-5 sm:p-6"
    >
      <h3
        id="check-issuance-details-title"
        className="text-lg font-semibold text-ink"
      >
        Check issuance details
      </h3>
      <p className="mt-1 text-sm text-muted">
        Payee and bank information saved with this request.
      </p>

      <dl className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Payee</dt>
          <dd className="mt-1 font-medium text-ink wrap-anywhere">
            {payee || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Account No</dt>
          <dd className="mt-1 font-medium text-ink whitespace-pre-wrap wrap-anywhere">
            {accountNumber || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Bank</dt>
          <dd className="mt-1 font-medium text-ink wrap-anywhere">
            {bank || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Swift Code</dt>
          <dd className="mt-1 font-medium text-ink wrap-anywhere">
            {swiftCode || "Not provided"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
