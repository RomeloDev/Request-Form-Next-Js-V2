"use client";

import Modal from "@/components/ui/modal";
import type { ApproverCandidate } from "@/lib/requests/stock-requisitions";

type StockRequisitionReviewDialogProps = {
    kindOfRequest: string;
    purpose: string;
    itemCount: number;
    notedBy: ApproverCandidate[];
    approvedBy: ApproverCandidate[];
    attachmentCount: number;
    onClose: () => void;
};

function candidateName(candidate: ApproverCandidate): string {
    return `${candidate.firstname} ${candidate.lastname}`;
}

type ReviewValueProps = {
  label: string;
  value: string;
};

function ReviewValue({ label, value }: ReviewValueProps) {
  return (
    <div className="rounded-xl border border-line/70 bg-white p-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

type ReviewPeopleProps = {
  title: string;
  candidates: ApproverCandidate[];
};

function ReviewPeople({ title, candidates }: ReviewPeopleProps) {
  return (
    <section className="mt-4 rounded-xl border border-line/70 bg-white p-4">
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      {candidates.length === 0 ? (
        <p className="mt-1 font-semibold text-ink">None selected</p>
      ) : (
        <ul className="mt-1 space-y-1 font-semibold text-ink">
          {candidates.map((candidate) => (
            <li key={candidate.id}>{candidateName(candidate)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function StockRequisitionReviewDialog({
  kindOfRequest,
  purpose,
  itemCount,
  notedBy,
  approvedBy,
  attachmentCount,
  onClose,
}: StockRequisitionReviewDialogProps) {
  return (
    <Modal
      open
      title="Review Stock Requisition"
      onClose={onClose}
      maxWidth="3xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand"
        >
          Back to form
        </button>
      }
    >
      <p className="mb-5 text-sm leading-6 text-muted">
        Check these details before submitting. No request has been sent yet.
      </p>

      <dl className="grid gap-4 sm:grid-cols-2">
        <ReviewValue label="Kind of request" value={kindOfRequest} />
        <ReviewValue label="Purpose" value={purpose} />
        <ReviewValue label="Requested items" value={String(itemCount)} />
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