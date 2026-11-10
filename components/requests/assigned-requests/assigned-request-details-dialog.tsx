"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RequestDecisionDialog from "@/components/requests/assigned-requests/request-decision-dialog";
import AttachmentPreviewDialog from "@/components/requests/my-requests/attachment-preview-dialog";
import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import {
  getAssignedRequest,
  type AssignedRequestStep,
  type RequestDecisionAction,
} from "@/lib/requests/assigned-requests";
import {
  getApprovalAttachmentFile,
  getRequestAttachmentAction,
  getRequestAttachmentFile,
  type MyRequestAttachment,
  type MyRequestApprovalStep,
  type MyRequestDetails,
  type MyRequestPerson,
  type RequestAttachmentAction,
} from "@/lib/requests/my-requests";

type AssignedRequestDetailsDialogProps = {
  requestId: number;
  canProcess: boolean;
  stepType: AssignedRequestStep["step_type"];
  onClose: () => void;
  onChanged: (action: RequestDecisionAction) => void;
  onStale: () => void;
};

type PendingAttachmentAction = {
  attachmentId: number;
  action: RequestAttachmentAction;
};

type AttachmentPreviewState = {
  fileName: string;
  mimeType: string;
  objectUrl: string;
};

type PendingApprovalAttachmentAction = PendingAttachmentAction & {
  approvalStepId: number;
};

const requestStatusStyles: Record<MyRequestDetails["status"], string> = {
  Pending: "bg-amber-100 text-amber-800",
  Ongoing: "bg-blue-100 text-blue-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Disapproved: "bg-red-100 text-red-800",
  Canceled: "bg-slate-200 text-slate-700",
};

const approvalStatusStyles: Record<
  MyRequestApprovalStep["status"],
  string
> = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Disapproved: "bg-red-100 text-red-800",
  Skipped: "bg-slate-200 text-slate-700",
  Canceled: "bg-slate-200 text-slate-700",
};

const stepTypeLabels: Record<
  MyRequestApprovalStep["step_type"],
  string
> = {
  noted_by: "Noted by",
  approved_by: "Approved by",
  delegated_approval: "Delegated approval",
};

function personName(person: MyRequestPerson): string {
  return `${person.firstname} ${person.lastname}`.trim();
}

