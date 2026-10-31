"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FormAlert from "@/components/ui/form-alert";
import Icon from "@/components/ui/icon";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import {
  branchHeadName,
  deleteBranchHeadAssignment,
  type BranchHeadAssignment,
} from "@/lib/admin/branch-heads";

type DeleteBranchHeadDialogProps = {
  assignment: BranchHeadAssignment;
  onClose: () => void;
  onDeleted: (message: string) => void;
  onStale: () => void;
};

export default function DeleteBranchHeadDialog({ assignment, onClose, onDeleted, onStale }: DeleteBranchHeadDialogProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDelete() {
    if (inFlight.current || blocked) return;
    inFlight.current = true;
    setDeleting(true);
    setMessage("");

    try {
      const response = await deleteBranchHeadAssignment(assignment.id);
      onDeleted(response.message);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        onClose();
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        setMessage("This assignment no longer exists. The list has been refreshed.");
        onStale();
      } else if (error instanceof ApiError && error.status === 403) {
        setMessage("You don’t have permission to delete this assignment.");
      } else if (error instanceof ApiError && error.status === 409) {
        setMessage("This assignment changed and could not be removed. Close and refresh the list.");
      } else if (error instanceof ApiError && error.status === 429) {
        setMessage("Too many requests. Wait a moment, then close and refresh before trying again.");
      } else {
        setMessage("We couldn’t confirm whether deletion finished. Close and refresh the list before trying again.");
      }
      setBlocked(true);
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setDeleting(false);
    }
  }

  return (
    <Modal
      open
      title="Delete Branch Head assignment"
      onClose={onClose}
      dismissible={!deleting}
      footer={
        <>
          <button type="button" disabled={deleting} onClick={onClose} className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50">{blocked ? "Close" : "Cancel"}</button>
          {!blocked && <button type="button" disabled={deleting} onClick={handleDelete} aria-busy={deleting} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 font-semibold text-white enabled:hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-50"><Icon name="trash" />{deleting ? "Deleting…" : "Delete assignment"}</button>}
        </>
      }
    >
      <p className="text-lg font-semibold wrap-anywhere">Remove the Branch Head assignment for {branchHeadName(assignment.user)}?</p>
      <p className="mt-3 leading-7 text-muted">This assignment currently routes {assignment.branches.length} branch{assignment.branches.length === 1 ? "" : "es"}. The user, approver role, and all branch records will remain unchanged.</p>
      {deleting && <p role="status" className="mt-4 text-sm text-muted">Deleting assignment. Please wait.</p>}
      {message && <FormAlert ref={alertRef} message={message} />}
    </Modal>
  );
}

