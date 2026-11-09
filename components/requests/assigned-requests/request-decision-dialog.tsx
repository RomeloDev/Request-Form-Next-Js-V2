"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FormAlert from "@/components/ui/form-alert";
import FormTextarea from "@/components/ui/form-textarea";
import Icon from "@/components/ui/icon";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import {
  decideAssignedRequest,
  type RequestDecisionAction,
} from "@/lib/requests/assigned-requests";

type RequestDecisionDialogProps = {
  requestId: number;
  requestCode: string;
  action: RequestDecisionAction;
  onClose: () => void;
  onDecided: (action: RequestDecisionAction) => void;
  onStale: () => void;
};

const maximumCommentLength = 2000;

export default function RequestDecisionDialog({
  requestId,
  requestCode,
  action,
  onClose,
  onDecided,
  onStale,
}: RequestDecisionDialogProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const isDisapproval = action === "disapprove";
  const actionLabel = isDisapproval ? "Disapprove" : "Approve";

  async function handleSubmit(): Promise<void> {
    if (inFlight.current || blocked) return;

    const normalizedComment = comment.trim();

    if (isDisapproval && normalizedComment.length === 0) {
      setCommentError(
        "Explain why this request is being disapproved.",
      );
      return;
    }

    if (normalizedComment.length > maximumCommentLength) {
      setCommentError(
        "The comment must not exceed 2,000 characters.",
      );
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setCommentError("");
    setMessage("");

    try {
      await decideAssignedRequest(
        requestId,
        action,
        normalizedComment,
      );
      onDecided(action);
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
        setCommentError(
          error.errors.comment?.[0] ??
            "Check the decision comment and try again.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 403
      ) {
        setBlocked(true);
        setMessage(
          "You don’t have permission to process this request.",
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
          "This request can no longer be processed. Its status or approval order changed.",
        );
        onStale();
      } else if (
        error instanceof ApiError &&
        error.status === 429
      ) {
        setMessage(
          "Too many decisions were submitted. Wait a moment and try again.",
        );
      } else {
        setBlocked(true);
        setMessage(
          "We couldn’t confirm whether the decision was saved. Close this dialog and refresh the request before trying again.",
        );
        onStale();
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
      title={`${actionLabel} request`}
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
            {blocked ? "Close" : "Go back"}
          </button>

          {!blocked && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              aria-busy={submitting}
              className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-50 ${
                isDisapproval
                  ? "bg-rose-700 enabled:hover:bg-rose-800 focus-visible:outline-rose-700"
                  : "bg-emerald-700 enabled:hover:bg-emerald-800 focus-visible:outline-emerald-700"
              }`}
            >
              <Icon
                name={isDisapproval ? "xCircle" : "checkCircle"}
              />
              {submitting
                ? "Saving decision…"
                : `${actionLabel} request`}
            </button>
          )}
        </>
      }
    >
      <p className="text-lg font-semibold wrap-anywhere text-ink">
        {actionLabel} request {requestCode}?
      </p>
      <p className="mt-3 text-base leading-7 text-muted">
        {isDisapproval
          ? "Disapproval ends the current approval workflow and skips all later pending steps."
          : "Approval records your decision and sends the request to the next approval level, or completes it when this is the final step."}
      </p>

      <div className="mt-6">
        <FormTextarea
          id="decision-comment"
          label="Decision comment"
          required={isDisapproval}
          rows={5}
          maxLength={maximumCommentLength}
          disabled={submitting || blocked}
          value={comment}
          onChange={(event) => {
            setComment(event.target.value);
            if (commentError) setCommentError("");
          }}
          error={commentError}
          hint={
            isDisapproval
              ? "Required. Explain what must be corrected before resubmission."
              : "Optional. Add a short note for the requester or later approvers."
          }
          labelAction={
            <span className="text-sm tabular-nums text-muted">
              {comment.length.toLocaleString()} / 2,000
            </span>
          }
        />
      </div>

      {submitting && (
        <p role="status" className="mt-4 text-sm text-muted">
          Saving your decision. Please wait.
        </p>
      )}

      {message && <FormAlert ref={alertRef} message={message} />}
    </Modal>
  );
}
