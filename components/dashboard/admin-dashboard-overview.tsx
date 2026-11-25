import Link from "next/link";
import PageHeader from "@/components/layouts/page-header";
import DashboardRefreshButton from "@/components/dashboard/dashboard-refresh-button";
import Icon, { type IconName } from "@/components/ui/icon";
import MetricCard, { type MetricTone } from "@/components/ui/metric-card";
import type { DashboardUser } from "@/components/dashboard/dashboard-overview";
import type {
  DashboardData,
  DashboardRequestStatus,
} from "@/lib/dashboard";

type AdminDashboardOverviewProps = {
  user: DashboardUser;
  initialData: DashboardData | null;
};

type MetricDefinition = {
  label: string;
  value: number | null;
  icon: IconName;
  tone: MetricTone;
  note: string;
};

const statusStyles: Record<DashboardRequestStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Ongoing: "bg-blue-100 text-blue-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Disapproved: "bg-red-100 text-red-800",
  Canceled: "bg-slate-200 text-slate-700",
};

const quickLinks: Array<{
  label: string;
  href: string;
  icon: IconName;
  description: string;
}> = [
  {
    label: "Users",
    href: "/admin/users",
    icon: "users",
    description: "Manage accounts and verification.",
  },
  {
    label: "Positions",
    href: "/admin/positions",
    icon: "briefcase",
    description: "Maintain position records.",
  },
  {
    label: "Branches",
    href: "/admin/branches",
    icon: "building",
    description: "Review branch records.",
  },
  {
    label: "Approvers",
    href: "/admin/approvers",
    icon: "userCheck",
    description: "Review approval access.",
  },
  {
    label: "AVP Staffs",
    href: "/admin/avp-staffs",
    icon: "team",
    description: "Manage AVP Staff assignments.",
  },
  {
    label: "Branch Heads",
    href: "/admin/branch-heads",
    icon: "contact",
    description: "Manage Branch Head assignments.",
  },
  {
    label: "Feedbacks",
    href: "/admin/feedbacks",
    icon: "feedback",
    description: "Read submitted feedback.",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: "chart",
    description: "Open request reports.",
  },
];

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export default function AdminDashboardOverview({
  user,
  initialData,
}: AdminDashboardOverviewProps) {
  const administration = initialData?.administration ?? null;
  const name = user.firstName || user.name || "there";

  const userCards: MetricDefinition[] = [
    {
      label: "Total users",
      value: administration?.summary.total_users ?? null,
      icon: "users",
      tone: "blue",
      note: "All registered accounts",
    },
    {
      label: "Verified users",
      value: administration?.summary.verified_users ?? null,
      icon: "userCheck",
      tone: "emerald",
      note: "Accounts with verified access",
    },
    {
      label: "Unverified users",
      value: administration?.summary.unverified_users ?? null,
      icon: "profile",
      tone: "amber",
      note: "Accounts awaiting verification",
    },
  ];

  const requestCards: MetricDefinition[] = [
    {
      label: "Total requests",
      value: administration?.request_summary.total ?? null,
      icon: "file",
      tone: "blue",
      note: "All requests in the system",
    },
    {
      label: "Pending",
      value: administration?.request_summary.pending ?? null,
      icon: "clock",
      tone: "amber",
      note: "Awaiting review",
    },
    {
      label: "Ongoing",
      value: administration?.request_summary.ongoing ?? null,
      icon: "progress",
      tone: "cyan",
      note: "In progress",
    },
    {
      label: "Completed",
      value: administration?.request_summary.completed ?? null,
      icon: "checkCircle",
      tone: "emerald",
      note: "Completed successfully",
    },
    {
      label: "Disapproved",
      value: administration?.request_summary.disapproved ?? null,
      icon: "xCircle",
      tone: "rose",
      note: "Not approved",
    },
    {
      label: "Canceled",
      value: administration?.request_summary.canceled ?? null,
      icon: "close",
      tone: "cyan",
      note: "Canceled or withdrawn",
    },
  ];

  const organizationCards: MetricDefinition[] = [
    {
      label: "Branches",
      value: administration?.summary.branches ?? null,
      icon: "building",
      tone: "blue",
      note: "Branch records",
    },
    {
      label: "Positions",
      value: administration?.summary.positions ?? null,
      icon: "briefcase",
      tone: "cyan",
      note: "Configured positions",
    },
    {
      label: "Approvers",
      value: administration?.summary.approvers ?? null,
      icon: "userCheck",
      tone: "emerald",
      note: "Accounts with approval access",
    },
    {
      label: "AVP Staff assignments",
      value: administration?.summary.avp_staff_assignments ?? null,
      icon: "team",
      tone: "blue",
      note: "Current AVP Staff assignments",
    },
    {
      label: "Branch Head assignments",
      value: administration?.summary.branch_head_assignments ?? null,
      icon: "contact",
      tone: "cyan",
      note: "Current Branch Head assignments",
    },
    {
      label: "Feedback submissions",
      value: administration?.summary.feedbacks ?? null,
      icon: "feedback",
      tone: "amber",
      note: "Feedback received from users",
    },
  ];

  const recentRequests = administration?.recent_requests ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADMINISTRATION OVERVIEW"
        title="Administrative dashboard"
        description="Monitor user access, organization structure, and request activity across the workspace."
      >
        <DashboardRefreshButton label="Refresh overview" showLabel />
      </PageHeader>

      <section
        aria-labelledby="admin-welcome-title"
        className="relative isolate overflow-hidden rounded-2xl border border-blue-200 bg-linear-to-br from-blue-100 via-blue-100/80 to-indigo-100 p-5 shadow-[0_2px_12px_#0f172a04] sm:p-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-12 -z-10 size-80 rounded-full border-[40px] border-blue-200/40"
        />
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-sm font-medium text-blue-800">
              <Icon name="shieldCheck" className="size-4" />
              Administrator
            </p>
            <h2
              id="admin-welcome-title"
              className="mt-5 text-2xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-3xl"
            >
              Welcome back, <span className="text-blue-800">{name}.</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              You have a complete view of accounts, organization records, and
              request activity across the system.
            </p>
          </div>
          <div
            aria-hidden="true"
            className="hidden size-28 shrink-0 place-items-center rounded-3xl border border-white bg-white/70 text-blue-700 shadow-[0_8px_32px_#1e40af0a] xl:grid"
          >
            <Icon name="shieldCheck" className="size-12" />
          </div>
        </div>
      </section>

      {administration === null && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          We couldn&apos;t load the administrative dashboard data. Use the
          refresh button to try again.
        </p>
      )}

      <section aria-labelledby="admin-user-summary">
        <h2 id="admin-user-summary" className="mb-4 text-lg font-semibold">
          User summary
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
          {userCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
              note={card.note}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-request-summary">
        <h2 id="admin-request-summary" className="mb-4 text-lg font-semibold">
          Request lifecycle summary
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
          {requestCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
              note={card.note}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-organization-summary">
        <h2
          id="admin-organization-summary"
          className="mb-4 text-lg font-semibold"
        >
          Organization overview
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
          {organizationCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
              note={card.note}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-quick-links">
        <h2 id="admin-quick-links" className="mb-4 text-lg font-semibold">
          Administrative quick links
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex min-h-24 min-w-0 items-start gap-3 rounded-2xl border border-line/60 bg-white p-4 shadow-sm transition-colors hover:border-brand/40 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                <Icon name={link.icon} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">
                    {link.label}
                  </span>
                  <Icon
                    name="chevronRight"
                    className="size-4 text-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
                <span className="mt-1 block text-sm leading-5 text-muted">
                  {link.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="admin-recent-title"
        className="overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 p-4 sm:px-5">
          <div>
            <h2 id="admin-recent-title" className="text-lg font-semibold">
              Recent system requests
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              The five latest requests across the organization.
            </p>
          </div>
          <Link
            href="/reports"
            className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            View reports
          </Link>
        </div>
        <div
          role="region"
          aria-label="Recent system requests table, scroll horizontally for all columns"
          tabIndex={0}
          className="overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        >
          <table className="w-full min-w-[650px] text-left text-sm">
            <caption className="sr-only">
              Recent system requests with their request ID, type, date, branch
              and status
            </caption>
            <thead className="bg-slate-50 text-sm text-muted">
              <tr>
                {["Request ID", "Request type", "Date", "Branch", "Status"].map(
                  (label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {administration === null ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm leading-6 text-muted"
                  >
                    Recent system requests are currently unavailable.
                  </td>
                </tr>
              ) : recentRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm leading-6 text-muted"
                  >
                    No system requests yet.
                  </td>
                </tr>
              ) : (
                recentRequests.slice(0, 5).map((request) => (
                  <tr key={request.id} className="border-t border-line/50">
                    <th
                      scope="row"
                      className="px-4 py-3 font-medium text-brand"
                    >
                      {request.request_code}
                    </th>
                    <td className="px-4 py-3">{request.form_type}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-40">
                        <p className="font-medium">
                          {request.branch.branch_name}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {request.branch.branch_code}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[request.status]}`}
                      >
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
