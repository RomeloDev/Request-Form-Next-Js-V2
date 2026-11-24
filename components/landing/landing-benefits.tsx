import Icon, { type IconName } from "@/components/ui/icon";

const benefits: {
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    title: "Faster, more consistent processing",
    description:
      "Digital request forms and a shared review path reduce paper handling and keep similar requests moving the same way.",
    icon: "clock",
  },
  {
    title: "Submit from supported devices",
    description:
      "Start a request from a supported desktop or mobile browser at a location that works for your team.",
    icon: "location",
  },
  {
    title: "Centralized status tracking",
    description:
      "See whether a request is Pending, Ongoing, Completed, Disapproved, or Canceled without chasing separate updates.",
    icon: "progress",
  },
  {
    title: "Secure, role-controlled access",
    description:
      "Sign-in and role-based permissions determine who can view, review, and act on each request.",
    icon: "shieldCheck",
  },
  {
    title: "In-app and queued email notifications",
    description:
      "Approval activity is surfaced in the app, and supported email notifications are queued for delivery. Timing depends on your organization’s mail service.",
    icon: "bell",
  },
  {
    title: "A shared request record",
    description:
      "Requesters and approvers work from the same history, keeping decisions and context together.",
    icon: "team",
  },
];

export default function LandingBenefits() {
  return (
    <ul className="grid border-y border-landing-border sm:grid-cols-2 lg:grid-cols-3">
      {benefits.map((benefit) => (
        <li
          key={benefit.title}
          className="flex gap-4 border-b border-landing-border px-1 py-5 last:border-b-0 sm:px-5 sm:[&:nth-child(odd)] sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:not(:nth-child(3n))]:border-r lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(-n+3)]:border-b lg:[&:nth-last-child(-n+3)]:border-b-0"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-landing-blue-soft text-landing-blue">
            <Icon name={benefit.icon} className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-landing-foreground">
              {benefit.title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-landing-muted">
              {benefit.description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
