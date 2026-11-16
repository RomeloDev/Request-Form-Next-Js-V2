"use client";

import { useCallback, useState } from "react";
import PageHeader from "@/components/layouts/page-header";
import DataTable, {
  type TableColumn,
} from "@/components/ui/data-table";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import FormSelect from "@/components/ui/form-select";
import RefreshButton from "@/components/ui/refresh-button";
import RowAction from "@/components/ui/row-action";
import TablePagination from "@/components/ui/table-pagination";
import {
  REQUEST_REPORT_FORM_TYPES,
  isRequestReportFormType,
  isRequestReportPerPage,
  isRequestReportStatus,
  type RequestReportListItem,
  type RequestReportPage,
  type RequestReportStatus,
} from "@/lib/admin/request-reports";
import { formatRequestMoneyString } from "@/lib/requests/request-currencies";
import RequestReportDetailsDialog from "./request-report-details-dialog";
import { useRequestReports } from "./use-request-reports";

type ReportsPageProps = {
  initialPage: RequestReportPage | null;
};

const statusStyles: Record<RequestReportStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Ongoing: "bg-blue-100 text-blue-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Disapproved: "bg-red-100 text-red-800",
  Canceled: "bg-slate-200 text-slate-700",
};

const statusOptions: readonly RequestReportStatus[] = [
  "Pending",
  "Ongoing",
  "Completed",
  "Disapproved",
  "Canceled",
];

/**
 * Report dates are shown in the same zone Laravel uses to interpret the
 * date filters. This also keeps server rendering and hydration identical.
 */
function formatReportDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function requesterName(report: RequestReportListItem): string {
  return `${report.requester.firstname} ${report.requester.lastname}`.trim();
}