function requestPurpose(details: MyRequestDetails): string {
  const purpose = details.form_data?.purpose;
  return typeof purpose === "string" && purpose.trim()
    ? purpose
    : "—";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatMoney(value: string, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} ${value}`;

  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size.toLocaleString()} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function safeDownloadName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|]/g, "_").trim() || "attachment";
}

function saveAttachment(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = safeDownloadName(fileName);
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export default function AssignedRequestDetailsDialog({
  requestId,
  canProcess,
  stepType,
  onClose,
  onChanged,
  onStale,
}: AssignedRequestDetailsDialogProps) {
  const router = useRouter();
  const [details, setDetails] = useState<MyRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [attachmentMessage, setAttachmentMessage] = useState("");
  const [decision, setDecision] =
    useState<RequestDecisionAction | null>(null);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachmentAction | null>(null);
  const [pendingApprovalAttachment, setPendingApprovalAttachment] =
    useState<PendingApprovalAttachmentAction | null>(null);
  const [preview, setPreview] =
    useState<AttachmentPreviewState | null>(null);
  const attachmentControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getAssignedRequest(requestId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setDetails(result);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 419)
        ) {
          router.replace("/login");
          onClose();
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setMessage("This request no longer exists.");
          onStale();
        } else if (error instanceof ApiError && error.status === 403) {
          setMessage("You don’t have permission to view this request.");
        } else if (error instanceof ApiError && error.status === 429) {
          setMessage("Too many requests were sent. Wait a moment and try again.");
        } else {
          setMessage("We couldn’t load the latest request details. Close this dialog and try again.");
        }

        setLoading(false);
      });

    return () => controller.abort();
  }, [onClose, onStale, requestId, router]);

  useEffect(() => {
    return () => {
      attachmentControllerRef.current?.abort();
      if (preview) URL.revokeObjectURL(preview.objectUrl);
    };
  }, [preview]);

  async function handleAttachmentAction(
    attachment: MyRequestAttachment,
  ): Promise<void> {
    const action = getRequestAttachmentAction(attachment.mime_type);
    if (!action || pendingAttachment) return;

    const controller = new AbortController();
    attachmentControllerRef.current?.abort();
    attachmentControllerRef.current = controller;
    setPendingAttachment({ attachmentId: attachment.id, action });
    setAttachmentMessage("");

    try {
      const file = await getRequestAttachmentFile(
        requestId,
        attachment.id,
        action,
        controller.signal,
      );
      if (controller.signal.aborted) return;

      if (action === "preview") {
        setPreview({
          fileName: attachment.original_name,
          mimeType: attachment.mime_type,
          objectUrl: URL.createObjectURL(file),
        });
      } else {
        saveAttachment(file, attachment.original_name);
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) return;

      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 403) {
        setAttachmentMessage("You don’t have permission to access this attachment.");
      } else if (error instanceof ApiError && error.status === 404) {
        setAttachmentMessage("This attachment is no longer available.");
      } else if (error instanceof ApiError && error.status === 415) {
        setAttachmentMessage("This attachment type is unavailable for that action.");
      } else if (error instanceof ApiError && error.status === 429) {
        setAttachmentMessage("Too many attachment requests were sent. Wait a moment and try again.");
      } else {
        setAttachmentMessage("We couldn’t retrieve this attachment. Please try again.");
      }
    } finally {
      if (attachmentControllerRef.current === controller) {
        attachmentControllerRef.current = null;
      }
      if (!controller.signal.aborted) setPendingAttachment(null);
    }
  }

  async function handleApprovalAttachmentAction(
    approvalStepId: number,
    attachment: MyRequestAttachment,
    action: RequestAttachmentAction,
  ): Promise<void> {
    if (pendingApprovalAttachment) return;

    const controller = new AbortController();
    attachmentControllerRef.current?.abort();
    attachmentControllerRef.current = controller;
    setPendingApprovalAttachment({
      approvalStepId,
      attachmentId: attachment.id,
      action,
    });
    setAttachmentMessage("");

    try {
      const file = await getApprovalAttachmentFile(
        requestId,
        approvalStepId,
        attachment.id,
        action,
        controller.signal,
      );
      if (controller.signal.aborted) return;

      if (action === "preview") {
        setPreview({
          fileName: attachment.original_name,
          mimeType: attachment.mime_type,
          objectUrl: URL.createObjectURL(file),
        });
      } else {
        saveAttachment(file, attachment.original_name);
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) return;

      if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 403) {
        setAttachmentMessage("You don’t have permission to access this approved attachment.");
      } else if (error instanceof ApiError && error.status === 404) {
        setAttachmentMessage("This approved attachment is no longer available.");
      } else {
        setAttachmentMessage("We couldn’t retrieve this approved attachment. Please try again.");
      }
    } finally {
      if (attachmentControllerRef.current === controller) {
        attachmentControllerRef.current = null;
      }
      if (!controller.signal.aborted) setPendingApprovalAttachment(null);
    }
  }

  function handleClose(): void {
    attachmentControllerRef.current?.abort();
    setPreview(null);
    onClose();
  }

  return (
    <>
      <Modal
        open
        title="Process request"
        onClose={handleClose}
        maxWidth="4xl"
        footer={
          <>
            {details && (
              <a
                href={`/request/${details.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-xl border border-brand bg-white px-5 py-2.5 text-base font-semibold text-brand hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Print
              </a>
            )}
            {details && canProcess && (
              <>
                <button
                  type="button"
                  onClick={() => setDecision("disapprove")}
                  className="min-h-11 rounded-xl border border-rose-300 bg-white px-5 py-2.5 text-base font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                >
                  Disapprove
                </button>
                <button
                  type="button"
                  onClick={() => setDecision("approve")}
                  className="min-h-11 rounded-xl bg-emerald-700 px-5 py-2.5 text-base font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Approve
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="min-h-11 rounded-xl border border-line bg-white px-5 py-2.5 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Close
            </button>
          </>
        }
      >
        {loading ? (
          <p role="status" className="py-12 text-center text-muted">
            Loading request details…
          </p>
        ) : message ? (
          <FormAlert message={message} />
        ) : details ? (
          <div className="space-y-7">
            <section className="rounded-2xl border border-line/60 bg-slate-50 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold tracking-wide text-muted uppercase">Request ID</p>
                  <h3 className="mt-2 text-2xl font-semibold text-ink">{details.request_code}</h3>
                  <p className="mt-2 text-muted">{details.form_type}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${requestStatusStyles[details.status]}`}>
                  {details.status}
                </span>
              </div>
              <dl className="mt-6 grid gap-5 border-t border-line/60 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="text-sm text-muted">Kind</dt><dd className="mt-1 font-medium">{details.kind_of_request ?? "—"}</dd></div>
                <div><dt className="text-sm text-muted">Purpose</dt><dd className="mt-1 font-medium">{requestPurpose(details)}</dd></div>
                <div><dt className="text-sm text-muted">Grand total</dt><dd className="mt-1 font-semibold">{formatMoney(details.grand_total, details.currency)}</dd></div>
                <div><dt className="text-sm text-muted">Requested by</dt><dd className="mt-1 font-medium">{personName(details.requester)}</dd><dd className="mt-1 text-sm text-muted">{details.requester.position ?? "Position not provided"}</dd></div>
                <div><dt className="text-sm text-muted">Branch</dt><dd className="mt-1 font-medium">{details.branch.branch_code} — {details.branch.branch_name}</dd><dd className="mt-1 text-sm text-muted">{details.branch.branch}</dd></div>
                <div><dt className="text-sm text-muted">Submitted</dt><dd className="mt-1 font-medium">{formatDate(details.created_at)}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="assigned-items-title">
              <div className="flex items-center justify-between gap-3">
                <h3 id="assigned-items-title" className="text-lg font-semibold">Requested items</h3>
                <p className="text-sm text-muted">{details.items.length.toLocaleString()} {details.items.length === 1 ? "item" : "items"}</p>
              </div>
              <div role="region" aria-label="Requested items" tabIndex={0} className="mt-3 overflow-x-auto rounded-2xl border border-line/60 focus-visible:outline-2 focus-visible:outline-brand">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="border-b border-line/60 bg-slate-50 text-sm text-muted"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Unit cost</th><th className="px-4 py-3">Line total</th><th className="px-4 py-3">Remarks</th></tr></thead>
                  <tbody className="divide-y divide-line/50">
                    {details.items.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No request items were returned.</td></tr>
                    ) : details.items.map((item) => (
                      <tr key={item.id}><td className="px-4 py-3 text-muted">{item.line_number}</td><td className="px-4 py-3">{item.quantity}</td><td className="px-4 py-3 font-medium">{item.description}</td><td className="px-4 py-3">{formatMoney(item.unit_cost, details.currency)}</td><td className="px-4 py-3 font-semibold">{formatMoney(item.line_total, details.currency)}</td><td className="px-4 py-3 text-muted">{item.remarks ?? "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="assigned-routing-title">
              <h3 id="assigned-routing-title" className="text-lg font-semibold">Approval routing</h3>
              <ol className="mt-3 grid gap-4 md:grid-cols-2">
                {details.approval_steps.map((step) => (
                  <li key={step.id} className="rounded-2xl border border-line/60 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-semibold text-muted">Step {step.level} · {stepTypeLabels[step.step_type]}</p><p className="mt-3 border-b border-ink pb-1 font-semibold">{personName(step.approver)}</p><p className="mt-1 text-sm text-muted">{step.approver.position ?? "Position not provided"}</p></div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${approvalStatusStyles[step.status]}`}>{step.status}</span>
                    </div>
                    {step.comment && <p className="mt-4 whitespace-pre-wrap wrap-anywhere border-t border-line/60 pt-4 text-sm">{step.comment}</p>}
                    {step.acted_at && <p className="mt-2 text-sm text-muted">Acted {formatDate(step.acted_at)}</p>}
                    {step.attachments.length > 0 && (
                      <div className="mt-4 border-t border-line/60 pt-4">
                        <p className="text-sm font-semibold text-ink">Approved attachments</p>
                        <ul className="mt-2 space-y-2">
                          {step.attachments.map((attachment) => {
                            const pending = pendingApprovalAttachment?.approvalStepId === step.id && pendingApprovalAttachment.attachmentId === attachment.id;

                            return (
                              <li key={attachment.id} className="rounded-xl bg-slate-50 p-3">
                                <p className="text-sm font-medium wrap-anywhere">{attachment.original_name}</p>
                                <p className="mt-1 text-xs text-muted">{formatFileSize(attachment.size_bytes)}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button type="button" disabled={pendingApprovalAttachment !== null} onClick={() => void handleApprovalAttachmentAction(step.id, attachment, "preview")} className="min-h-10 rounded-lg border border-brand bg-white px-3 py-1.5 text-sm font-semibold text-brand hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">
                                    {pending && pendingApprovalAttachment?.action === "preview" ? "Preparing…" : "Preview"}
                                  </button>
                                  <button type="button" disabled={pendingApprovalAttachment !== null} onClick={() => void handleApprovalAttachmentAction(step.id, attachment, "download")} className="min-h-10 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60">
                                    {pending && pendingApprovalAttachment?.action === "download" ? "Preparing…" : "Download"}
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="assigned-documents-title">
              <h3 id="assigned-documents-title" className="text-lg font-semibold">Supporting documents</h3>
              {attachmentMessage && <FormAlert message={attachmentMessage} />}
              {details.attachments.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-line/60 bg-slate-50 p-5 text-muted">No supporting documents were uploaded.</p>
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {details.attachments.map((attachment) => {
                    const action = getRequestAttachmentAction(attachment.mime_type);
                    const pending = pendingAttachment?.attachmentId === attachment.id;
                    return (
                      <li key={attachment.id} className="rounded-xl border border-line/60 bg-slate-50 p-4">
                        <p className="font-medium wrap-anywhere">{attachment.original_name}</p>
                        <p className="mt-1 text-sm text-muted">{attachment.mime_type} · {formatFileSize(attachment.size_bytes)}</p>
                        {action ? (
                          <button type="button" disabled={pendingAttachment !== null} onClick={() => void handleAttachmentAction(attachment)} className="mt-4 min-h-11 rounded-xl border border-brand bg-white px-4 py-2 text-sm font-semibold text-brand hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">
                            {pending ? "Preparing…" : action === "preview" ? "Preview" : "Download"}
                          </button>
                        ) : <p className="mt-3 text-xs text-muted">This file type is unavailable.</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </Modal>

      {preview && (
        <AttachmentPreviewDialog
          fileName={preview.fileName}
          mimeType={preview.mimeType}
          objectUrl={preview.objectUrl}
          onClose={() => setPreview(null)}
        />
      )}

      {decision && details && (
        <RequestDecisionDialog
          requestId={details.id}
          requestCode={details.request_code}
          action={decision}
          allowApprovedAttachments={stepType === "delegated_approval"}
          onClose={() => setDecision(null)}
          onDecided={onChanged}
          onStale={onStale}
        />
      )}
    </>
  );
}
