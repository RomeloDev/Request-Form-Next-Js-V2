"use client";

import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import type { ApproverCandidate } from "@/lib/requests/request-approvers";

type CashDisbursementReviewDialogProps = {
  mode?: "create" | "edit";
  kindOfRequest: string;
  currencyLabel: string;
  itemCount: number;
  estimatedGrandTotal: string;
  attachmentCount: number;
  retainedAttachmentCount?: number;
  newAttachmentCount?: number;
  removedAttachmentCount?: number;
  notedBy: ApproverCandidate[];
  approvedBy: ApproverCandidate[];
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

export default function CashDisbursementReviewDialog({
  mode = "create",
  kindOfRequest,
  currencyLabel,
  itemCount,
  estimatedGrandTotal,
  attachmentCount,
  retainedAttachmentCount = 0,
  newAttachmentCount = 0,
  removedAttachmentCount = 0,
  notedBy,
  approvedBy,
  pending,
  error,
  onClose,
  onConfirm,
}: CashDisbursementReviewDialogProps) {
  const editing = mode === "edit";

  return (
    <Modal
      open
      title={
        editing
          ? "Review Cash Disbursement changes"
          : "Review Cash Disbursement Requisition Slip"
      }
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
            {pending
              ? editing
                ? "Updating…"
                : "Submitting…"
              : editing
                ? "Confirm and update"
                : "Confirm and submit"}
          </button>
        </>
      }
    >
      <p className="mb-5 text-sm leading-6 text-muted">
        {editing
          ? "Check these changes before updating the request. A disapproved request will be resubmitted as Pending. The server calculates the final total."
          : "Check these details before submitting. Selecting Confirm and submit will create the request. The server calculates the final total."}
      </p>

      {error && <FormAlert message={error} />}

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <ReviewValue label="Kind of request" value={kindOfRequest} />
        <ReviewValue label="Currency" value={currencyLabel} />
        <ReviewValue label="Requested items" value={String(itemCount)} />
        <ReviewValue
          label="Grand total (preview)"
          value={estimatedGrandTotal}
        />

        {editing ? (
          <>
            <ReviewValue
              label="Retained documents"
              value={String(retainedAttachmentCount)}
            />
            <ReviewValue
              label="New documents"
              value={String(newAttachmentCount)}
            />
            <ReviewValue
              label="Documents to remove"
              value={String(removedAttachmentCount)}
            />
            <ReviewValue
              label="Documents after update"
              value={String(attachmentCount)}
            />
          </>
        ) : (
          <ReviewValue
            label="Supporting documents"
            value={String(attachmentCount)}
          />
        )}
      </dl>

      <ReviewPeople title="Noted By" candidates={notedBy} />
      <ReviewPeople title="Approved By" candidates={approvedBy} />
    </Modal>
  );
}
