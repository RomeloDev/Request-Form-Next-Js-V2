"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
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
        <label htmlFor={id} className="block text-base leading-6 font-medium text-ink">
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
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5 stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]">
              {visible ? (
                <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11 11 0 0 1 12 5c6 0 9 7 9 7a15 15 0 0 1-2.6 3.8M6.3 6.3A17 17 0 0 0 3 12s3 7 9 7a10 10 0 0 0 5.1-1.4" />
              ) : (
                <><path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Z" /><circle cx="12" cy="12" r="3" /></>
              )}
            </svg>
          </button>
        )}
      </div>
      {hint && <p id={`${id}-hint`} className="mt-2 text-sm leading-6 wrap-anywhere text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-2 text-sm leading-6 wrap-anywhere text-danger">{error}</p>}
    </div>
  );
}
