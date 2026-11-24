import type { ReactNode } from "react";

type LandingSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  tone?: "default" | "surface";
  children?: ReactNode;
};

export default function LandingSection({
  id,
  eyebrow,
  title,
  description,
  tone = "default",
  children,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={
        tone === "surface"
          ? "scroll-mt-24 border-y border-landing-border bg-landing-surface"
          : "scroll-mt-24"
      }
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid gap-4 border-l-4 border-landing-blue pl-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-end lg:gap-12 lg:pl-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-landing-blue uppercase">
              {eyebrow}
            </p>
            <h2
              id={`${id}-title`}
              className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-landing-foreground sm:text-3xl"
            >
              {title}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-landing-muted sm:text-base sm:leading-7">
            {description}
          </p>
        </div>
        {children ? <div className="mt-7 sm:mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
