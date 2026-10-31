"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import PageHeader from "@/components/layouts/page-header";
import DataTable, { type TableColumn } from "@/components/ui/data-table";
import TablePagination from "@/components/ui/table-pagination";
import RefreshButton from "@/components/ui/refresh-button";
import FormField from "@/components/ui/form-field";
import FormAlert from "@/components/ui/form-alert";
import RowAction from "@/components/ui/row-action";
import Icon from "@/components/ui/icon";
import TextLink from "@/components/ui/text-link";
import AddAvpStaffDialog from "@/components/admin/avp-staffs/add-avp-staff-dialog";
import EditAvpStaffDialog from "@/components/admin/avp-staffs/edit-avp-staff-dialog";
import AvpStaffDetailsDialog from "@/components/admin/avp-staffs/avp-staff-details-dialog";
import DeleteAvpStaffDialog from "@/components/admin/avp-staffs/delete-avp-staff-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api";
import { dashboardFor } from "@/lib/auth";
import {
  avpStaffPersonName,
  getAvpStaffAssignments,
  type AvpStaffAssignment,
  type AvpStaffAssignmentSort,
  type PaginationMeta,
} from "@/lib/admin/avp-staffs";
import { APP_ROLES } from "@/lib/roles";

type Sort = { key: AvpStaffAssignmentSort; direction: "asc" | "desc" };
const sortableKeys: AvpStaffAssignmentSort[] = ["id", "created_at"];
const emptyMeta: PaginationMeta = { current_page: 1, per_page: 10, total: 0, last_page: 1, from: null, to: null };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not provided" : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

