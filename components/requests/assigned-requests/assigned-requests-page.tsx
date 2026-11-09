"use client";

import { useCallback, useState } from "react";
import AssignedRequestDetailsDialog from "@/components/requests/assigned-requests/assigned-request-details-dialog";
import PageHeader from "@/components/layouts/page-header";
import DataTable, { type TableColumn } from "@/components/ui/data-table";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import FormSelect from "@/components/ui/form-select";
import Icon from "@/components/ui/icon";
import RefreshButton from "@/components/ui/refresh-button";
import RowAction from "@/components/ui/row-action";
import TablePagination from "@/components/ui/table-pagination";
import type {
  AssignedRequest,
  AssignedRequestPage,
  RequestDecisionAction,
} from "@/lib/requests/assigned-requests";
import type { MyRequestStatus } from "@/lib/requests/my-requests";
import { useAssignedRequests } from "./use-assigned-requests";

type AssignedRequestsPageProps = {
  initialStatus: "ALL" | MyRequestStatus;
  initialPage: AssignedRequestPage | null;
};

const requestStatusStyles: Record<MyRequestStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Ongoing: "bg-blue-100 text-blue-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Disapproved: "bg-red-100 text-red-800",
  Canceled: "bg-slate-200 text-slate-700",
};

const stepStatusStyles: Record<AssignedRequest["my_step"]["status"], string> = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Disapproved: "bg-red-100 text-red-800",
  Skipped: "bg-slate-200 text-slate-700",
  Canceled: "bg-slate-200 text-slate-700",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
}

function personName(request: AssignedRequest): string {
  return `${request.requester.firstname} ${request.requester.lastname}`.trim();
}

export default function AssignedRequestsPage({
  initialStatus,
  initialPage,
}: AssignedRequestsPageProps) {
  const [selectedRequest, setSelectedRequest] =
    useState<AssignedRequest | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const {
    records,
    meta,
    loadStatus,
    search,
    statusFilter,
    page,
    pageSize,
    changeSearch,
    changeStatusFilter,
    changePage,
    changePageSize,
    refresh,
  } = useAssignedRequests(initialStatus, initialPage);

  const loading = loadStatus === "loading";
  const failed =
    loadStatus === "error" ||
    loadStatus === "forbidden" ||
    loadStatus === "rate-limited";

  const closeDetails = useCallback(() => {
    setSelectedRequest(null);
  }, []);

  const handleChanged = useCallback(
    (action: RequestDecisionAction) => {
      setSelectedRequest(null);
      setSuccessMessage(
        action === "approve"
          ? "Request approved successfully."
          : "Request disapproved successfully.",
      );
      refresh();
    },
    [refresh],
  );

  const columns: TableColumn<AssignedRequest>[] = [
    {
      key: "request_code",
      label: "Request ID",
      render: (request) => (
        <span className="font-semibold text-brand">
          {request.request_code}
        </span>
      ),
    },
    {
      key: "requester",
      label: "Requested by",
      render: (request) => (
        <div className="min-w-44">
          <p className="font-medium">{personName(request)}</p>
          <p className="mt-1 text-sm text-muted">
            {request.requester.position ?? "Position not provided"}
          </p>
        </div>
      ),
    },
    {
      key: "form_type",
      label: "Request type",
      render: (request) => request.form_type,
    },
    {
      key: "created_at",
      label: "Date",
      render: (request) => (
        <span className="whitespace-nowrap">
          {formatDate(request.created_at)}
        </span>
      ),
    },
    {
      key: "branch",
      label: "Branch",
      render: (request) => (
        <div className="min-w-40">
          <p className="font-medium">{request.branch.branch_code}</p>
          <p className="mt-1 text-sm text-muted">
            {request.branch.branch_name}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Request status",
      render: (request) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${requestStatusStyles[request.status]}`}>
          {request.status}
        </span>
      ),
    },
    {
      key: "my_step",
      label: "My decision",
      render: (request) => (
        <div className="min-w-32">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${stepStatusStyles[request.my_step.status]}`}>
            {request.my_step.status}
          </span>
          {request.my_step.can_process && (
            <p className="mt-1 text-xs font-medium text-emerald-700">
              Ready for you
            </p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (request) => (
        <RowAction
          label={`${request.my_step.can_process ? "Process" : "View"} request ${request.request_code}`}
          icon={request.my_step.can_process ? "clipboard" : "eye"}
          tone={request.my_step.can_process ? "success" : "blue"}
          onClick={() => {
            setSuccessMessage("");
            setSelectedRequest(request);
          }}
        />
      ),
    },
  ];

  const errorMessage =
    loadStatus === "forbidden"
      ? "You are not allowed to view assigned approval requests."
      : loadStatus === "rate-limited"
        ? "Too many requests were sent. Wait a moment, then try again."
        : "We couldn’t load assigned requests. Check your connection and try again.";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="APPROVALS"
        title="Process Requests"
        description="Review requests assigned to you and record approval decisions in the required order."
      >
        <RefreshButton
          label="Refresh assigned requests"
          showLabel
          loading={loading}
          onClick={refresh}
        />
      </PageHeader>

      {successMessage && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-base text-emerald-800">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{successMessage}</p>
            <button type="button" onClick={() => setSuccessMessage("")} aria-label="Dismiss success message" className="grid size-11 place-items-center rounded-lg hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-700">
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}

      {failed ? (
        <FormAlert message={errorMessage}>
          {loadStatus !== "forbidden" && (
            <button type="button" onClick={refresh} className="mt-3 min-h-11 rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-danger hover:bg-red-100">
              Try again
            </button>
          )}
        </FormAlert>
      ) : (
        <section aria-labelledby="assigned-requests-title" className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="assigned-requests-title" className="text-xl font-semibold">Assigned requests</h2>
              <p className="text-sm text-muted">
                {loading ? "Loading requests…" : `${meta.total.toLocaleString()} requests`}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)] md:items-end">
              <FormField
                id="assigned-requests-search"
                label="Search requests"
                type="search"
                placeholder="Request ID, requester, type, or branch"
                autoComplete="off"
                value={search}
                onChange={(event) => changeSearch(event.target.value)}
              />
              <FormSelect
                id="assigned-requests-status"
                label="Request status"
                value={statusFilter}
                onChange={(event) =>
                  changeStatusFilter(
                    event.target.value as "ALL" | MyRequestStatus,
                  )
                }
              >
                <option value="ALL">All requests</option>
                <option value="Pending">Pending requests</option>
                <option value="Ongoing">Ongoing requests</option>
                <option value="Completed">Completed requests</option>
                <option value="Disapproved">Disapproved requests</option>
              </FormSelect>
            </div>
          </div>

          <DataTable
            caption="Requests assigned to you"
            columns={columns}
            rows={records}
            rowKey={(request) => request.my_step.id}
            loading={loading}
            loadingLabel="Loading assigned requests…"
            empty={
              <div>
                <p className="font-semibold">No assigned requests found</p>
                <p className="mt-2 text-sm text-muted">Try another search or status filter.</p>
              </div>
            }
          />

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={meta.total}
            onPageChange={changePage}
            onPageSizeChange={(value) =>
              changePageSize(value as 10 | 20 | 50)
            }
            loading={loading}
            itemLabel="requests"
            ariaLabel="Assigned request pagination"
          />
        </section>
      )}

      {selectedRequest && (
        <AssignedRequestDetailsDialog
          requestId={selectedRequest.id}
          canProcess={selectedRequest.my_step.can_process}
          onClose={closeDetails}
          onChanged={handleChanged}
          onStale={refresh}
        />
      )}
    </div>
  );
}