export default function ReportsPage({
  initialPage,
}: ReportsPageProps) {
  const {
    records,
    meta,
    loadStatus,
    search,
    statusFilter,
    formTypeFilter,
    branchId,
    dateFrom,
    dateTo,
    sort,
    direction,
    page,
    pageSize,
    branches,
    branchesStatus,
    datePairIncomplete,
    isFiltered,
    changeSearch,
    changeStatusFilter,
    changeFormTypeFilter,
    changeBranchId,
    changeDateFrom,
    changeDateTo,
    changeSort,
    changePage,
    changePageSize,
    clearFilters,
    refresh,
  } = useRequestReports(initialPage);

  // Only one report is open at a time. The native dialog restores focus to
  // the View button when it closes.
  const [selectedReportId, setSelectedReportId] =
    useState<number | null>(null);
  const closeDetails = useCallback(() => {
    setSelectedReportId(null);
  }, []);

  const loading = loadStatus === "loading";
  const refreshing = loadStatus === "refreshing";
  const busy = loading || refreshing;
  const failed =
    loadStatus === "error" || loadStatus === "rate-limited";

  const columns: TableColumn<RequestReportListItem>[] = [
    {
      key: "request_code",
      label: "Request code",
      sortable: true,
      render: (report) => (
        <span className="font-semibold whitespace-nowrap text-brand">
          {report.request_code}
        </span>
      ),
    },
    {
      key: "requester",
      label: "Requested by",
      render: (report) => (
        <div className="min-w-44">
          <p className="font-medium">{requesterName(report)}</p>
          <p className="mt-1 text-sm text-muted">
            {report.requester.position ?? "Position not provided"}
          </p>
        </div>
      ),
    },
    {
      key: "form_type",
      label: "Request type",
      sortable: true,
      render: (report) => report.form_type,
    },
    {
      key: "created_at",
      label: "Date",
      sortable: true,
      render: (report) => (
        <span className="whitespace-nowrap">
          {formatReportDate(report.created_at)}
        </span>
      ),
    },
    {
      key: "branch",
      label: "Branch",
      render: (report) => (
        <div className="min-w-40">
          <p className="font-medium">{report.branch.branch_code}</p>
          <p className="mt-1 text-sm text-muted">
            {report.branch.branch_name}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (report) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[report.status]}`}
        >
          {report.status}
        </span>
      ),
    },
    {
      key: "grand_total",
      label: "Grand total",
      sortable: true,
      render: (report) => (
        // The server total is displayed as-is; currency is only the
        // denomination, never a conversion instruction.
        <span className="font-medium whitespace-nowrap tabular-nums">
          {formatRequestMoneyString(
            report.grand_total,
            report.currency,
          )}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (report) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <RowAction
            label={`View report details for ${report.request_code}`}
            icon="eye"
            tone="blue"
            onClick={() => {
              setSelectedReportId(report.id);
            }}
          />
        </div>
      ),
    },
  ];

  if (loadStatus === "forbidden") {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-7">
        <p className="text-sm font-medium text-brand">
          ADMINISTRATION
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          Access restricted
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          You don’t have permission to view request reports.
        </p>
      </section>
    );
  }

  const errorMessage =
    loadStatus === "rate-limited"
      ? "Too many requests were sent. Wait a moment, then try again."
      : "We couldn’t load request reports. Check your connection and try again.";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Request Reports"
        description="Review every request submitted across the organization. The report is read-only and totals come directly from the server."
      >
        <RefreshButton
          label="Refresh reports"
          showLabel
          loading={busy}
          onClick={refresh}
        />
      </PageHeader>

      {failed ? (
        <FormAlert message={errorMessage}>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 min-h-11 rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-danger hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            Try again
          </button>
        </FormAlert>
      ) : (
        <section
          aria-labelledby="reports-list-title"
          aria-busy={busy}
          className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm"
        >
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="reports-list-title"
                className="text-xl font-semibold text-ink"
              >
                Organization request ledger
              </h2>
              <p className="text-sm leading-6 text-muted">
                {loading
                  ? "Loading reports…"
                  : refreshing
                    ? "Refreshing reports…"
                    : `${meta.total.toLocaleString()} ${
                        meta.total === 1
                          ? "report"
                          : "reports"
                      }`}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="sm:col-span-2">
                <FormField
                  id="reports-search"
                  label="Search reports"
                  type="search"
                  placeholder="Request code, requester, request type, or branch"
                  autoComplete="off"
                  maxLength={100}
                  value={search}
                  onChange={(event) => {
                    changeSearch(event.target.value);
                  }}
                />
              </div>

              <FormSelect
                id="reports-status"
                label="Status"
                value={statusFilter}
                onChange={(event) => {
                  const value = event.target.value;

                  if (
                    value === "ALL" ||
                    isRequestReportStatus(value)
                  ) {
                    changeStatusFilter(value);
                  }
                }}
              >
                <option value="ALL">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </FormSelect>

              <FormSelect
                id="reports-form-type"
                label="Request type"
                value={formTypeFilter}
                onChange={(event) => {
                  const value = event.target.value;

                  if (
                    value === "ALL" ||
                    isRequestReportFormType(value)
                  ) {
                    changeFormTypeFilter(value);
                  }
                }}
              >
                <option value="ALL">All request types</option>
                {REQUEST_REPORT_FORM_TYPES.map((formType) => (
                  <option key={formType} value={formType}>
                    {formType}
                  </option>
                ))}
              </FormSelect>

              <FormSelect
                id="reports-branch"
                label="Branch"
                value={branchId === null ? "" : String(branchId)}
                disabled={branchesStatus !== "ready"}
                hint={
                  branchesStatus === "loading"
                    ? "Loading branch options…"
                    : undefined
                }
                onChange={(event) => {
                  const value = event.target.value;

                  changeBranchId(
                    value === "" ? null : Number(value),
                  );
                }}
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_code} — {branch.branch_name}
                  </option>
                ))}
              </FormSelect>

              <FormField
                id="reports-date-from"
                label="Date from"
                type="date"
                max={dateTo || undefined}
                value={dateFrom}
                aria-describedby={
                  datePairIncomplete
                    ? "reports-date-pair-hint"
                    : undefined
                }
                onChange={(event) => {
                  changeDateFrom(event.target.value);
                }}
              />

              <FormField
                id="reports-date-to"
                label="Date to"
                type="date"
                min={dateFrom || undefined}
                value={dateTo}
                aria-describedby={
                  datePairIncomplete
                    ? "reports-date-pair-hint"
                    : undefined
                }
                onChange={(event) => {
                  changeDateTo(event.target.value);
                }}
              />

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!isFiltered}
                  className="min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 text-base leading-6 font-medium text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Clear filters
                </button>
              </div>
            </div>

            {datePairIncomplete && (
              <p
                id="reports-date-pair-hint"
                role="status"
                className="text-sm leading-6 text-muted"
              >
                Select both Date from and Date to to apply the date
                filter. Until both are set, results are not limited
                by date.
              </p>
            )}

            {branchesStatus === "error" && (
              <p
                role="status"
                className="text-sm leading-6 text-muted"
              >
                Branch options couldn’t be loaded. The branch filter
                is disabled, but the report table still works.
              </p>
            )}
          </div>

          <DataTable
            caption="Admin request reports"
            columns={columns}
            rows={records}
            rowKey={(report) => report.id}
            loading={loading}
            loadingLabel="Loading reports…"
            sort={{ key: sort, direction }}
            onSort={changeSort}
            empty={
              <div>
                <p className="text-lg font-medium text-ink">
                  {isFiltered
                    ? "No matching reports"
                    : "No reports yet"}
                </p>
                <p className="mt-2 text-base leading-7 text-muted">
                  {isFiltered
                    ? "Try another search or clear your filters."
                    : "Submitted requests will appear here."}
                </p>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 min-h-11 rounded px-2 font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            }
          />

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={meta.total}
            onPageChange={changePage}
            onPageSizeChange={(value) => {
              if (isRequestReportPerPage(value)) {
                changePageSize(value);
              }
            }}
            loading={busy}
            itemLabel="reports"
            ariaLabel="Request reports table pagination"
            pageSizeOptions={[10, 20, 50]}
          />
        </section>
      )}

      {selectedReportId !== null && (
        <RequestReportDetailsDialog
          key={selectedReportId}
          requestId={selectedReportId}
          onClose={closeDetails}
          onStale={refresh}
        />
      )}
    </div>
  );
}
