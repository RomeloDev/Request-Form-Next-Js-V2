import type { ComponentProps } from "react";
import { formControlClassName } from "@/components/ui/form-control";

type FormSelectProps = ComponentProps<"select"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export default function FormSelect({
  id, label, hint, error, required, className, children,
  "aria-describedby": externalDescription, ...props
}: FormSelectProps) {
  const description = [externalDescription, hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean).join(" ");

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-base leading-6 font-medium text-ink">
        {label}{required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
      </label>
      <select
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={description || undefined}
        className={formControlClassName(Boolean(error), className)}
      >
        {children}
      </select>
      {hint && <p id={`${id}-hint`} className="mt-2 text-sm leading-6 text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-2 text-sm leading-6 text-danger">{error}</p>}
    </div>
  );
}
