"use client";

import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import type { ApproverCandidate } from "@/lib/requests/stock-requisitions";

type PurchaseOrderReviewDialogProps = {
  kindOfRequest: string;
  supplier: string;
  address: string;
  itemCount: number;
  estimatedGrandTotal: string;
  notedBy: ApproverCandidate[];
  approvedBy: ApproverCandidate[];
  attachmentCount: number;
  pending: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
};

type ReviewValueProps = {
  label: string;
  value: string;
  hint?: string;
};

type ReviewPeopleProps = {
  title: string;
  candidates: ApproverCandidate[];
};

function candidateName(candidate: ApproverCandidate): string {
  return `${candidate.firstname} ${candidate.lastname}`;
}

function ReviewValue({ label, value, hint }: ReviewValueProps) {
  return (
    <div className="rounded-xl border border-line/70 bg-white p-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink wrap-anywhere">{value}</dd>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ReviewPeople({ title, candidates }: ReviewPeopleProps) {
  return (
    <section className="mt-4 rounded-xl border border-line/70 bg-white p-4">
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      {candidates.length === 0 ? (
        <p className="mt-1 font-semibold text-ink">None selected</p>
      ) : (
        <ol className="mt-2 space-y-2 font-semibold text-ink">
          {candidates.map((candidate, index) => (
            <li key={candidate.id} className="flex gap-2">
              <span className="text-muted">{index + 1}.</span>
              <span>{candidateName(candidate)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function PurchaseOrderReviewDialog({
  kindOfRequest,
  supplier,
  address,
  itemCount,
  estimatedGrandTotal,
  notedBy,
  approvedBy,
  attachmentCount,
  pending,
  error,
  onClose,
  onConfirm,
}: PurchaseOrderReviewDialogProps) {
  return (
    <Modal
      open
      title="Review Purchase Order Requisition Slip"
      onClose={onClose}
      maxWidth="3xl"
      dismissible={!pending}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
          >
            Back to form
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
            className="min-h-12 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Confirm and submit"}
          </button>
        </>
      }
    >
      <p className="mb-5 text-sm leading-6 text-muted">
        Check these details before submitting. Selecting Confirm and submit
        will create the request.
      </p>

      {error && <FormAlert message={error} />}

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <ReviewValue label="Kind of request" value={kindOfRequest} />
        <ReviewValue label="Supplier" value={supplier} />
        <ReviewValue label="Supplier address" value={address} />
        <ReviewValue label="Requested items" value={String(itemCount)} />
        <ReviewValue
          label="Estimated grand total (preview)"
          value={estimatedGrandTotal}
          hint="The server calculates the final total."
        />
        <ReviewValue
          label="Supporting documents"
          value={String(attachmentCount)}
        />
      </dl>

      <ReviewPeople title="Noted By" candidates={notedBy} />
      <ReviewPeople title="Approved By" candidates={approvedBy} />
    </Modal>
  );
}
