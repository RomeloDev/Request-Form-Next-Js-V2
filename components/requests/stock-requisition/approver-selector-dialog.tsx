"use client";

import { useState } from "react";
import { useApproverCandidates } from "@/components/requests/stock-requisition/use-approver-candidates";
import FormField from "@/components/ui/form-field";
import Icon from "@/components/ui/icon";
import Modal from "@/components/ui/modal";
import RefreshButton from "@/components/ui/refresh-button";
import TablePagination from "@/components/ui/table-pagination";
import type { ApproverCandidate } from "@/lib/requests/stock-requisitions";

type ApproverSelectorDialogProps = {
  notedBy: ApproverCandidate[];
  approvedBy: ApproverCandidate[];
  onClose: () => void;
  onSave: (
    notedBy: ApproverCandidate[],
    approvedBy: ApproverCandidate[],
  ) => void;
};

type SelectedApproversProps = {
  title: string;
  description: string;
  candidates: ApproverCandidate[];
  onRemove: (id: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
};

function candidateName(candidate: ApproverCandidate): string {
  return `${candidate.firstname} ${candidate.lastname}`;
}

function moveApprover(
  candidates: ApproverCandidate[],
  currentIndex: number,
  direction: -1 | 1,
): ApproverCandidate[] {
  const nextIndex = currentIndex + direction;

  if (nextIndex < 0 || nextIndex >= candidates.length) {
    return candidates;
  }

  const reordered = [...candidates];
  const [movedCandidate] = reordered.splice(currentIndex, 1);

  reordered.splice(nextIndex, 0, movedCandidate);

  return reordered;
}

function SelectedApprovers({
  title,
  description,
  candidates,
  onRemove,
  onMove,
}: SelectedApproversProps) {
  return (
    <section className="rounded-2xl border border-line/70 bg-slate-50/40 p-4">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>

      {candidates.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-white p-4 text-sm text-muted">
          No users selected.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {candidates.map((candidate, index) => (
            <li
              key={candidate.id}
              className="flex items-center gap-3 rounded-xl border border-line/70 bg-white p-3"
            >
              <span
                aria-label={`Approval order ${index + 1}`}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-semibold text-brand"
              >
                {index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink wrap-anywhere">
                  {candidateName(candidate)}
                </span>
                <span className="block text-sm text-muted wrap-anywhere">
                  {candidate.position || "Position not provided"}
                </span>
              </span>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${candidateName(candidate)} up in ${title}`}
                  title="Move up"
                  className="grid size-10 place-items-center rounded-lg text-muted hover:bg-blue-50 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon name="chevronDown" className="size-4 rotate-180" />
                </button>

                <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === candidates.length - 1}
                  aria-label={`Move ${candidateName(candidate)} down in ${title}`}
                  title="Move down"
                  className="grid size-10 place-items-center rounded-lg text-muted hover:bg-blue-50 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon name="chevronDown" className="size-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onRemove(candidate.id)}
                aria-label={`Remove ${candidateName(candidate)} from ${title}`}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-danger hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                <Icon name="trash" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function ApproverSelectorDialog({
  notedBy,
  approvedBy,
  onClose,
  onSave,
}: ApproverSelectorDialogProps) {
  const candidates = useApproverCandidates();
  const [draftNotedBy, setDraftNotedBy] = useState(notedBy);
  const [draftApprovedBy, setDraftApprovedBy] = useState(approvedBy);

  const selectedIds = new Set([
    ...draftNotedBy.map((candidate) => candidate.id),
    ...draftApprovedBy.map((candidate) => candidate.id),
  ]);

  function addNotedBy(candidate: ApproverCandidate) {
    if (selectedIds.has(candidate.id) || draftNotedBy.length >= 10) {
      return;
    }

    setDraftNotedBy((current) => [...current, candidate]);
  }

  function addApprovedBy(candidate: ApproverCandidate) {
    if (selectedIds.has(candidate.id) || draftApprovedBy.length >= 10) {
      return;
    }

    setDraftApprovedBy((current) => [...current, candidate]);
  }

  const loading = candidates.status === "loading";

  return (
    <Modal
      open
      title={selectedIds.size > 0 ? "Edit approvers" : "Add approvers"}
      onClose={onClose}
      maxWidth="5xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draftNotedBy, draftApprovedBy)}
            className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            Save approvers
          </button>
        </>
      }
    >
      <p className="mb-5 text-sm leading-6 text-muted">
        Select the users who should note and approve this request. A user can
        appear in only one list, with a maximum of ten users per list.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <SelectedApprovers
          title="Noted By"
          description="Optional reviewers who acknowledge the request before formal approval."
          candidates={draftNotedBy}
          onRemove={(id) =>
            setDraftNotedBy((current) =>
              current.filter((candidate) => candidate.id !== id),
            )
          }
          onMove={(index, direction) => {
            setDraftNotedBy((current) =>
              moveApprover(current, index, direction),
            );
          }}
        />

        <SelectedApprovers
          title="Approved By"
          description="At least one final approver is required before submission."
          candidates={draftApprovedBy}
          onRemove={(id) =>
            setDraftApprovedBy((current) =>
              current.filter((candidate) => candidate.id !== id),
            )
          }
          onMove={(index, direction) => {
            setDraftApprovedBy((current) =>
              moveApprover(current, index, direction),
            );
          }}
        />
      </div>

      <section
        aria-labelledby="approver-candidates-title"
        className="mt-5 overflow-hidden rounded-2xl border border-line/70"
      >
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="approver-candidates-title"
                className="font-semibold text-ink"
              >
                Eligible approvers
              </h3>
              <p className="mt-1 text-sm text-muted">
                Eligibility is determined by Laravel from your branch and
                current routing assignments.
              </p>
            </div>

            <RefreshButton
              label="Refresh eligible approvers"
              loading={loading}
              onClick={candidates.refresh}
            />
          </div>

          <FormField
            id="approver-search"
            label="Search approvers"
            type="search"
            placeholder="Name, position, or branch"
            autoComplete="off"
            value={candidates.search}
            onChange={(event) => candidates.changeSearch(event.target.value)}
          />
        </div>

        <div className="overflow-x-auto border-t border-line/70">
          <table className="w-full min-w-[760px] text-left text-base">
            <thead className="bg-slate-50 text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 font-semibold">Branch</th>
                <th className="px-4 py-3 font-semibold">Add as</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted">
                    Loading eligible approvers…
                  </td>
                </tr>
              ) : candidates.status === "forbidden" ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-danger">
                    You are not allowed to load approvers.
                  </td>
                </tr>
              ) : candidates.status === "rate-limited" ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-danger">
                    Too many requests. Wait a moment, then refresh.
                  </td>
                </tr>
              ) : candidates.status === "error" ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center">
                    <p className="text-danger">
                      Eligible approvers could not be loaded.
                    </p>
                    <button
                      type="button"
                      onClick={candidates.refresh}
                      className="mt-3 min-h-11 rounded-xl border border-line bg-white px-4 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : candidates.records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted">
                    No eligible approvers found.
                  </td>
                </tr>
              ) : (
                candidates.records.map((candidate) => {
                  const alreadySelected = selectedIds.has(candidate.id);

                  return (
                    <tr
                      key={candidate.id}
                      className={
                        alreadySelected
                          ? "bg-blue-50/60"
                          : "hover:bg-blue-50/30"
                      }
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink wrap-anywhere">
                          {candidateName(candidate)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted wrap-anywhere">
                        {candidate.position || "Not provided"}
                      </td>
                      <td className="px-4 py-3 text-muted wrap-anywhere">
                        {candidate.branch ??
                          candidate.branch_code ??
                          "Not assigned"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addNotedBy(candidate)}
                            disabled={
                              alreadySelected || draftNotedBy.length >= 10
                            }
                            className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Noted By
                          </button>
                          <button
                            type="button"
                            onClick={() => addApprovedBy(candidate)}
                            disabled={
                              alreadySelected || draftApprovedBy.length >= 10
                            }
                            className="min-h-10 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Approved By
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={candidates.page}
          pageSize={candidates.pageSize}
          totalItems={candidates.meta.total}
          loading={loading}
          itemLabel="candidates"
          ariaLabel="Eligible approver pagination"
          onPageChange={candidates.changePage}
          onPageSizeChange={(size) => {
            if (size === 10 || size === 20 || size === 50) {
              candidates.changePageSize(size);
            }
          }}
        />
      </section>
    </Modal>
  );
}
