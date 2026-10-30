"use client";

import FormField from "@/components/ui/form-field";
import TablePagination from "@/components/ui/table-pagination";
import type {
  AvpStaffCandidate,
  PaginationMeta,
} from "@/lib/admin/avp-staffs";
import { avpStaffPersonName } from "@/lib/admin/avp-staffs";

type CandidateSelectorProps = {
  id: string;
  label: string;
  searchPlaceholder: string;
  candidates: AvpStaffCandidate[];
  meta: PaginationMeta;
  loading: boolean;
  error: string;
  search: string;
  selected: AvpStaffCandidate | null;
  page: number;
  pageSize: number;
  onSearchChange: (value: string) => void;
  onSelect: (candidate: AvpStaffCandidate) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRetry: () => void;
};

export default function CandidateSelector({
  id,
  label,
  searchPlaceholder,
  candidates,
  meta,
  loading,
  error,
  search,
  selected,
  page,
  pageSize,
  onSearchChange,
  onSelect,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: CandidateSelectorProps) {
  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-2xl border border-line/60">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id={`${id}-title`} className="text-lg font-semibold">{label}</h3>
          {selected && (
            <p className="text-sm font-medium text-emerald-700">
              Selected: {avpStaffPersonName(selected)}
            </p>
          )}
        </div>
        <FormField
          id={`${id}-search`}
          label={`Search ${label.toLowerCase()}`}
          type="search"
          placeholder={searchPlaceholder}
          autoComplete="off"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="overflow-x-auto border-t border-line/60">
        <table className="w-full min-w-[620px] text-left text-base">
          <thead className="bg-slate-50 text-sm text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Select</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Position</th>
              <th className="px-4 py-3 font-semibold">Branch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted">Loading candidates…</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center">
                <p className="font-medium text-danger">{error}</p>
                <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-xl border border-line bg-white px-4 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand">Try again</button>
              </td></tr>
            ) : candidates.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted">No eligible candidates found.</td></tr>
            ) : candidates.map((candidate) => {
              const checked = selected?.id === candidate.id;
              return (
                <tr key={candidate.id} className={checked ? "bg-blue-50/70" : "hover:bg-blue-50/30"}>
                  <td className="px-4 py-3">
                    <input
                      type="radio"
                      name={`${id}-candidate`}
                      aria-label={`Select ${avpStaffPersonName(candidate)}`}
                      checked={checked}
                      onChange={() => onSelect(candidate)}
                      className="size-5 accent-blue-700"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium wrap-anywhere">{avpStaffPersonName(candidate)}</td>
                  <td className="px-4 py-3 wrap-anywhere">{candidate.position || "Not provided"}</td>
                  <td className="px-4 py-3 wrap-anywhere">{candidate.branch ?? candidate.branch_code ?? "Not assigned"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={meta.total}
        loading={loading}
        itemLabel="candidates"
        ariaLabel={`${label} pagination`}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  );
}
