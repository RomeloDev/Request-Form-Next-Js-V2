import type { ComponentProps } from "react";

type SubmitButtonProps = ComponentProps<"button"> & {
  pending?: boolean;
  pendingLabel?: string;
};

export default function SubmitButton({
  pending = false, pendingLabel = "Please wait…", disabled, children, className = "", ...props
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      {...props}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`flex min-h-13 w-full items-center justify-center gap-3 rounded-xl bg-brand px-6 py-3 text-base leading-7 font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 motion-reduce:transition-none ${className}`}
    >
      {pending && <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
