const faqs = [
  {
    question: "Which request types can I submit?",
    answer:
      "The system supports Stock Requisition, Purchase Order Requisition Slip, Cash Disbursement Requisition Slip, and Check Issuance Requisition Slip requests.",
  },
  {
    question: "How do I choose the correct request form?",
    answer:
      "Choose the form that matches what the business needs: stock items, a purchase order, a cash disbursement, or a check issuance. If the purpose is unclear, confirm with your supervisor or assigned approver before submitting.",
  },
  {
    question: "Can I submit more than one request?",
    answer:
      "Yes. Create a separate form for each request so its details, supporting documents, approval route, and status remain clear.",
  },
  {
    question: "Can I edit a request after submitting it?",
    answer:
      "A Pending request can be edited while no approval action has been recorded. A Disapproved request can also be corrected and resubmitted. The Edit action is shown only while the request is eligible.",
  },
  {
    question: "Can I cancel a submitted request?",
    answer:
      "A requester can cancel a Pending request from My Requests and must provide a reason. The option is no longer available after the request moves beyond the eligible stage.",
  },
  {
    question: "What if I selected the wrong request type?",
    answer:
      "If the request is still eligible, cancel it with a clear reason and submit a new form using the correct type. If the action is unavailable, contact the assigned reviewer or system administrator for guidance.",
  },
  {
    question: "Who reviews my request?",
    answer:
      "The request follows its assigned approval route. The responsible approvers review the details and record their decision at each applicable level.",
  },
  {
    question: "How will I know when a decision is made?",
    answer:
      "Check My Requests for the current status and approval history. The system also provides in-app notifications and queues supported email notifications for workflow updates.",
  },
] as const;

const faqGroups = [
  {
    title: "Submitting requests",
    description: "Choosing and creating the correct request form.",
    items: faqs.slice(0, 4),
    startIndex: 0,
  },
  {
    title: "After submission",
    description: "Editing, canceling, reviewing, and tracking progress.",
    items: faqs.slice(4),
    startIndex: 4,
  },
] as const;

export default function LandingFaq() {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {faqGroups.map((group) => (
        <section key={group.title} aria-labelledby={`faq-${group.startIndex}`}>
          <h3
            id={`faq-${group.startIndex}`}
            className="text-base font-semibold text-landing-foreground"
          >
            {group.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-landing-muted">
            {group.description}
          </p>

          <div className="mt-4 border-t border-landing-border">
            {group.items.map((faq, itemIndex) => {
              const number = group.startIndex + itemIndex + 1;

              return (
                <details
                  key={faq.question}
                  className="group border-b border-landing-border"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 text-left text-sm font-semibold text-landing-foreground outline-none transition-colors hover:text-landing-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-blue [&::-webkit-details-marker]:hidden">
                    <span className="w-7 shrink-0 font-mono text-xs font-semibold text-landing-blue">
                      {String(number).padStart(2, "0")}
                    </span>
                    <span className="flex-1">{faq.question}</span>
                    <span
                      aria-hidden="true"
                      className="relative size-5 shrink-0 text-landing-blue"
                    >
                      <span className="absolute top-1/2 left-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
                      <span className="absolute top-1/2 left-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-transform group-open:scale-y-0 motion-reduce:transition-none" />
                    </span>
                  </summary>
                  <p className="pt-1 pr-7 pb-4 pl-10 text-sm leading-6 text-landing-muted">
                    {faq.answer}
                  </p>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
