import Icon from "@/components/ui/icon";

export default function RefreshButton({ label, loading, showLabel = false, onClick }: { label: string; loading?: boolean; showLabel?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={loading} aria-label={label} aria-busy={loading} title={loading ? "Refreshing…" : label} className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-xl border border-emerald-700 bg-emerald-700 text-base font-semibold text-white shadow-sm transition-colors enabled:hover:border-emerald-800 enabled:hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:border-emerald-800 disabled:bg-emerald-800 motion-reduce:transition-none ${showLabel ? "px-4 py-3" : "size-12"}`}>
      <Icon name="refresh" className={`size-5 ${loading ? "motion-safe:animate-spin" : ""}`} />
      {showLabel && <span>{loading ? "Refreshing…" : label}</span>}
    </button>
  );
}
