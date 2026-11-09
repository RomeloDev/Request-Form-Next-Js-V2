"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FormAlert from "@/components/ui/form-alert";
import Icon from "@/components/ui/icon";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import {
  deleteMyRequest,
  type MyRequestStatus,
} from "@/lib/requests/my-requests";

type DeleteRequestDialogProps = {
  requestId: number;
  requestCode: string;
  status: MyRequestStatus;
  onClose: () => void;
  onDeleted: () => void;
  onStale: () => void;
};

export default function DeleteRequestDialog({
  requestId,
  requestCode,
  status,
  onClose,
  onDeleted,
  onStale,
}: DeleteRequestDialogProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const processed = status !== "Pending";

  async function handleDelete(): Promise<void> {
    if (inFlight.current || blocked) return;

    inFlight.current = true;
    setSubmitting(true);
    setMessage("");

    try {
      await deleteMyRequest(requestId);
      onDeleted();
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 403) {
        setBlocked(true);
        setMessage(
          "You don’t have permission to delete this request.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 404
      ) {
        setBlocked(true);
        setMessage(
          "This request no longer exists or was already deleted.",
        );
        onStale();
      } else if (
        error instanceof ApiError &&
        error.status === 429
      ) {
        setMessage(
          "Too many requests were sent. Wait a moment and try again.",
        );
      } else {
        setBlocked(true);
        setMessage(
          "We couldn’t confirm whether the request was deleted. Close this dialog and refresh the list before trying again.",
        );
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      title="Delete request"
      onClose={onClose}
      dismissible={!submitting}
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
          >
            {blocked ? "Close" : "Keep request"}
          </button>

          {!blocked && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                void handleDelete();
              }}
              aria-busy={submitting}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-50"
            >
              <Icon name="trash" />
              {submitting ? "Deleting…" : "Delete request"}
            </button>
          )}
        </>
      }
    >
      <p className="text-lg font-semibold wrap-anywhere text-ink">
        Delete request {requestCode}?
      </p>

      {processed ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">
            This request has already been processed.
          </p>
          <p className="mt-1 text-sm leading-6">
            Its current status is {status}. Deleting it will remove it from
            My Requests even though approval activity may already exist.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-base leading-7 text-muted">
          The request will be removed from My Requests.
        </p>
      )}

      <p className="mt-4 text-sm leading-6 text-muted">
        The system retains related approval history and private supporting
        files for audit and recovery.
      </p>

      {submitting && (
        <p role="status" className="mt-4 text-sm text-muted">
          Deleting request. Please wait.
        </p>
      )}

      {message && <FormAlert ref={alertRef} message={message} />}
    </Modal>
  );
}
