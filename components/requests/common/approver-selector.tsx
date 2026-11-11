"use client";

import { useState } from "react";
import ApproverSelectorDialog from "@/components/requests/common/approver-selector-dialog";
import Icon from "@/components/ui/icon";
import type { ApproverCandidate } from "@/lib/requests/stock-requisitions";

type ApproverSelectorProps = {
  notedBy: ApproverCandidate[];
  approvedBy: ApproverCandidate[];
  onNotedByChange: (candidates: ApproverCandidate[]) => void;
  onApprovedByChange: (candidates: ApproverCandidate[]) => void;
  disabled?: boolean;
};

type SignatureApproverListProps = {
  title: string;
  candidates: ApproverCandidate[];
  emptyMessage: string;
};

function candidateName(candidate: ApproverCandidate): string {
  return `${candidate.firstname} ${candidate.lastname}`;
}

function SignatureApproverList({
  title,
  candidates,
  emptyMessage,
}: SignatureApproverListProps) {
  const titleId = `${title.toLowerCase().replaceAll(" ", "-")}-title`;

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="text-base font-semibold text-ink">
        {title}:
      </h3>

      {candidates.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-line bg-white px-4 py-5 text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <ol className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate, index) => (
            <li
              key={candidate.id}
              aria-label={`${title} order ${index + 1}: ${candidateName(candidate)}`}
              className="min-w-0 text-center"
            >
              <span className="block border-b-2 border-ink px-2 pb-1 text-sm leading-5 font-medium text-ink uppercase wrap-anywhere">
                {candidateName(candidate)}
              </span>
              <span className="mt-1 block text-sm leading-5 font-semibold text-ink wrap-anywhere">
                {candidate.position || "Position not provided"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function ApproverSelector({
  notedBy,
  approvedBy,
  onNotedByChange,
  onApprovedByChange,
  disabled,
}: ApproverSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasSelectedApprovers = notedBy.length > 0 || approvedBy.length > 0;

  return (
    <div className="space-y-6 sm:col-span-2">
      <div className="space-y-7 rounded-2xl border border-line/70 bg-slate-50/40 p-4 sm:p-6">
        <SignatureApproverList
          title="Noted By"
          candidates={notedBy}
          emptyMessage="No Noted By approvers selected."
        />

        <SignatureApproverList
          title="Approved By"
          candidates={approvedBy}
          emptyMessage="No Approved By approvers selected."
        />

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white shadow-sm enabled:hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name={hasSelectedApprovers ? "pencil" : "plus"} />
          {hasSelectedApprovers ? "Edit Approver" : "Add Approver"}
        </button>
      </div>

      {dialogOpen && (
        <ApproverSelectorDialog
          notedBy={notedBy}
          approvedBy={approvedBy}
          onClose={() => setDialogOpen(false)}
          onSave={(nextNotedBy, nextApprovedBy) => {
            onNotedByChange(nextNotedBy);
            onApprovedByChange(nextApprovedBy);
            setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
