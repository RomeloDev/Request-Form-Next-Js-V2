"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AttachmentPreviewDialog from "@/components/requests/attachment-preview-dialog";
import CheckIssuanceDetails from "@/components/requests/check-issuance/check-issuance-details";
import PurchaseOrderDetails from "@/components/requests/purchase-order/purchase-order-details";
import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import { isCashDisbursementFormType } from "@/lib/requests/cash-disbursements";
import { isCheckIssuanceFormType } from "@/lib/requests/check-issuances";
import {
  isPurchaseOrderFormType,
} from "@/lib/requests/purchase-orders";
import {
  formatRequestMoneyString,
  requestCurrencyDisplay,
} from "@/lib/requests/request-currencies";
import { getSharedRequest } from "@/lib/requests/shared-requests";
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

type SharedRequestDetailsDialogProps = {
  requestId: number;
  onClose: () => void;
  onStale: () => void;
};

type PendingAttachmentAction = {
  attachmentId: number;
  action: RequestAttachmentAction;
  approvalStepId?: number;
};

type AttachmentPreviewState = {
  fileName: string;
  mimeType: string;
  objectUrl: string;
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
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size.toLocaleString()} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentMetadata(
  attachment: MyRequestAttachment,
): string {
  return `${attachment.mime_type} · ${formatFileSize(attachment.size_bytes)}`;
}