export default function AvpStaffsPage() {
  const { user } = useSession();
  const router = useRouter();
  const canView = user.role === APP_ROLES.ADMIN;
  const [records, setRecords] = useState<AvpStaffAssignment[]>([]);
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
  const [detailsTarget, setDetailsTarget] = useState<AvpStaffAssignment | null>(null);
  const [editTarget, setEditTarget] = useState<AvpStaffAssignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AvpStaffAssignment | null>(null);
  const closeAddDialog = useCallback(() => setAddOpen(false), []);

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => setStatus("loading"), 0);
    getAvpStaffAssignments({ search: debouncedSearch, sort: sort.key, direction: sort.direction, page, pageSize }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, result.meta.last_page);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setRecords(result.records);
        setMeta(result.meta);
        setStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          return;
        }
        if (error instanceof ApiError && error.status === 403) setErrorMessage("Access denied. You don’t have permission to view AVP Staff assignments.");
        else if (error instanceof ApiError && error.status === 429) setErrorMessage("Too many requests. Wait a moment, then try Refresh AVP Staff.");
        else if (error instanceof ApiError && error.status === 419) setErrorMessage("Your session needs refreshing. Reload this page and try again.");
        else setErrorMessage("We couldn’t load AVP Staff assignments. Check your connection and try Refresh AVP Staff.");
        setStatus("error");
      });
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [attempt, canView, debouncedSearch, page, pageSize, router, sort.direction, sort.key]);

  function refresh() {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }

  function changeSort(key: string) {
    if (!sortableKeys.includes(key as AvpStaffAssignmentSort)) return;
    const nextKey = key as AvpStaffAssignmentSort;
    setSort((current) => ({ key: nextKey, direction: current.key === nextKey && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  }

  const columns: TableColumn<AvpStaffAssignment>[] = [
    { key: "id", label: "ID", sortable: true, render: (assignment) => <span className="text-muted">#{assignment.id}</span> },
    { key: "avp", label: "AVP Finance", render: (assignment) => <div className="min-w-44"><p className="font-medium wrap-anywhere">{avpStaffPersonName(assignment.avp)}</p><p className="mt-1 text-sm text-muted wrap-anywhere">{assignment.avp.position}</p></div> },
    { key: "staff", label: "AVP Staff", render: (assignment) => <div className="min-w-44"><p className="font-medium wrap-anywhere">{avpStaffPersonName(assignment.staff)}</p><p className="mt-1 text-sm text-muted wrap-anywhere">{assignment.staff.position}</p></div> },
    { key: "branches", label: "Assigned Branches", render: (assignment) => <div className="flex min-w-52 flex-wrap gap-2">{assignment.branches.map((branch) => <span key={branch.id} title={`${branch.branch_code} — ${branch.branch_name}`} className="rounded-full bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-800">{branch.branch_code}</span>)}</div> },
    { key: "created_at", label: "Created", sortable: true, render: (assignment) => <span className="whitespace-nowrap">{formatDate(assignment.created_at)}</span> },
    { key: "actions", label: "Actions", render: (assignment) => <div className="flex gap-2"><RowAction label={`View assignment ${assignment.id} details`} icon="eye" tone="blue" onClick={() => setDetailsTarget(assignment)} /><RowAction label={`Edit branches for assignment ${assignment.id}`} icon="pencil" tone="blue" onClick={() => { setNotice(""); setEditTarget(assignment); }} /><RowAction label={`Delete assignment ${assignment.id}`} icon="trash" tone="danger" onClick={() => { setNotice(""); setDeleteTarget(assignment); }} /></div> },
  ];

  if (!canView) {
    return <section className="rounded-2xl border border-line bg-white p-6"><h1 className="text-2xl font-semibold">Access restricted</h1><p className="mt-3 text-muted">This screen is available to administrators.</p><div className="mt-5"><TextLink href={dashboardFor(user)}>Back to dashboard</TextLink></div></section>;
  }

  const loading = status === "loading";
  return (
    <div className="space-y-7">
      <PageHeader title="AVP Staff" eyebrow="ADMINISTRATION" description="Manage branch-specific delegation between AVP Finance users and their eligible staff.">
        <RefreshButton label="Refresh AVP Staff" showLabel loading={loading} onClick={refresh} />
        <button type="button" onClick={() => { setNotice(""); setAddOpen(true); }} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700"><Icon name="plus" />Add AVP Staff</button>
      </PageHeader>

      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 leading-7 text-emerald-900">{notice}</p>}
      {status === "error" ? <FormAlert message={errorMessage} /> : (
        <section aria-labelledby="avp-staff-list-title" className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="avp-staff-list-title" className="text-xl font-semibold">AVP Staff directory</h2><p className="text-sm text-muted">{loading ? "Loading assignments…" : `${meta.total} assignments`}</p></div>
            <div className="max-w-2xl"><FormField id="avp-staff-search" label="Search assignments" type="search" placeholder="AVP, staff, position, or branch" autoComplete="off" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
          </div>
          <DataTable caption="AVP Staff assignments" columns={columns} rows={records} rowKey={(assignment) => assignment.id} loading={loading} loadingLabel="Loading assignments…" sort={sort} onSort={changeSort} empty={<div><p className="text-lg font-medium">{debouncedSearch ? "No matching assignments" : "No AVP Staff assignments yet"}</p><p className="mt-2 text-muted">{debouncedSearch ? "Try another search or clear your search." : "Created assignments will appear here."}</p></div>} />
          <TablePagination page={page} pageSize={pageSize} totalItems={meta.total} loading={loading} itemLabel="assignments" ariaLabel="AVP Staff table pagination" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </section>
      )}

      {addOpen && <AddAvpStaffDialog onClose={closeAddDialog} onCreated={(message) => { setAddOpen(false); setNotice(message); refresh(); }} />}
      {detailsTarget && <AvpStaffDetailsDialog assignment={detailsTarget} onClose={() => setDetailsTarget(null)} />}
      {editTarget && <EditAvpStaffDialog key={editTarget.id} assignment={editTarget} onClose={() => setEditTarget(null)} onStale={refresh} onUpdated={(message) => { setEditTarget(null); setNotice(message); refresh(); }} />}
      {deleteTarget && <DeleteAvpStaffDialog key={deleteTarget.id} assignment={deleteTarget} onClose={() => setDeleteTarget(null)} onStale={refresh} onDeleted={(message) => { setDeleteTarget(null); setNotice(message); refresh(); }} />}
    </div>
  );
}
