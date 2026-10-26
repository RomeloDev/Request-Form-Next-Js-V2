import Icon, { type IconName } from "@/components/ui/icon";

export type MetricTone = "blue" | "emerald" | "amber" | "cyan" | "rose";
const tones: Record<MetricTone, { icon: string; dot: string }> = {
  blue: { icon: "border-blue-100 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  emerald: { icon: "border-emerald-100 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  amber: { icon: "border-amber-100 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  cyan: { icon: "border-cyan-100 bg-cyan-50 text-cyan-800", dot: "bg-cyan-500" },
  rose: { icon: "border-rose-100 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

export default function MetricCard({ label, value, icon, tone = "blue", loading, note, headingLevel = 3 }: {
  label: string; value: number | null | undefined; icon: IconName; tone?: MetricTone;
  loading?: boolean; note?: string; headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const palette = tones[tone];
  return (
    <article className="@container relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_10px_#0f172a04] transition-shadow hover:shadow-[0_6px_20px_#0f172a08] motion-reduce:transition-none sm:p-6">
      <div className="flex flex-col-reverse items-start gap-3 @min-[13rem]:flex-row @min-[13rem]:justify-between">
        <Heading className="min-w-0 pt-1 text-base leading-6 font-medium text-muted">{label}</Heading>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl border ${palette.icon}`}><Icon name={icon} className="size-5" /></span>
      </div>
      <p className="mt-4 text-4xl leading-tight font-semibold tracking-tight text-ink tabular-nums" aria-label={!loading && value == null ? `${label}: unavailable` : undefined}>
        {loading ? <span aria-label="Loading" className="inline-block h-10 w-16 rounded-lg bg-slate-100 motion-safe:animate-pulse" /> : value?.toLocaleString() ?? "—"}
      </p>
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm leading-6 text-muted">
        <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${value == null ? "bg-slate-300" : palette.dot}`} />
        <span>{loading ? "Loading summary…" : value == null ? "Unavailable" : note ?? "Request summary"}</span>
      </div>
    </article>
  );
}
