"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AddBranchHeadDialog from "@/components/admin/branch-heads/add-branch-head-dialog";
import BranchHeadDetailsDialog from "@/components/admin/branch-heads/branch-head-details-dialog";
import DeleteBranchHeadDialog from "@/components/admin/branch-heads/delete-branch-head-dialog";
import EditBranchHeadDialog from "@/components/admin/branch-heads/edit-branch-head-dialog";
import { useSession } from "@/components/auth/session-provider";
import PageHeader from "@/components/layouts/page-header";
import DataTable, { type TableColumn } from "@/components/ui/data-table";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import Icon from "@/components/ui/icon";
import RefreshButton from "@/components/ui/refresh-button";
import RowAction from "@/components/ui/row-action";
import TablePagination from "@/components/ui/table-pagination";
import TextLink from "@/components/ui/text-link";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  branchHeadName,
  getBranchHeadAssignments,
  type BranchHeadAssignment,
  type BranchHeadAssignmentSort,
  type PaginationMeta,
} from "@/lib/admin/branch-heads";
import { ApiError } from "@/lib/api";
import { dashboardFor } from "@/lib/auth";
import { APP_ROLES } from "@/lib/roles";

type Sort = { key: BranchHeadAssignmentSort; direction: "asc" | "desc" };

const sortableKeys: BranchHeadAssignmentSort[] = ["id", "created_at"];
const emptyMeta: PaginationMeta = { current_page: 1, per_page: 10, total: 0, last_page: 1, from: null, to: null };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not provided" : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

