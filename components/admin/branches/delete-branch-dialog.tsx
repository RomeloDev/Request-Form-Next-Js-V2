"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import FormAlert from "@/components/ui/form-alert";
import Icon from "@/components/ui/icon";
import { ApiError } from "@/lib/api";
import {
  deleteBranch,
  type BranchRecord,
} from "@/lib/admin/branches";

type DeleteBranchDialogProps = {
  branch: BranchRecord;
  onClose: () => void;
  onDeleted: (message: string) => void;
  onStale: () => void;
};

export default function DeleteBranchDialog({
  branch,
  onClose,
  onDeleted,
  onStale,
}: DeleteBranchDialogProps) {
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
      const response = await deleteBranch(branch.id);
      onDeleted(response.message);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        onClose();
        return;
      }

      setBlocked(true);

      if (error instanceof ApiError && error.status === 409) {
        setMessage(error.message);
      } else if (
        error instanceof ApiError &&
        error.status === 404
      ) {
        setMessage("This branch no longer exists.");
        onStale();
      } else if (
        error instanceof ApiError &&
        error.status === 419
      ) {
        setMessage(
          "Your session needs refreshing. Reload the page and try again.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 403
      ) {
        setMessage(
          "You don’t have permission to delete this branch.",
        );
      } else {
        setMessage(
          "We couldn’t confirm whether deletion finished. " +
            "Close and refresh the list before trying again.",
        );
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setDeleting(false);
    }
  }

  return (
    <Modal
      open
      title="Delete branch"
      onClose={onClose}
      dismissible={!deleting}
      footer={
        <>
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
          >
            {blocked ? "Close" : "Cancel"}
          </button>

          {!blocked && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              aria-busy={deleting}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-50"
            >
              <Icon name="trash" />
              {deleting ? "Deleting…" : "Delete branch"}
            </button>
          )}
        </>
      }
    >
      <p className="text-lg font-semibold wrap-anywhere">
        Delete “{branch.branch_code} — {branch.branch_name}”?
      </p>

      <p className="mt-3 text-base leading-7 text-muted">
        This permanently removes the branch. Branches assigned to
        users cannot be deleted.
      </p>

      {deleting && (
        <p role="status" className="mt-4 text-sm text-muted">
          Deleting branch. Please wait.
        </p>
      )}

      {message && (
        <FormAlert ref={alertRef} message={message} />
      )}
    </Modal>
  );
}