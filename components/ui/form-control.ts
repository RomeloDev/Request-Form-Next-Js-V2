/** Shared Tailwind styling for native inputs and selects. */
export function formControlClassName(invalid: boolean, className = "") {
  return `block min-h-12 w-full min-w-0 rounded-xl border bg-slate-50/50 px-3.5 py-3 text-base leading-6 text-ink outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-500 focus:bg-white focus:ring-3 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 motion-reduce:transition-none ${
    invalid
      ? "border-danger focus:border-danger focus:ring-red-100 enabled:hover:border-danger"
      : "border-line focus:border-brand focus:ring-blue-100 enabled:hover:border-slate-400"
  } ${className}`;
}