export default function BranchHeadsPage() {
  const { user } = useSession();
  const router = useRouter();
  const canView = user.role === APP_ROLES.ADMIN;
  const [records, setRecords] = useState<BranchHeadAssignment[]>([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [sort, setSort] = useState<Sort>({ key: "created_at", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [detailsTargetId, setDetailsTargetId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<BranchHeadAssignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchHeadAssignment | null>(null);

  const refresh = useCallback(() => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const closeDetails = useCallback(() => setDetailsTargetId(null), []);
  const closeEdit = useCallback(() => setEditTarget(null), []);
  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => setStatus("loading"), 0);

    getBranchHeadAssignments(
      { search: debouncedSearch, sort: sort.key, direction: sort.direction, page, pageSize },
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return;
      const lastPage = Math.max(1, result.meta.last_page);
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setRecords(result.records);
      setMeta(result.meta);
      setStatus("ready");
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        return;
      }
      if (error instanceof ApiError && error.status === 403) setErrorMessage("Access denied. You don’t have permission to view Branch Head assignments.");
      else if (error instanceof ApiError && error.status === 429) setErrorMessage("Too many requests. Wait a moment, then try Refresh Branch Heads.");
      else setErrorMessage("We couldn’t load Branch Head assignments. Check your connection and try Refresh Branch Heads.");
      setStatus("error");
    });

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [attempt, canView, debouncedSearch, page, pageSize, router, sort.direction, sort.key]);

  function changeSort(key: string) {
    if (!sortableKeys.includes(key as BranchHeadAssignmentSort)) return;
    const nextKey = key as BranchHeadAssignmentSort;
    setSort((current) => ({ key: nextKey, direction: current.key === nextKey && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  }

  const columns: TableColumn<BranchHeadAssignment>[] = [
    { key: "id", label: "ID", sortable: true, render: (assignment) => <span className="text-muted">#{assignment.id}</span> },
    { key: "user", label: "Branch Head", render: (assignment) => <div className="min-w-48"><p className="font-medium wrap-anywhere">{branchHeadName(assignment.user)}</p><p className="mt-1 text-sm text-muted wrap-anywhere">{assignment.user.position}</p></div> },
    { key: "home_branch", label: "Home branch / company", render: (assignment) => <span className="block min-w-44 wrap-anywhere">{assignment.user.branch ?? assignment.user.branch_code ?? "Not assigned"}</span> },
    { key: "branches", label: "Assigned branches", render: (assignment) => <div className="flex min-w-56 flex-wrap gap-2">{assignment.branches.map((branch) => <span key={branch.id} title={`${branch.branch_code} — ${branch.branch_name}`} className="rounded-full bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-800">{branch.branch_code}</span>)}</div> },
    { key: "created_at", label: "Created", sortable: true, render: (assignment) => <span className="whitespace-nowrap">{formatDate(assignment.created_at)}</span> },
    { key: "actions", label: "Actions", render: (assignment) => <div className="flex gap-2"><RowAction label={`View assignment ${assignment.id} details`} icon="eye" tone="blue" onClick={() => setDetailsTargetId(assignment.id)} /><RowAction label={`Edit branches for ${branchHeadName(assignment.user)}`} icon="pencil" tone="blue" onClick={() => { setNotice(""); setEditTarget(assignment); }} /><RowAction label={`Delete assignment for ${branchHeadName(assignment.user)}`} icon="trash" tone="danger" onClick={() => { setNotice(""); setDeleteTarget(assignment); }} /></div> },
  ];

  if (!canView) {
    return <section className="rounded-2xl border border-line bg-white p-6"><h1 className="text-2xl font-semibold">Access restricted</h1><p className="mt-3 text-muted">This screen is available to administrators.</p><div className="mt-5"><TextLink href={dashboardFor(user)}>Back to dashboard</TextLink></div></section>;
  }

  const loading = status === "loading";

  return (
    <div className="space-y-7">
      <PageHeader title="Branch Heads" eyebrow="ADMINISTRATION" description="Assign eligible branch leaders to the branches whose requests they will route and review.">
        <RefreshButton label="Refresh Branch Heads" showLabel loading={loading} onClick={refresh} />
        <button type="button" onClick={() => { setNotice(""); setAddOpen(true); }} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700"><Icon name="plus" />Add Branch Head</button>
      </PageHeader>

      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 leading-7 text-emerald-900">{notice}</p>}

      {status === "error" ? <FormAlert message={errorMessage} /> : (
        <section aria-labelledby="branch-head-list-title" className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="branch-head-list-title" className="text-xl font-semibold">Branch Head directory</h2><p className="text-sm text-muted">{loading ? "Loading assignments…" : `${meta.total} assignments`}</p></div>
            <div className="max-w-2xl"><FormField id="branch-head-search" label="Search assignments" type="search" placeholder="Branch Head, position, company, or branch" autoComplete="off" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
          </div>
          <DataTable caption="Branch Head assignments" columns={columns} rows={records} rowKey={(assignment) => assignment.id} loading={loading} loadingLabel="Loading Branch Head assignments…" sort={sort} onSort={changeSort} empty={<div><p className="text-lg font-medium">{debouncedSearch ? "No matching assignments" : "No Branch Head assignments yet"}</p><p className="mt-2 text-muted">{debouncedSearch ? "Try another search or clear your search." : "Created assignments will appear here."}</p></div>} />
          <TablePagination page={page} pageSize={pageSize} totalItems={meta.total} loading={loading} itemLabel="assignments" ariaLabel="Branch Head table pagination" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </section>
      )}

      {addOpen && <AddBranchHeadDialog onClose={closeAdd} onCreated={(message) => { setAddOpen(false); setNotice(message); refresh(); }} />}
      {detailsTargetId !== null && <BranchHeadDetailsDialog assignmentId={detailsTargetId} onClose={closeDetails} onStale={refresh} />}
      {editTarget && <EditBranchHeadDialog key={editTarget.id} assignment={editTarget} onClose={closeEdit} onStale={refresh} onUpdated={(message) => { setEditTarget(null); setNotice(message); refresh(); }} />}
      {deleteTarget && <DeleteBranchHeadDialog key={deleteTarget.id} assignment={deleteTarget} onClose={closeDelete} onStale={refresh} onDeleted={(message) => { setDeleteTarget(null); setNotice(message); refresh(); }} />}
    </div>
  );
}

