import type { ReactNode } from "react";
import TextLink from "@/components/ui/text-link";

type AuthPageProps = {
  id: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  compact?: boolean;
  backLink?: { href: string; label: string };
  children: ReactNode;
};

export default function AuthPage({
  id, eyebrow, title, accent, description, compact = false, backLink, children,
}: AuthPageProps) {
  return (
    <section
      aria-labelledby={id}
      className={`mx-auto w-full ${compact ? "my-auto max-w-xl py-4 sm:py-8" : "max-w-3xl"}`}
    >
      {backLink && (
        <div className="mb-4">
          <TextLink href={backLink.href}>
            <span aria-hidden="true" className="mr-2">←</span>
            {backLink.label}
          </TextLink>
        </div>
      )}
      <header className="relative isolate overflow-hidden rounded-2xl border border-blue-100 bg-auth-header p-5 sm:p-7 after:pointer-events-none after:absolute after:-top-24 after:-right-24 after:-z-10 after:size-56 after:rounded-full after:border after:border-brand/5 after:shadow-[0_0_0_28px_#2458d304,0_0_0_56px_#2458d303]">
        <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-sm leading-6 font-medium text-brand">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4 shrink-0 stroke-current stroke-[1.3] [stroke-linejoin:round]">
            <path d="m10 2 2.1 5.9L18 10l-5.9 2.1L10 18l-2.1-5.9L2 10l5.9-2.1L10 2Z" />
          </svg>
          {eyebrow}
        </span>
        <h1 id={id} className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-ink sm:text-4xl">
          {title} <span className="text-brand">{accent}</span>
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted">{description}</p>
      </header>
      {children}
    </section>
  );
}
