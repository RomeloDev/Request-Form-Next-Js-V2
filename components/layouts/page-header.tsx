import type { ReactNode } from "react";

export default function PageHeader({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-start">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">{eyebrow}</p>
        <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {children && <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">{children}</div>}
    </header>
  );
}
