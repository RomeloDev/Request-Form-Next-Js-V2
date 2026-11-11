"use client";

import PageHeader from "@/components/layouts/page-header";
import DataTable, { type TableColumn } from "@/components/ui/data-table";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import RefreshButton from "@/components/ui/refresh-button";
import TablePagination from "@/components/ui/table-pagination";
import type {
  SharedRequest,
  SharedRequestPage,
} from "@/lib/requests/shared-requests";
import { useSharedRequests } from "./use-shared-requests";

type SharedRequestsPageProps = {
  initialPage: SharedRequestPage | null;
};

const statusStyles: Record<SharedRequest["status"], string> = {
  Pending: "bg-amber-100 text-amber-800",
  Ongoing: "bg-blue-100 text-blue-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Disapproved: "bg-red-100 text-red-800",
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

function personName(request: SharedRequest): string {
  return `${request.requester.firstname} ${request.requester.lastname}`.trim();
}

export default function SharedRequestsPage({
  initialPage,
}: SharedRequestsPageProps) {
  const {
    records,
    meta,
    loadStatus,
    search,
    page,
    pageSize,
    changeSearch,
    changePage,
    changePageSize,
    refresh,
  } = useSharedRequests(initialPage);

  const loading = loadStatus === "loading";
  const failed =
    loadStatus === "error" ||
    loadStatus === "forbidden" ||
    loadStatus === "rate-limited";

  const columns: TableColumn<SharedRequest>[] = [
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
      label: "Requested By",
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
      label: "Request Type",
      render: (request) => request.form_type,
    },
    {
      key: "kind_of_request",
      label: "Kind",
      render: (request) => request.kind_of_request ?? "—",
    },
    {
      key: "shared_at",
      label: "Date Shared",
      render: (request) => (
        <span className="whitespace-nowrap">
          {formatDate(request.shared_at)}
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
      label: "Status",
      render: (request) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[request.status]}`}>
          {request.status}
        </span>
      ),
    },
  ];

  const errorMessage =
    loadStatus === "forbidden"
      ? "You are not allowed to view shared requests."
      : loadStatus === "rate-limited"
        ? "Too many requests were sent. Wait a moment, then try again."
        : "We couldn’t load shared requests. Check your connection and try again.";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="REQUESTS"
        title="Shared Requests"
        description="Track the requests that other users shared with you."
      >
        <RefreshButton
          label="Refresh shared requests"
          showLabel
          loading={loading}
          onClick={refresh}
        />
      </PageHeader>

      {failed ? (
        <FormAlert message={errorMessage}>
          {loadStatus !== "forbidden" && (
            <button
              type="button"
              onClick={refresh}
              className="mt-3 min-h-11 rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-danger hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              Try again
            </button>
          )}
        </FormAlert>
      ) : (
        <section aria-labelledby="shared-requests-title" className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="shared-requests-title" className="text-xl font-semibold">Shared requests</h2>
              <p className="text-sm text-muted">
                {loading ? "Loading requests…" : `${meta.total.toLocaleString()} requests`}
              </p>
            </div>

            <FormField
              id="shared-requests-search"
              label="Search requests"
              type="search"
              placeholder="Request ID, requester, type, or branch"
              autoComplete="off"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
            />
          </div>

          <DataTable
            caption="Requests shared with you"
            columns={columns}
            rows={records}
            rowKey={(request) => request.id}
            loading={loading}
            loadingLabel="Loading shared requests…"
            empty={
              <div>
                <p className="text-lg font-medium">
                  {search
                    ? "No matching shared requests"
                    : "No shared requests yet"}
                </p>
                <p className="mt-2 text-muted">
                  {search
                    ? "Try another search."
                    : "Requests shared with you will appear here."}
                </p>
              </div>
            }
          />

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={meta.total}
            onPageChange={changePage}
            onPageSizeChange={(value) => {
              if (value === 10 || value === 20 || value === 50) {
                changePageSize(value);
              }
            }}
            loading={loading}
            itemLabel="requests"
            ariaLabel="Shared request pagination"
          />
        </section>
      )}
    </div>
  );
}
