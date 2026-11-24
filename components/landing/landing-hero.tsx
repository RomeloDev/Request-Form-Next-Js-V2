import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import LandingFeedbackForm from "@/components/landing/landing-feedback-form";
import Icon, { type IconName } from "@/components/ui/icon";

const supportedRequests: {
  title: string;
  icon: IconName;
}[] = [
  {
    title: "Stock Requisition",
    icon: "filePlus",
  },
  {
    title: "Purchase Order Requisition Slip",
    icon: "clipboard",
  },
  {
    title: "Cash Disbursement Requisition Slip",
    icon: "dollar",
  },
  {
    title: "Check Issuance Requisition Slip",
    icon: "banknote",
  },
];

export default function LandingHero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[image:var(--landing-hero-wash)]"
      >
        <div className="absolute -top-40 -right-32 size-[32rem] rounded-full bg-landing-blue/10 blur-3xl" />
        <div className="absolute top-32 -left-40 size-[28rem] rounded-full bg-landing-navy/5 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(32rem,1.05fr)] lg:items-start lg:gap-12 lg:px-8 lg:pt-16 lg:pb-24">
        <div className="lg:pt-6">
          <div className="border-l-4 border-[#2458d3] pl-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-landing-blue uppercase">
              SMCT Request Management Portal
            </p>
            <p className="mt-1 text-sm font-medium text-landing-muted">
              Official online request routing and approval system
            </p>
          </div>

          <h1
            id="hero-title"
            className="mt-7 max-w-2xl text-4xl leading-[1.08] font-semibold tracking-[-0.035em] text-landing-foreground sm:text-5xl lg:text-[3.5rem]"
          >
            Every request.
            <span className="block text-landing-blue">A step forward.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-landing-muted">
            SMCT Request Form brings submission, review, approval, and status
            tracking into one connected workspace, so every request has a
            clear path and a shared record.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/registration"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#102b5c] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#173d7a] focus:outline-2 focus:outline-offset-2 focus:outline-landing-blue"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-landing-border bg-landing-surface px-5 py-2.5 text-sm font-semibold text-landing-foreground transition-colors hover:border-landing-blue/40 hover:bg-landing-blue-soft focus:outline-2 focus:outline-offset-2 focus:outline-landing-blue"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-8 border-t border-landing-border pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-xs font-semibold tracking-[0.16em] text-landing-foreground uppercase">
                Available request forms
              </p>
              <p className="text-xs leading-5 text-landing-muted">
                Sign in to submit
              </p>
            </div>

            <ul className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2">
              {supportedRequests.map((request) => (
                <li
                  key={request.title}
                  className="flex min-h-12 items-center gap-3 border-b border-landing-border py-2.5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-landing-blue-soft text-landing-blue">
                    <Icon name={request.icon} className="size-4" />
                  </span>
                  <p className="text-sm leading-5 font-medium text-landing-foreground">
                    {request.title}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section
          id="feedback"
          aria-labelledby="feedback-title"
          className="scroll-mt-24 rounded-xl border border-landing-border bg-landing-surface p-5 shadow-[0_18px_45px_-28px_rgba(19,43,87,0.42)] sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-md bg-landing-blue-soft text-landing-blue"
            >
              <MessageSquareText
                aria-hidden="true"
                className="size-5"
                strokeWidth={1.75}
              />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-landing-muted uppercase">
                Feedback
              </p>
              <h2
                id="feedback-title"
                 className="mt-1 text-lg font-semibold tracking-tight text-landing-foreground"
              >
                Tell us how we are doing
              </h2>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-landing-muted">
            A quick note helps us improve the Request Form for everyone.
            Share a suggestion, complaint, compliment, or other note with the
            team.
          </p>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-ink">
            <LandingFeedbackForm />
          </div>
        </section>
      </div>
    </section>
  );
}
