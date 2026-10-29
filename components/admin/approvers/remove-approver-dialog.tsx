"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import FormAlert from "@/components/ui/form-alert";
import Icon from "@/components/ui/icon";
import { ApiError } from "@/lib/api";
import {
  approverFullName,
  removeApprover,
  type ApproverUser,
} from "@/lib/admin/approvers";

type RemoveApproverDialogProps = {
  approver: ApproverUser;
  onClose: () => void;
  onRemoved: (message: string) => void;
  onStale: () => void;
};

export default function RemoveApproverDialog({
  approver,
  onClose,
  onRemoved,
  onStale,
}: RemoveApproverDialogProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const [removing, setRemoving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRemove() {
    if (inFlight.current || blocked) return;

    inFlight.current = true;
    setRemoving(true);
    setMessage("");

    try {
      const response = await removeApprover(approver.id);
      onRemoved(response.message);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        onClose();
        return;
      }

      // Do not retry automatically after an uncertain result.
      setBlocked(true);

      if (
        error instanceof ApiError &&
        error.status === 409
      ) {
        setMessage(error.message);

        // The user is no longer an approver, so refresh the list.
        onStale();
      } else if (
        error instanceof ApiError &&
        error.status === 404
      ) {
        setMessage("This user no longer exists.");
        onStale();
      } else if (
        error instanceof ApiError &&
        error.status === 403
      ) {
        setMessage(
          "You don’t have permission to remove approver roles.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 419
      ) {
        setMessage(
          "Your session needs refreshing. Reload the page and try again.",
        );
      } else {
        setMessage(
          "We couldn’t confirm whether the role was removed. " +
            "Close and refresh the list before trying again.",
        );
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setRemoving(false);
    }
  }

  return (
    <Modal
      open
      title="Remove approver"
      onClose={onClose}
      dismissible={!removing}
      footer={
        <>
          <button
            type="button"
            disabled={removing}
            onClick={onClose}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
          >
            {blocked ? "Close" : "Cancel"}
          </button>

          {!blocked && (
            <button
              type="button"
              disabled={removing}
              onClick={handleRemove}
              aria-busy={removing}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-50"
            >
              <Icon name="trash" />
              {removing
                ? "Removing…"
                : "Remove approver"}
            </button>
          )}
        </>
      }
    >
      <p className="text-lg font-semibold wrap-anywhere">
        Remove {approverFullName(approver)} as an approver?
      </p>

      <p className="mt-3 text-base leading-7 text-muted">
        Their account will not be deleted. Their role will return
        to User, and they will no longer have approver access.
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Email</dt>
          <dd className="mt-1 font-medium wrap-anywhere">
            {approver.email}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-muted">Position</dt>
          <dd className="mt-1 font-medium wrap-anywhere">
            {approver.position}
          </dd>
        </div>
      </dl>

      {removing && (
        <p role="status" className="mt-5 text-sm text-muted">
          Removing approver role. Please wait.
        </p>
      )}

      {message && (
        <FormAlert ref={alertRef} message={message} />
      )}
    </Modal>
  );
}