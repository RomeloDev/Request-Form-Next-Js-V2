"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import {
  getMyRequest,
  type MyRequestApprovalStep,
  type MyRequestDetails,
  type MyRequestPerson,
} from "@/lib/requests/my-requests";

type MyRequestDetailsDialogProps = {
  requestId: number;
  onClose: () => void;
  onStale: () => void;
};

const requestStatusStyles: Record<
  MyRequestDetails["status"],
  string
> = {
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

function formatMoney(value: string, currency: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `${currency} ${value}`;
  }

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
  if (size < 1024) {
    return `${size.toLocaleString()} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MyRequestDetailsDialog({
  requestId,
  onClose,
  onStale,
}: MyRequestDetailsDialogProps) {
  const router = useRouter();
  const [details, setDetails] =
    useState<MyRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getMyRequest(requestId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        setDetails(result);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

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
            "This request no longer exists. Close this dialog to view the refreshed list.",
          );
          onStale();
        } else if (
          error instanceof ApiError &&
          error.status === 403
        ) {
          setMessage(
            "You don’t have permission to view this request.",
          );
        } else if (
          error instanceof ApiError &&
          error.status === 429
        ) {
          setMessage(
            "Too many requests were sent. Wait a moment, then close and try again.",
          );
        } else {
          setMessage(
            "We couldn’t load the latest request details. Close this dialog and try again.",
          );
        }

        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [onClose, onStale, requestId, router]);

  return (
    <Modal
      open
      title="Request details"
      onClose={onClose}
      maxWidth="4xl"
    >
      {loading ? (
        <p
          role="status"
          className="py-12 text-center text-muted"
        >
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
                <p className="mt-2 text-muted">
                  {details.form_type}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${requestStatusStyles[details.status]}`}
              >
                {details.status}
              </span>
            </div>

            <dl className="mt-6 grid gap-5 border-t border-line/60 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-sm text-muted">Kind of request</dt>
                <dd className="mt-1 font-medium text-ink">
                  {details.kind_of_request ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Purpose</dt>
                <dd className="mt-1 font-medium text-ink">
                  {requestPurpose(details)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Grand total</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {formatMoney(
                    details.grand_total,
                    details.currency,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Requested by</dt>
                <dd className="mt-1 font-medium text-ink">
                  {personName(details.requester)}
                </dd>
                <dd className="mt-1 text-sm text-muted">
                  {details.requester.position ??
                    "Position not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Branch</dt>
                <dd className="mt-1 font-medium text-ink">
                  {details.branch.branch_code} —{" "}
                  {details.branch.branch_name}
                </dd>
                <dd className="mt-1 text-sm text-muted">
                  {details.branch.branch}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Submitted</dt>
                <dd className="mt-1 font-medium text-ink">
                  {formatDate(details.created_at)}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="request-items-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3
                id="request-items-title"
                className="text-lg font-semibold text-ink"
              >
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
              <table className="w-full min-w-[850px] text-left">
                <caption className="sr-only">
                  Items included in {details.request_code}
                </caption>
                <thead className="border-b border-line/60 bg-slate-50 text-sm text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">#</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Quantity</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Description</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Unit cost</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Line total</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Remarks</th>
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.quantity} {item.unit ?? ""}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatMoney(
                            item.unit_cost,
                            details.currency,
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {formatMoney(
                            item.line_total,
                            details.currency,
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {item.remarks ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t border-line/60 bg-slate-50">
                  <tr>
                    <th
                      scope="row"
                      colSpan={4}
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Grand total
                    </th>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      {formatMoney(
                        details.grand_total,
                        details.currency,
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section aria-labelledby="approval-routing-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3
                id="approval-routing-title"
                className="text-lg font-semibold text-ink"
              >
                Approval routing
              </h3>
              <p className="text-sm text-muted">
                {details.approval_steps.length.toLocaleString()}{" "}
                {details.approval_steps.length === 1
                  ? "step"
                  : "steps"}
              </p>
            </div>

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
                          Step {step.level.toLocaleString()} ·{" "}
                          {stepTypeLabels[step.step_type]}
                        </p>
                        <div className="mt-4 min-w-48 text-center">
                          <p className="border-b border-ink px-2 pb-1 font-semibold text-ink">
                            {personName(step.approver)}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {step.approver.position ??
                              "Position not provided"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${approvalStatusStyles[step.status]}`}
                      >
                        {step.status}
                      </span>
                    </div>

                    {(step.comment || step.acted_at) && (
                      <dl className="mt-4 space-y-3 border-t border-line/60 pt-4 text-sm">
                        {step.comment && (
                          <div>
                            <dt className="text-muted">Comment</dt>
                            <dd className="mt-1 wrap-anywhere text-ink">
                              {step.comment}
                            </dd>
                          </div>
                        )}
                        {step.acted_at && (
                          <div>
                            <dt className="text-muted">Acted at</dt>
                            <dd className="mt-1 text-ink">
                              {formatDate(step.acted_at)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="supporting-documents-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3
                id="supporting-documents-title"
                className="text-lg font-semibold text-ink"
              >
                Supporting documents
              </h3>
              <p className="text-sm text-muted">
                {details.attachments.length.toLocaleString()}{" "}
                {details.attachments.length === 1
                  ? "file"
                  : "files"}
              </p>
            </div>

            {details.attachments.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-line/60 bg-slate-50 p-5 text-muted">
                No supporting documents were uploaded.
              </p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {details.attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="rounded-xl border border-line/60 bg-slate-50 p-4"
                  >
                    <p className="font-medium wrap-anywhere text-ink">
                      {attachment.original_name}
                    </p>
                    <p className="mt-1 text-sm wrap-anywhere text-muted">
                      {attachment.mime_type} ·{" "}
                      {formatFileSize(attachment.size_bytes)}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      Download will be available after its authorized
                      backend endpoint is implemented.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <dl className="grid gap-4 border-t border-line/60 pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Created</dt>
              <dd className="mt-1 font-medium text-ink">
                {formatDate(details.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Last updated</dt>
              <dd className="mt-1 font-medium text-ink">
                {formatDate(details.updated_at)}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </Modal>
  );
}