function safeDownloadName(fileName: string): string {
  const safeName = fileName
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();

  return safeName || "attachment";
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

/**
 * Read-only view of a request shared with the current user. It renders
 * metadata plus attachment preview/download and a print link only: no edit,
 * cancel, delete, share, revoke, or approval decision actions exist here.
 */
export default function SharedRequestDetailsDialog({
  requestId,
  onClose,
  onStale,
}: SharedRequestDetailsDialogProps) {
  const router = useRouter();
  const [details, setDetails] = useState<MyRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [attachmentMessage, setAttachmentMessage] = useState("");
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachmentAction | null>(null);
  const [preview, setPreview] =
    useState<AttachmentPreviewState | null>(null);
  const attachmentControllerRef =
    useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getSharedRequest(requestId, controller.signal)
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
          setMessage(
            "This shared request is no longer available. The shared requests list has been refreshed.",
          );
          onStale();
        } else if (error instanceof ApiError && error.status === 403) {
          setMessage(
            "You don’t have permission to view this request.",
          );
          onStale();
        } else if (error instanceof ApiError && error.status === 429) {
          setMessage(
            "Too many requests were sent. Wait a moment and try again.",
          );
        } else {
          setMessage(
            "We couldn’t load the request details. Close this dialog and try again.",
          );
        }

        setLoading(false);
      });

    return () => controller.abort();
  }, [onClose, onStale, requestId, router]);

  useEffect(() => {
    return () => {
      attachmentControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const objectUrl = preview?.objectUrl;

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [preview]);

  async function handleAttachmentAction(
    attachment: MyRequestAttachment,
    approvalStepId?: number,
    requestedAction?: RequestAttachmentAction,
  ): Promise<void> {
    const action = requestedAction ?? getRequestAttachmentAction(attachment.mime_type);

    if (!action) {
      setAttachmentMessage(
        "This attachment type is not available for preview or download.",
      );
      return;
    }

    attachmentControllerRef.current?.abort();

    const controller = new AbortController();
    attachmentControllerRef.current = controller;
    setAttachmentMessage("");
    setPendingAttachment({
      attachmentId: attachment.id,
      action,
      approvalStepId,
    });

    try {
      const file = approvalStepId
        ? await getApprovalAttachmentFile(
            requestId,
            approvalStepId,
            attachment.id,
            action,
            controller.signal,
          )
        : await getRequestAttachmentFile(
            requestId,
            attachment.id,
            action,
            controller.signal,
          );

      if (controller.signal.aborted) {
        return;
      }

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
      if (controller.signal.aborted) {
        return;
      }

      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        router.replace("/login");
        handleClose();
        return;
      }

      if (error instanceof ApiError && error.status === 403) {
        setAttachmentMessage(
          "You don’t have permission to access this attachment.",
        );
        onStale();
      } else if (
        error instanceof ApiError &&
        error.status === 404
      ) {
        setAttachmentMessage(
          "This attachment is no longer available.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 415
      ) {
        setAttachmentMessage(
          "This attachment type is not available for that action.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 429
      ) {
        setAttachmentMessage(
          "Too many attachment requests were sent. Wait a moment and try again.",
        );
      } else {
        setAttachmentMessage(
          "We couldn’t retrieve this attachment. Please try again.",
        );
      }
    } finally {
      if (attachmentControllerRef.current === controller) {
        attachmentControllerRef.current = null;
      }

      if (!controller.signal.aborted) {
        setPendingAttachment(null);
      }
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
        title="Shared request details"
        onClose={handleClose}
        maxWidth="4xl"
        footer={
          <>
            {details && details.status !== "Canceled" && (
              <a
                href={`/request/${details.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-xl border border-brand bg-white px-5 py-2.5 text-base font-semibold text-brand hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Print
              </a>
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
                <p className="text-sm font-semibold tracking-wide text-muted uppercase">
                  Request ID
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">
                  {details.request_code}
                </h3>
                <p className="mt-2 text-muted">{details.form_type}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${requestStatusStyles[details.status]}`}
              >
                {details.status}
              </span>
            </div>
            <dl className="mt-6 grid gap-5 border-t border-line/60 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-sm text-muted">Kind</dt>
                <dd className="mt-1 font-medium">
                  {details.kind_of_request ?? "—"}
                </dd>
              </div>
              {isCashDisbursementFormType(details.form_type) && (
                <div>
                  <dt className="text-sm text-muted">Currency</dt>
                  <dd className="mt-1 font-medium">
                    {requestCurrencyDisplay(details.currency)}
                  </dd>
                </div>
              )}
              {!isPurchaseOrderFormType(details.form_type) &&
                !isCashDisbursementFormType(details.form_type) &&
                !isCheckIssuanceFormType(details.form_type) && (
                  <div>
                    <dt className="text-sm text-muted">Purpose</dt>
                    <dd className="mt-1 font-medium">
                      {requestPurpose(details)}
                    </dd>
                  </div>
                )}
              <div>
                <dt className="text-sm text-muted">Grand total</dt>
                <dd className="mt-1 font-semibold">
                  {formatRequestMoneyString(details.grand_total, details.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Requested by</dt>
                <dd className="mt-1 font-medium">
                  {personName(details.requester)}
                </dd>
                <dd className="mt-1 text-sm text-muted">
                  {details.requester.position ?? "Position not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Branch</dt>
                <dd className="mt-1 font-medium">
                  {details.branch.branch_code} — {details.branch.branch_name}
                </dd>
                <dd className="mt-1 text-sm text-muted">
                  {details.branch.branch}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Submitted</dt>
                <dd className="mt-1 font-medium">
                  {formatDate(details.created_at)}
                </dd>
                <dd className="mt-1 text-sm text-muted">
                  Last updated {formatDate(details.updated_at)}
                </dd>
              </div>
            </dl>
          </section>

          {isPurchaseOrderFormType(details.form_type) && (
            <PurchaseOrderDetails formData={details.form_data} />
          )}

          {isCheckIssuanceFormType(details.form_type) && (
            <CheckIssuanceDetails formData={details.form_data} />
          )}

          <section aria-labelledby="shared-items-title">
            <div className="flex items-center justify-between gap-3">
              <h3 id="shared-items-title" className="text-lg font-semibold">
                Requested items
              </h3>
              <p className="text-sm text-muted">
                {details.items.length.toLocaleString()}{" "}
                {details.items.length === 1 ? "item" : "items"}
              </p>
            </div>
            <div
              role="region"
              aria-label="Requested items"
              tabIndex={0}
              className="mt-3 overflow-x-auto rounded-2xl border border-line/60 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <table className="w-full min-w-[800px] text-left">
                <thead className="border-b border-line/60 bg-slate-50 text-sm text-muted">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Unit cost</th>
                    <th className="px-4 py-3">Line total</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {details.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-muted"
                      >
                        No request items were returned.
                      </td>
                    </tr>
                  ) : (
                    details.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-muted">
                          {item.line_number}
                        </td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3 font-medium">
                          {item.description}
                        </td>
                        <td className="px-4 py-3">
                          {formatRequestMoneyString(item.unit_cost, details.currency)}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatRequestMoneyString(item.line_total, details.currency)}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {item.remarks ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="shared-routing-title">
            <h3 id="shared-routing-title" className="text-lg font-semibold">
              Approval routing
            </h3>
            {details.approval_steps.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-line/60 bg-slate-50 p-5 text-muted">
                No approval steps were returned.
              </p>
            ) : (
              <ol className="mt-3 grid gap-4 md:grid-cols-2">
                {details.approval_steps.map((step) => (
                  <li
                    key={step.id}
                    className="rounded-2xl border border-line/60 bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-muted">
                          Step {step.level} · {stepTypeLabels[step.step_type]}
                        </p>
                        <p className="mt-3 border-b border-ink pb-1 font-semibold">
                          {personName(step.approver)}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {step.approver.position ?? "Position not provided"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${approvalStatusStyles[step.status]}`}
                      >
                        {step.status}
                      </span>
                    </div>
                    {step.comment && (
                      <p className="mt-4 whitespace-pre-wrap wrap-anywhere border-t border-line/60 pt-4 text-sm">
                        {step.comment}
                      </p>
                    )}
                    {step.acted_at && (
                      <p className="mt-2 text-sm text-muted">
                        Acted {formatDate(step.acted_at)}
                      </p>
                    )}
                    {step.attachments.length > 0 && (
                      <div className="mt-4 border-t border-line/60 pt-4">
                        <p className="text-sm font-semibold text-ink">
                          Approved attachments
                        </p>
                        <ul className="mt-2 space-y-2">
                          {step.attachments.map((attachment) => {
                            const pending =
                              pendingAttachment?.approvalStepId === step.id &&
                              pendingAttachment.attachmentId === attachment.id;

                            return (
                              <li
                                key={attachment.id}
                                className="rounded-xl bg-slate-50 p-3"
                              >
                                <p className="text-sm font-medium wrap-anywhere">
                                  {attachment.original_name}
                                </p>
                                <p className="mt-1 text-xs text-muted">
                                  {attachmentMetadata(attachment)}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={pendingAttachment !== null}
                                    onClick={() => void handleAttachmentAction(attachment, step.id, "preview")}
                                    aria-label={`Preview ${attachment.original_name}`}
                                    className="min-h-10 rounded-lg border border-brand bg-white px-3 py-1.5 text-sm font-semibold text-brand hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
                                  >
                                    {pending && pendingAttachment?.action === "preview" ? "Preparing…" : "Preview"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pendingAttachment !== null}
                                    onClick={() => void handleAttachmentAction(attachment, step.id, "download")}
                                    aria-label={`Download ${attachment.original_name}`}
                                    className="min-h-10 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
                                  >
                                    {pending && pendingAttachment?.action === "download" ? "Preparing…" : "Download"}
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
            )}
          </section>

          <section aria-labelledby="shared-documents-title">
            <h3 id="shared-documents-title" className="text-lg font-semibold">
              Supporting documents
            </h3>
            {attachmentMessage && (
              <div className="mt-3">
                <FormAlert message={attachmentMessage} />
              </div>
            )}
            {details.attachments.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-line/60 bg-slate-50 p-5 text-muted">
                No supporting documents were uploaded.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {details.attachments.map((attachment) => {
                  const action = getRequestAttachmentAction(
                    attachment.mime_type,
                  );
                  const pendingRequestAttachment =
                    pendingAttachment &&
                    pendingAttachment.approvalStepId === undefined &&
                    pendingAttachment.attachmentId === attachment.id
                      ? pendingAttachment
                      : null;
                  const actionLabel =
                    action === "preview"
                      ? "Preview"
                      : action === "download"
                        ? "Download"
                        : null;

                  return (
                    <li
                      key={attachment.id}
                      className="rounded-xl border border-line/60 bg-slate-50 p-4"
                    >
                      <p className="font-medium wrap-anywhere">
                        {attachment.original_name}
                      </p>
                      <p className="mt-1 text-sm wrap-anywhere text-muted">
                        {attachmentMetadata(attachment)}
                      </p>

                      {actionLabel ? (
                        <button
                          type="button"
                          disabled={pendingAttachment !== null}
                          onClick={() => {
                            void handleAttachmentAction(
                              attachment,
                            );
                          }}
                          aria-label={`${actionLabel} ${attachment.original_name}`}
                          className="mt-4 min-h-11 rounded-xl border border-brand bg-white px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
                        >
                          {pendingRequestAttachment
                            ? pendingRequestAttachment.action ===
                              "preview"
                              ? "Preparing preview…"
                              : "Preparing download…"
                            : actionLabel}
                        </button>
                      ) : (
                        <p className="mt-3 text-xs leading-5 text-muted">
                          Preview and download are unavailable for
                          this file type.
                        </p>
                      )}
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
    </>
  );
}
