"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { formControlClassName } from "@/components/ui/form-control";

type FormFieldProps = ComponentProps<"input"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  labelAction?: ReactNode;
};

export default function FormField({
  id,
  label,
  hint,
  error,
  labelAction,
  type = "text",
  required,
  disabled,
  className = "",
  "aria-describedby": externalDescription,
  ...props
}: FormFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const describedBy = [
    externalDescription,
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(" ");

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="block text-sm leading-6 font-medium text-ink">
          {label}{required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={isPassword && visible ? "text" : type}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={formControlClassName(Boolean(error), `${isPassword ? "pr-14" : ""} ${className}`)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((previous) => !previous)}
            disabled={disabled}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-controls={id}
            className="absolute inset-y-1 right-1 grid w-11 place-items-center rounded-lg text-muted hover:bg-blue-50 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-5" strokeWidth={1.75} />
            ) : (
              <Eye aria-hidden="true" className="size-5" strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>
      {hint && <p id={`${id}-hint`} className="mt-2 text-sm leading-6 wrap-anywhere text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-2 text-sm leading-6 wrap-anywhere text-danger">{error}</p>}
    </div>
  );
}
