"use client";

import { useId } from "react";
import Icon, { type IconName } from "@/components/ui/icon";

type TablePaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
  itemLabel?: string;
  ariaLabel?: string;
  pageSizeOptions?: readonly number[];
};

/** Controlled footer for either client-side or server-side paginated tables. */
export default function TablePagination({ page, pageSize, totalItems, onPageChange, onPageSizeChange, loading = false, itemLabel = "records", ariaLabel = "Table pagination", pageSizeOptions = [10, 20, 50] }: TablePaginationProps) {
  const selectId = useId();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const controls: { label: string; icon: IconName; target: number; disabled: boolean }[] = [
    { label: "First page", icon: "firstPage", target: 1, disabled: currentPage === 1 },
    { label: "Previous page", icon: "chevronLeft", target: currentPage - 1, disabled: currentPage === 1 },
    { label: "Next page", icon: "chevronRight", target: currentPage + 1, disabled: currentPage === totalPages },
    { label: "Last page", icon: "lastPage", target: totalPages, disabled: currentPage === totalPages },
  ];

  return <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-line/60 bg-slate-50/40 px-5 py-4 sm:px-6">
    <p role="status" aria-atomic="true" className="text-sm leading-6 text-muted">{loading ? "Loading…" : `Showing ${firstItem.toLocaleString()}–${lastItem.toLocaleString()} of ${totalItems.toLocaleString()} ${itemLabel}`}</p>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={selectId} className="text-sm leading-6 font-medium text-muted">Rows per page</label>
        <select id={selectId} value={pageSize} disabled={loading} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-medium text-ink shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:text-slate-500">
          {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </div>
      <nav aria-label={ariaLabel} className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="text-sm leading-6 whitespace-nowrap text-muted">Page <span className="font-semibold text-ink tabular-nums">{currentPage.toLocaleString()}</span> of <span className="tabular-nums">{totalPages.toLocaleString()}</span></span>
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {controls.map(({ label, icon, target, disabled }) => <button key={label} type="button" aria-label={label} title={label} disabled={loading || disabled} onClick={() => onPageChange(target)} className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-600 transition-colors enabled:hover:bg-blue-50 enabled:hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-300 motion-reduce:transition-none"><Icon name={icon} /></button>)}
        </div>
      </nav>
    </div>
  </div>;
}
