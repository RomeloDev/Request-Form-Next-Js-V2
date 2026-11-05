"use client";

import { useId } from "react";

export type FormRadioOption<Value extends string> = {
  value: Value;
  label: string;
  description?: string;
};

type FormRadioGroupProps<Value extends string> = {
  name: string;
  label: string;
  options: readonly FormRadioOption<Value>[];
  value: Value | "";
  onValueChange: (value: Value) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function FormRadioGroup<Value extends string>({
  name,
  label,
  options,
  value,
  onValueChange,
  hint,
  error,
  required,
  disabled,
}: FormRadioGroupProps<Value>) {
  const generatedId = useId();
  const describedBy = [
    hint ? `${generatedId}-hint` : null,
    error ? `${generatedId}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
      className="m-0 min-w-0 border-0 p-0"
    >
      <legend className="mb-2 text-base leading-6 font-medium text-ink">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </legend>

      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option, index) => {
          const optionId = `${generatedId}-${index}`;
          const selected = value === option.value;

          return (
            <div key={option.value} className="min-w-0">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onValueChange(option.value)}
                required={required}
                className="peer sr-only"
              />

              <label
                htmlFor={optionId}
                className={`flex min-h-28 h-full cursor-pointer flex-col rounded-xl border p-4 transition-[border-color,box-shadow,background-color] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand peer-disabled:cursor-not-allowed peer-disabled:bg-slate-100 peer-disabled:text-slate-500 motion-reduce:transition-none ${
                  selected
                    ? "border-brand bg-blue-50 ring-2 ring-blue-100"
                    : "border-line bg-slate-50/50 hover:border-slate-400 hover:bg-white"
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-medium text-ink">
                    {option.label}
                  </span>

                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                      selected
                        ? "border-brand bg-brand"
                        : "border-slate-400 bg-white"
                    }`}
                  >
                    {selected && (
                      <span className="size-2 rounded-full bg-white" />
                    )}
                  </span>
                </span>

                {option.description && (
                  <span className="mt-2 text-sm leading-5 text-muted">
                    {option.description}
                  </span>
                )}

                {selected && (
                  <span className="mt-auto pt-3 text-xs font-semibold uppercase tracking-wide text-brand">
                    Selected
                  </span>
                )}
              </label>
            </div>
          );
        })}
      </div>

      {hint && (
        <p
          id={`${generatedId}-hint`}
          className="mt-2 text-sm leading-6 text-muted"
        >
          {hint}
        </p>
      )}

      {error && (
        <p
          id={`${generatedId}-error`}
          className="mt-2 text-sm leading-6 text-danger"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
