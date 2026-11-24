import Icon, { type IconName } from "@/components/ui/icon";

const lifecycle: {
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    title: "Submit",
    description:
      "Choose the request type, complete the required details, and send it through the system.",
    icon: "filePlus",
  },
  {
    title: "Review",
    description:
      "The request reaches the assigned reviewers for your branch and role so they can check the details.",
    icon: "eye",
  },
  {
    title: "Decision",
    description:
      "A reviewer records an approval or disapproval, and the decision stays with the request record.",
    icon: "checkCircle",
  },
  {
    title: "Completion",
    description:
      "Follow the request through Ongoing to Completed, or see Disapproved or Canceled, from one shared record.",
    icon: "clipboard",
  },
];

export default function LandingLifecycle() {
  return (
    <ol className="grid overflow-hidden rounded-lg border border-landing-border bg-landing-surface sm:grid-cols-2 lg:grid-cols-4">
      {lifecycle.map((step, index) => (
        <li
          key={step.title}
          className="relative flex flex-col border-b border-landing-border p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-[#102b5c] text-white">
              <Icon name={step.icon} className="size-4" />
            </span>
            <span className="text-xs font-semibold tracking-[0.16em] text-landing-blue uppercase">
              Step {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-landing-foreground">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-landing-muted">
            {step.description}
          </p>
        </li>
      ))}
    </ol>
  );
}
