import type { ComponentProps } from "react";
import Icon, { type IconName } from "@/components/ui/icon";

const colors = {
  blue: "border-blue-100 bg-blue-50 text-blue-700 enabled:hover:border-blue-200 enabled:hover:bg-blue-100 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400",
  neutral: "border-slate-200 bg-white text-slate-600 enabled:hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400",
  danger: "border-rose-100 bg-rose-50 text-rose-700 enabled:hover:bg-rose-100 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700 enabled:hover:bg-emerald-100 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400",
};

export default function RowAction({ label, icon, tone = "neutral", disabled, ...props }: Omit<ComponentProps<"button">, "children" | "className"> & { label: string; icon: IconName; tone?: keyof typeof colors }) {
  const title = disabled ? `${label} — not available yet` : label;
  return <span className="inline-flex" title={title}><button {...props} type="button" disabled={disabled} aria-label={label} title={title} className={`grid size-11 shrink-0 place-items-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed motion-reduce:transition-none ${colors[tone]}`}><Icon name={icon} className="size-[18px]" /></button></span>;
}
