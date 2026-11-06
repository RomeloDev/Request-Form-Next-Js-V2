"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FormAlert from "@/components/ui/form-alert";
import FormTextarea from "@/components/ui/form-textarea";
import Icon from "@/components/ui/icon";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import { cancelMyRequest } from "@/lib/requests/my-requests";

type CancelRequestDialogProps = {
  requestId: number;
  requestCode: string;
  onClose: () => void;
  onCanceled: () => void;
  onStale: () => void;
};

const maximumReasonLength = 1000;

export default function CancelRequestDialog({
  requestId,
  requestCode,
  onClose,
  onCanceled,
  onStale,
}: CancelRequestDialogProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (inFlight.current || blocked) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setReasonError("Enter a reason for canceling this request.");
      return;
    }

    if (trimmedReason.length > maximumReasonLength) {
      setReasonError(
        "The cancellation reason must not exceed 1,000 characters.",
      );
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setReasonError("");
    setMessage("");

    try {
      await cancelMyRequest(requestId, trimmedReason);
      onCanceled();
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 422) {
        setReasonError(
          error.errors.cancellation_reason?.[0] ??
            "Check the cancellation reason and try again.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 403
      ) {
        setBlocked(true);
        setMessage(
          "You don’t have permission to cancel this request.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 404
      ) {
        setBlocked(true);
        setMessage("This request no longer exists.");
        onStale();
      } else if (
        error instanceof ApiError &&
        error.status === 409
      ) {
        setBlocked(true);
        setMessage(
          "This request can no longer be canceled because its status or approval activity changed.",
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
        setMessage(
          "We couldn’t confirm whether the request was canceled. Close this dialog and refresh the list before trying again.",
        );
        setBlocked(true);
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
      title="Cancel request"
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
                void handleSubmit();
              }}
              aria-busy={submitting}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-50"
            >
              <Icon name="xCircle" />
              {submitting ? "Canceling…" : "Cancel request"}
            </button>
          )}
        </>
      }
    >
      <p className="text-lg font-semibold wrap-anywhere text-ink">
        Cancel request {requestCode}?
      </p>
      <p className="mt-3 text-base leading-7 text-muted">
        This action is permanent. The request and its supporting
        records will remain available for history, but its approval
        routing will be canceled.
      </p>

      <div className="mt-6">
        <FormTextarea
          id="cancellation-reason"
          label="Cancellation reason"
          required
          rows={5}
          maxLength={maximumReasonLength}
          disabled={submitting || blocked}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (reasonError) setReasonError("");
          }}
          error={reasonError}
          hint="Explain why this request is being canceled. Maximum 1,000 characters."
          labelAction={
            <span className="text-sm tabular-nums text-muted">
              {reason.length.toLocaleString()} / 1,000
            </span>
          }
        />
      </div>

      {submitting && (
        <p role="status" className="mt-4 text-sm text-muted">
          Canceling request. Please wait.
        </p>
      )}

      {message && (
        <FormAlert ref={alertRef} message={message} />
      )}
    </Modal>
  );
}
