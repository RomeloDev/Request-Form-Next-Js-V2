import Link from "next/link";

type RequestTypeNavProps = {
  currentHref: string;
};

/**
 * Request creation forms that are available so far. Add new forms here as
 * they are delivered; keep the order stable.
 */
const REQUEST_TYPES = [
  { label: "Stock Requisition", href: "/create-request" },
  {
    label: "Purchase Order Requisition Slip",
    href: "/create-request/purchase-order-requisition-slip",
  },
] as const;

/**
 * Minimal accessible switcher rendered by the server pages above each form,
 * so the form components themselves stay untouched.
 */
export default function RequestTypeNav({ currentHref }: RequestTypeNavProps) {
  return (
    <nav
      aria-label="Request type"
      className="rounded-2xl border border-line/70 bg-white p-4 shadow-sm sm:p-5"
    >
      <p className="text-sm font-medium text-muted">Type of request</p>

      <ul className="mt-3 flex flex-wrap gap-2">
        {REQUEST_TYPES.map((type) => {
          const active = type.href === currentHref;

          return (
            <li key={type.href}>
              <Link
                href={type.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-xl px-4 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  active
                    ? "bg-brand text-white"
                    : "border border-line bg-white text-ink hover:border-brand hover:text-brand"
                }`}
              >
                {type.label}
                {active && <span className="sr-only">(current form)</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
