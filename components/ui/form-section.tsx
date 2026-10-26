import type { ReactNode } from "react";

type FormSectionProps = {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
  disabled?: boolean;
};

export default function FormSection({ number, title, description, children, disabled }: FormSectionProps) {
  return (
    <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0 not-first:mt-9 not-first:border-t not-first:border-line/70 not-first:pt-8">
      <legend className="float-left mb-2 flex w-full items-center gap-3 text-lg leading-7 font-semibold tracking-tight text-ink sm:text-xl">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-sm font-medium tracking-normal text-brand">
          {number}
        </span>
        {title}
      </legend>
      <p className="clear-both mb-6 text-sm leading-6 text-muted sm:ml-11">
        {description}
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
        {children}
      </div>
    </fieldset>
  );
}
