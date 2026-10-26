"use client";

import { useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import PageHeader from "@/components/layouts/page-header";
import DataTable, { type TableColumn } from "@/components/ui/data-table";
import FormField from "@/components/ui/form-field";
import FormSelect from "@/components/ui/form-select";
import TextLink from "@/components/ui/text-link";
import StatusBadge from "@/components/ui/status-badge";
import Icon from "@/components/ui/icon";
import MetricCard from "@/components/ui/metric-card";
import RefreshButton from "@/components/ui/refresh-button";
import RowAction from "@/components/ui/row-action";
import TablePagination from "@/components/ui/table-pagination";
import UserDetailsDialog from "@/components/admin/users/user-details-dialog";
import { useUserDirectory, type UserSortKey } from "@/components/admin/users/use-user-directory";
import { branchCodeFor, userFullName, type AdminUser } from "@/lib/admin/users";
import { dashboardFor } from "@/lib/auth";

const secondaryButton = "min-h-12 rounded-xl border border-line bg-white px-4 py-3 text-base leading-6 font-medium text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-500";

export default function UsersPage() {
  const { user: currentUser } = useSession();
  const canView = currentUser.role === "Admin";
  const directory = useUserDirectory(canView);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const { data, state } = directory;
  const loading = state.status === "loading";
  const hasFilters = Boolean(directory.search || directory.role || directory.status);

  if (!canView || state.status === "forbidden") {
    return <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-7"><p className="text-sm font-medium text-brand">ADMINISTRATION</p><h1 className="mt-3 text-2xl font-semibold">Access restricted</h1><p className="mt-3 text-base leading-7 text-muted">You don’t have permission to view the users list.</p><div className="mt-5"><TextLink href={dashboardFor(currentUser)}>Back to dashboard</TextLink></div></section>;
  }

  const columns: TableColumn<AdminUser>[] = [
    { key: "id", label: "ID", sortable: true, render: (user) => <span className="text-muted">#{user.id}</span> },
    { key: "name", label: "Name", sortable: true, render: (user) => <div className="min-w-44"><p className="font-medium text-ink">{userFullName(user)}</p><p className="mt-1 text-sm text-muted">@{user.username}</p></div> },
    { key: "branch", label: "Branch code", sortable: true, render: (user) => <span className="whitespace-nowrap">{branchCodeFor(user, data?.branchCodes ?? {})}</span> },
    { key: "email", label: "Email", sortable: true, render: (user) => <span className="text-muted">{user.email || "Not provided"}</span> },
    { key: "role", label: "Role", sortable: true, render: (user) => <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-medium whitespace-nowrap">{user.role}</span> },
    { key: "status", label: "Status", sortable: true, render: (user) => <StatusBadge status={user.verification_status} /> },
    { key: "actions", label: "Actions", render: (user) => <div className="flex items-center gap-2 whitespace-nowrap">
      <RowAction label={`View details for ${userFullName(user)}`} icon="eye" tone="blue" onClick={() => setSelected(user)} />
      <RowAction label={`Edit ${userFullName(user)}`} icon="pencil" disabled />
      <RowAction label={`Delete ${userFullName(user)}`} icon="trash" tone="danger" disabled />
      {user.email_verified_at === null && <RowAction label={`Verify ${userFullName(user)}`} icon="shieldCheck" tone="success" disabled />}
    </div> },
  ];

  return (
    <div className="space-y-7">
      <PageHeader title="Users" eyebrow="ADMINISTRATION" description="View registered accounts and their verification status. Admin accounts are excluded from this list.">
        <RefreshButton label="Refresh users" onClick={directory.refresh} loading={loading} showLabel />
        <button type="button" disabled title="Account creation is not available yet." className="inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-5 py-3 text-base font-semibold text-slate-600"><Icon name="plus" />Add User</button>
      </PageHeader>

      <section aria-label="User summary" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
        <MetricCard headingLevel={2} label="All users" value={data?.users.length} icon="users" tone="blue" loading={loading} note="Registered accounts" />
        <MetricCard headingLevel={2} label="Verified" value={data?.users.filter((user) => user.verification_status === "Verified").length} icon="userCheck" tone="emerald" loading={loading} note="Administrator verified" />
        <MetricCard headingLevel={2} label="Not Verified" value={data?.users.filter((user) => user.verification_status === "Not Verified").length} icon="clock" tone="amber" loading={loading} note="Awaiting verification" />
      </section>

      {state.status === "error" ? (
        <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><h2 className="text-xl font-semibold text-danger">We couldn’t load users</h2><p className="mt-2 text-base leading-7 text-danger">Please check your connection and try again.</p><button type="button" onClick={directory.refresh} className={`${secondaryButton} mt-5`}>Try again</button></section>
      ) : (
        <section aria-labelledby="users-list-title" className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm">
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 id="users-list-title" className="text-xl font-semibold">User directory</h2><p className="text-sm leading-6 text-muted">{loading ? "Loading accounts…" : `${directory.filteredCount} matching ${directory.filteredCount === 1 ? "account" : "accounts"}`}</p></div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] items-start gap-4">
              <FormField id="users-search" type="search" label="Search users" placeholder="Name, email, employee ID, branch…" value={directory.search} onChange={(event) => directory.changeSearch(event.target.value)} autoComplete="off" />
              <FormSelect id="users-role" label="Role" value={directory.role} onChange={(event) => directory.changeRole(event.target.value)}><option value="">All roles</option>{directory.roles.map((role) => <option key={role} value={role}>{role}</option>)}</FormSelect>
              <FormSelect id="users-status" label="Verification status" value={directory.status} onChange={(event) => directory.changeStatus(event.target.value)}><option value="">All statuses</option><option value="Verified">Verified</option><option value="Not Verified">Not Verified</option></FormSelect>
            </div>
            {hasFilters && <button type="button" onClick={directory.clearFilters} className="mt-3 min-h-11 rounded px-1 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand">Clear filters</button>}
            {data?.branchLabelsUnavailable && <p role="status" className="mt-4 text-sm leading-6 text-muted">Branch codes couldn’t be loaded. Branch IDs are shown instead.</p>}
          </div>

          <DataTable caption="Registered non-Admin users" columns={columns} rows={directory.rows} rowKey={(user) => user.id} loading={loading} loadingLabel="Loading users…" sort={directory.sort} onSort={(key) => directory.changeSort(key as UserSortKey)} empty={<div><p className="text-lg font-medium text-ink">{hasFilters ? "No matching users" : "No users to display"}</p><p className="mt-2 text-base leading-7 text-muted">{hasFilters ? "Try another search or clear your filters." : "Registered non-Admin accounts will appear here."}</p>{hasFilters && <button type="button" onClick={directory.clearFilters} className="mt-3 min-h-11 rounded px-2 font-semibold text-brand underline hover:no-underline focus-visible:outline-2 focus-visible:outline-brand">Clear filters</button>}</div>} />

          <TablePagination page={directory.currentPage} pageSize={directory.pageSize} totalItems={directory.filteredCount} onPageChange={directory.changePage} onPageSizeChange={directory.changePageSize} loading={loading} itemLabel="users" ariaLabel="Users table pagination" />
        </section>
      )}
      <UserDetailsDialog user={selected} branchCodes={data?.branchCodes ?? {}} onClose={() => setSelected(null)} />
    </div>
  );
}
