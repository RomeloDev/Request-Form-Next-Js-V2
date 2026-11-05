"use client";

import PageHeader from "@/components/layouts/page-header";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import FormSelect from "@/components/ui/form-select";
import Icon, { type IconName } from "@/components/ui/icon";
import DataTable, {
  type TableColumn,
} from "@/components/ui/data-table";
import RefreshButton from "@/components/ui/refresh-button";
import TablePagination from "@/components/ui/table-pagination";
import {
  type MyRequest,
  type MyRequestStatus,
} from "@/lib/requests/my-requests";
import { useMyRequests } from "./use-my-requests";

const statusStyles: Record<MyRequestStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Ongoing: "bg-blue-100 text-blue-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Disapproved: "bg-red-100 text-red-800",
  Canceled: "bg-slate-200 text-slate-700",
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function MyRequestsPage() {
  const {
    records,
    meta,
    summary,
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
  } = useMyRequests();

  const loading = loadStatus === "loading";
  const failed =
    loadStatus === "error" ||
    loadStatus === "forbidden" ||
    loadStatus === "rate-limited";

  const columns: TableColumn<MyRequest>[] = [
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
          <p className="font-medium">
            {request.branch.branch_code}
          </p>
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
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[request.status]}`}
        >
          {request.status}
        </span>
      ),
    },
  ];

  const errorMessage =
    loadStatus === "forbidden"
      ? "You are not allowed to view these requests."
      : loadStatus === "rate-limited"
        ? "Too many requests were sent. Wait a moment, then try again."
        : "We couldn’t load your requests. Check your connection and try again.";

  const kpiCards: Array<{
    label: string;
    value: string;
    description: string;
    icon: IconName;
    iconClassName: string;
  }> = [
    {
      label: "Pending requests",
      value: loading ? "—" : summary.pending.toLocaleString(),
      description: "Requests awaiting approval",
      icon: "clock",
      iconClassName: "bg-amber-100 text-amber-700",
    },
    {
      label: "Completed requests",
      value: loading ? "—" : summary.completed.toLocaleString(),
      description: "Requests completed successfully",
      icon: "checkCircle",
      iconClassName: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Canceled requests",
      value: loading ? "—" : summary.canceled.toLocaleString(),
      description: "Requests marked as canceled",
      icon: "close",
      iconClassName: "bg-slate-200 text-slate-700",
    },
    {
      label: "Disapproved requests",
      value: loading ? "—" : summary.disapproved.toLocaleString(),
      description: "Requests that were not approved",
      icon: "xCircle",
      iconClassName: "bg-red-100 text-red-700",
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="REQUESTS"
        title="My Requests"
        description="Track the requests you submitted."
      >
        <RefreshButton
          label="Refresh requests"
          showLabel
          loading={loading}
          onClick={refresh}
        />
      </PageHeader>

      {!failed && (
        <section
          aria-labelledby="my-requests-summary-title"
          aria-busy={loading}
        >
          <h2 id="my-requests-summary-title" className="sr-only">
            Request summary
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-line/60 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-wide text-muted uppercase">
                      {card.label}
                    </p>
                    <p className="mt-3 truncate text-3xl font-semibold text-ink tabular-nums">
                      {card.value}
                    </p>
                  </div>
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-xl ${card.iconClassName}`}
                  >
                    <Icon name={card.icon} className="size-5" />
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

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
        <section
          aria-labelledby="my-requests-list-title"
          className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm"
        >
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="my-requests-list-title"
                className="text-xl font-semibold text-ink"
              >
                Submitted requests
              </h2>
              <p className="text-sm text-muted">
                {loading
                  ? "Loading requests…"
                  : `${meta.total.toLocaleString()} requests`}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(13rem,18rem)] md:items-end">
              <FormField
                id="my-requests-search"
                label="Search requests"
                type="search"
                placeholder="Request ID, type, or kind"
                autoComplete="off"
                value={search}
                onChange={(event) => {
                  changeSearch(event.target.value);
                }}
              />

              <FormSelect
                id="my-requests-status"
                label="Status"
                value={statusFilter}
                onChange={(event) => {
                  changeStatusFilter(
                    event.target.value as
                      | "ALL"
                      | MyRequestStatus,
                  );
                }}
              >
                <option value="ALL">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Disapproved">Disapproved</option>
                <option value="Canceled">Canceled</option>
              </FormSelect>
            </div>
          </div>

          <DataTable
            caption="My submitted requests"
            columns={columns}
            rows={records}
            rowKey={(request) => request.id}
            loading={loading}
            loadingLabel="Loading requests…"
            empty={
              <div>
                <p className="text-lg font-medium">
                  {search || statusFilter !== "ALL"
                    ? "No matching requests"
                    : "No requests submitted yet"}
                </p>
                <p className="mt-2 text-muted">
                  {search || statusFilter !== "ALL"
                    ? "Try another search or status filter."
                    : "Your submitted requests will appear here."}
                </p>
              </div>
            }
          />

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={meta.total}
            loading={loading}
            itemLabel="requests"
            ariaLabel="My Requests table pagination"
            onPageChange={changePage}
            onPageSizeChange={(size) => {
              if (size === 10 || size === 20 || size === 50) {
                changePageSize(size);
              }
            }}
          />
        </section>
      )}
    </div>
  );
}
