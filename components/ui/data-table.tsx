import type { ReactNode } from "react";

export type TableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
};

type DataTableProps<T> = {
  caption: string;
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  loadingLabel?: string;
  empty: ReactNode;
  sort?: { key: string; direction: "asc" | "desc" };
  onSort?: (key: string) => void;
};

export default function DataTable<T>({ caption, columns, rows, rowKey, loading, loadingLabel = "Loading records…", empty, sort, onSort }: DataTableProps<T>) {
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand">
      <table aria-busy={loading} className="w-full min-w-[900px] text-left text-base leading-6">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-y border-line/60 bg-slate-50 text-sm text-muted">
          <tr>{columns.map((column) => (
            <th key={column.key} scope="col" aria-sort={column.sortable ? sort?.key === column.key ? sort.direction === "asc" ? "ascending" : "descending" : "none" : undefined} className="px-5 py-2 font-semibold">
              {column.sortable && onSort ? (
                <button type="button" onClick={() => onSort(column.key)} className="flex min-h-11 items-center gap-2 rounded text-left hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  {column.label}<span aria-hidden="true" className="text-base">{sort?.key === column.key ? sort.direction === "asc" ? "↑" : "↓" : "↕"}</span>
                </button>
              ) : column.label}
            </th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-line/50">
          {loading ? <tr><td colSpan={columns.length} className="px-6 py-16 text-center text-muted"><span role="status">{loadingLabel}</span></td></tr>
            : !rows.length ? <tr><td colSpan={columns.length} className="px-6 py-16 text-center">{empty}</td></tr>
            : rows.map((row) => <tr key={rowKey(row)} className="transition-colors hover:bg-blue-50/30 motion-reduce:transition-none">{columns.map((column) => <td key={column.key} className="px-5 py-4 align-middle">{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
