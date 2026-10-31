"use client";

import FormField from "@/components/ui/form-field";
import TablePagination from "@/components/ui/table-pagination";
import type { BranchHeadBranch, PaginationMeta } from "@/lib/admin/branch-heads";

type BranchSelectorProps = {
  branches: BranchHeadBranch[];
  currentBranches?: BranchHeadBranch[];
  meta: PaginationMeta;
  loading: boolean;
  error: string;
  search: string;
  selected: Map<number, BranchHeadBranch>;
  page: number;
  pageSize: number;
  onSearchChange: (value: string) => void;
  onToggle: (branch: BranchHeadBranch) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRetry: () => void;
};

function BranchChoice({ branch, checked, onToggle }: { branch: BranchHeadBranch; checked: boolean; onToggle: () => void }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? "border-blue-300 bg-blue-50" : "border-line/60 bg-white hover:bg-slate-50"}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-0.5 size-5 accent-blue-700" />
      <span className="min-w-0">
        <span className="block font-medium wrap-anywhere">{branch.branch_code} — {branch.branch_name}</span>
        <span className="mt-1 block text-sm text-muted wrap-anywhere">{branch.branch} · {branch.acronym}</span>
      </span>
    </label>
  );
}

export default function BranchSelector({
  branches,
  currentBranches = [],
  meta,
  loading,
  error,
  search,
  selected,
  page,
  pageSize,
  onSearchChange,
  onToggle,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: BranchSelectorProps) {
  return (
    <div className="space-y-5">
      {currentBranches.length > 0 && (
        <section aria-labelledby="current-branch-head-branches-title">
          <h3 id="current-branch-head-branches-title" className="text-lg font-semibold">Current branches</h3>
          <p className="mt-1 text-sm text-muted">Keep checked to retain a branch, or uncheck it to remove the routing assignment.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {currentBranches.map((branch) => (
              <BranchChoice key={branch.id} branch={branch} checked={selected.has(branch.id)} onToggle={() => onToggle(branch)} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="available-branch-head-branches-title" className="overflow-hidden rounded-2xl border border-line/60">
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <h3 id="available-branch-head-branches-title" className="text-lg font-semibold">{currentBranches.length ? "Add available branches" : "Assign branches"}</h3>
            <p className="mt-1 text-sm text-muted">{selected.size} branch{selected.size === 1 ? "" : "es"} selected across all pages.</p>
          </div>
          <FormField id="branch-head-branch-search" label="Search branches" type="search" placeholder="Code, name, company, or acronym" autoComplete="off" value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </div>

        <div className="border-t border-line/60 p-4 sm:p-5">
          {loading ? (
            <p className="py-10 text-center text-muted">Loading branches…</p>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="font-medium text-danger">{error}</p>
              <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-xl border border-line bg-white px-4 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand">Try again</button>
            </div>
          ) : branches.length === 0 ? (
            <p className="py-10 text-center text-muted">No available branches found.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {branches.map((branch) => <BranchChoice key={branch.id} branch={branch} checked={selected.has(branch.id)} onToggle={() => onToggle(branch)} />)}
            </div>
          )}
        </div>

        <TablePagination page={page} pageSize={pageSize} totalItems={meta.total} loading={loading} itemLabel="branches" ariaLabel="Available Branch Head branches pagination" onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
      </section>
    </div>
  );
}

