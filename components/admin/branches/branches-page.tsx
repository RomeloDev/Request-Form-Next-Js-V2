"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import PageHeader from "@/components/layouts/page-header";
import DataTable, { type TableColumn } from "@/components/ui/data-table";
import TablePagination from "@/components/ui/table-pagination";
import RefreshButton from "@/components/ui/refresh-button";
import FormField from "@/components/ui/form-field";
import FormSelect from "@/components/ui/form-select";
import FormAlert from "@/components/ui/form-alert";
import RowAction from "@/components/ui/row-action";
import Icon from "@/components/ui/icon";
import TextLink from "@/components/ui/text-link";
import { ApiError } from "@/lib/api";
import { dashboardFor } from "@/lib/auth";
import {
  getBranches,
  type BranchRecord,
} from "@/lib/admin/branches";
import { APP_ROLES } from "@/lib/roles";
import BranchFormDialog from "@/components/admin/branches/branch-form-dialog";
import BranchDetailsDialog from "@/components/admin/branches/branch-details-dialog";
import DeleteBranchDialog from "@/components/admin/branches/delete-branch-dialog";

type SortKey = keyof BranchRecord;

type Sort = {
  key: SortKey;
  direction: "asc" | "desc";
};

type BranchFormState =
  | { mode: "create" }
  | { mode: "edit"; branch: BranchRecord };

const fieldColumns: { key: SortKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "branch", label: "Company" },
  { key: "branch_code", label: "Branch code" },
  { key: "branch_name", label: "Branch name" },
  { key: "acronym", label: "Acronym" },
];

