import type { ReactNode } from "react";

export default function PageHeader({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div className="min-w-0">
        <p className="text-sm font-medium tracking-wide text-muted">{eyebrow}</p>
        <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{description}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}
