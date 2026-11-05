import type {
  ComponentProps,
  ReactNode,
} from "react";
import { formControlClassName } from "@/components/ui/form-control";

type FormTextareaProps = ComponentProps<"textarea"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  labelAction?: ReactNode;
};

export default function FormTextarea({
  id,
  label,
  hint,
  error,
  labelAction,
  required,
  disabled,
  className = "",
  "aria-describedby": externalDescription,
  ...props
}: FormTextareaProps) {
  const describedBy = [
    externalDescription,
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label
          htmlFor={id}
          className="block text-base leading-6 font-medium text-ink"
        >
          {label}

          {required && (
            <span
              className="ml-1 text-danger"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>

        {labelAction}
      </div>

      <textarea
        {...props}
        id={id}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={formControlClassName(
          Boolean(error),
          `min-h-32 resize-y ${className}`,
        )}
      />

      {hint && (
        <p
          id={`${id}-hint`}
          className="mt-2 text-sm leading-6 wrap-anywhere text-muted"
        >
          {hint}
        </p>
      )}

      {error && (
        <p
          id={`${id}-error`}
          className="mt-2 text-sm leading-6 wrap-anywhere text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}