export default function BranchesPage() {
  const { user } = useSession();
  const router = useRouter();
  const canView = user.role === APP_ROLES.ADMIN;

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [attempt, setAttempt] = useState(0);

  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [sort, setSort] = useState<Sort>({
    key: "branch_code",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState<BranchFormState | null>(null);
  const [notice, setNotice] = useState("");
  const [detailsTarget, setDetailsTarget] = useState<BranchRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchRecord | null>(null);

  useEffect(() => {
    if (!canView) return;

    const controller = new AbortController();

    getBranches(controller.signal)
      .then((records) => {
        if (controller.signal.aborted) return;

        setBranches(records);
        setStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          return;
        }

        setStatus("error");
      });

    return () => controller.abort();
  }, [canView, attempt, router]);

  function refresh() {
    setStatus("loading");
    setAttempt((previous) => previous + 1);
  }

  function clearFilters() {
    setSearch("");
    setCompany("");
    setPage(1);
  }

  function changeSort(key: string) {
    const nextKey = fieldColumns.find(
      (column) => column.key === key,
    )?.key;

    if (!nextKey) return;

    setSort((previous) => ({
      key: nextKey,
      direction:
        previous.key === nextKey && previous.direction === "asc"
          ? "desc"
          : "asc",
    }));

    setPage(1);
  }

  const companies = [
    ...new Set(branches.map((branch) => branch.branch)),
  ].sort();

  const query = search.trim().toLowerCase();
  const hasFilters = Boolean(query || company);
  const loading = status === "loading";

  const filtered = branches
    .filter((branch) => {
      const matchesSearch = [
        branch.branch_code,
        branch.branch_name,
        branch.branch,
        branch.acronym,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesCompany =
        !company || branch.branch === company;

      return matchesSearch && matchesCompany;
    })
    .sort((left, right) => {
      const leftValue = left[sort.key];
      const rightValue = right[sort.key];

      const order =
        typeof leftValue === "number" &&
        typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(
              String(rightValue),
              undefined,
              { numeric: true, sensitivity: "base" },
            );

      return sort.direction === "asc" ? order : -order;
    });

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const columns: TableColumn<BranchRecord>[] = [
    ...fieldColumns.map(({ key, label }) => ({
      key,
      label,
      sortable: true,
      render: (branch: BranchRecord) => (
        <span className="wrap-anywhere">
          {key === "id" ? `#${branch.id}` : branch[key]}
        </span>
      ),
    })),
    {
      key: "actions",
      label: "Actions",
      render: (branch) => (
        <div className="flex items-center gap-2">
          <RowAction
            label={`View details for ${branch.branch_code}`}
            icon="eye"
            tone="blue"
            onClick={() => {
              setNotice("");
              setDetailsTarget(branch);
            }}
          />
          <RowAction
            label={`Edit ${branch.branch_code}`}
            icon="pencil"
            tone="blue"
            onClick={() => {
              setNotice("");
              setForm({
                mode: "edit",
                branch,
              });
            }}
          />
          <RowAction
            label={`Delete ${branch.branch_code}`}
            icon="trash"
            tone="danger"
            onClick={() => {
              setNotice("");
              setDeleteTarget(branch);
            }}
          />
        </div>
      ),
    },
  ];

  if (!canView) {
    return (
      <section className="rounded-2xl border border-line bg-white p-6">
        <h1 className="text-2xl font-semibold">Access restricted</h1>
        <p className="mt-3 text-base text-muted">
          This screen is available to administrators.
        </p>
        <div className="mt-5">
          <TextLink href={dashboardFor(user)}>
            Back to dashboard
          </TextLink>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Branches"
        eyebrow="ADMINISTRATION"
        description="View branch locations and their company information."
      >
        <RefreshButton
          label="Refresh branches"
          showLabel
          loading={loading}
          onClick={refresh}
        />

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setNotice("");
            setForm({ mode: "create" });
          }}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-50"
        >
          <Icon name="plus" />
          Add Branch
        </button>
      </PageHeader>

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-base leading-7 text-emerald-900"
        >
          {notice}
        </p>
      )}

      {status === "error" ? (
        <FormAlert message="We couldn’t load branches. Check your connection and try Refresh branches." />
      ) : (
        <section
          aria-labelledby="branches-list-title"
          className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm"
        >
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="branches-list-title"
                className="text-xl font-semibold"
              >
                Branch directory
              </h2>
              <p className="text-sm text-muted">
                {loading
                  ? "Loading branches…"
                  : `${filtered.length} matching branches`}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="branches-search"
                label="Search branches"
                type="search"
                placeholder="Code, name, company, or acronym"
                autoComplete="off"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />

              <FormSelect
                id="branches-company"
                label="Company"
                value={company}
                onChange={(event) => {
                  setCompany(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All companies</option>

                {company && !companies.includes(company) && (
                  <option value={company}>{company}</option>
                )}

                {companies.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </FormSelect>
            </div>

            {(search || company) && (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-11 rounded px-2 text-sm font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand"
              >
                Clear filters
              </button>
            )}
          </div>

          <DataTable
            caption="Branches directory"
            columns={columns}
            rows={rows}
            rowKey={(branch) => branch.id}
            loading={loading}
            loadingLabel="Loading branches…"
            sort={sort}
            onSort={changeSort}
            empty={
              <div>
                <p className="text-lg font-medium">
                  {hasFilters ? "No matching branches" : "No branches yet"}
                </p>
                <p className="mt-2 text-base text-muted">
                  {hasFilters
                    ? "Try different filters or clear your filters."
                    : "Branches will appear here after they are added."}
                </p>
              </div>
            }
          />

          <TablePagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={filtered.length}
            loading={loading}
            itemLabel="branches"
            ariaLabel="Branches table pagination"
            onPageChange={(nextPage) =>
              setPage(Math.max(1, Math.min(nextPage, totalPages)))
            }
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </section>
      )}

      {form && (
        <BranchFormDialog
          key={
            form.mode === "edit"
              ? `edit-${form.branch.id}`
              : "create"
          }
          branch={
            form.mode === "edit"
              ? form.branch
              : undefined
          }
          onClose={() => setForm(null)}
          onSaved={(message) => {
            setForm(null);
            setNotice(message);
            refresh();
          }}
        />
      )}

      {detailsTarget && (
        <BranchDetailsDialog
          key={detailsTarget.id}
          branch={detailsTarget}
          onClose={() => setDetailsTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteBranchDialog
          key={deleteTarget.id}
          branch={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onStale={refresh}
          onDeleted={(message) => {
            setDeleteTarget(null);
            setNotice(message);
            refresh();
          }}
        />
      )}
    </div>
  );
}
