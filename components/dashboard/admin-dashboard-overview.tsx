import Link from "next/link";
import AdminOrganizationChart from "@/components/dashboard/admin-organization-chart";
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

type LifecycleMetric = {
  label: string;
  value: number | null;
  note: string;
  style: string;
  dot: string;
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

  const primaryCards: MetricDefinition[] = [
    {
      label: "Total users",
      value: administration?.summary.total_users ?? null,
      icon: "users",
      tone: "blue",
      note: "Registered non-admin accounts",
    },
    {
      label: "Total requests",
      value: administration?.request_summary.total ?? null,
      icon: "file",
      tone: "cyan",
      note: "Requests across the system",
    },
    {
      label: "Pending requests",
      value: administration?.request_summary.pending ?? null,
      icon: "clock",
      tone: "amber",
      note: "Awaiting review",
    },
    {
      label: "Completed requests",
      value: administration?.request_summary.completed ?? null,
      icon: "checkCircle",
      tone: "emerald",
      note: "Completed successfully",
    },
  ];

  const lifecycleMetrics: LifecycleMetric[] = [
    {
      label: "Pending",
      value: administration?.request_summary.pending ?? null,
      note: "Awaiting review",
      style: "border-amber-200 bg-amber-50/70",
      dot: "bg-amber-500",
    },
    {
      label: "Ongoing",
      value: administration?.request_summary.ongoing ?? null,
      note: "Currently in progress",
      style: "border-blue-200 bg-blue-50/70",
      dot: "bg-blue-500",
    },
    {
      label: "Completed",
      value: administration?.request_summary.completed ?? null,
      note: "Successfully closed",
      style: "border-emerald-200 bg-emerald-50/70",
      dot: "bg-emerald-500",
    },
    {
      label: "Disapproved",
      value: administration?.request_summary.disapproved ?? null,
      note: "Not approved",
      style: "border-rose-200 bg-rose-50/70",
      dot: "bg-rose-500",
    },
    {
      label: "Canceled",
      value: administration?.request_summary.canceled ?? null,
      note: "Canceled or withdrawn",
      style: "border-slate-200 bg-slate-50",
      dot: "bg-slate-500",
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

      <section aria-labelledby="admin-primary-summary">
        <div className="mb-4">
          <h2 id="admin-primary-summary" className="text-lg font-semibold">
            At a glance
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            The most important workspace totals and request signals.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {primaryCards.map((card) => (
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

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-6 xl:col-span-8">
          <section
            aria-labelledby="admin-request-summary"
            className="rounded-2xl border border-line/60 bg-white p-5 shadow-sm"
          >
            <h2 id="admin-request-summary" className="text-lg font-semibold">
              Request lifecycle
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Current request volume grouped by workflow status.
            </p>
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
              {lifecycleMetrics.map((metric) => (
                <article
                  key={metric.label}
                  className={`min-w-0 rounded-xl border p-4 ${metric.style}`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-muted">
                    <span
                      aria-hidden="true"
                      className={`size-2 shrink-0 rounded-full ${metric.dot}`}
                    />
                    <h3>{metric.label}</h3>
                  </div>
                  <p
                    className="mt-3 text-2xl font-semibold text-ink tabular-nums"
                    aria-label={
                      metric.value === null
                        ? `${metric.label}: unavailable`
                        : undefined
                    }
                  >
                    {metric.value?.toLocaleString() ?? "—"}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    {metric.value === null ? "Unavailable" : metric.note}
                  </p>
                </article>
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
                  Recent system requests with their request ID, type, date,
                  branch and status
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

        <aside
          aria-label="Administrative dashboard supporting information"
          className="min-w-0 space-y-6 xl:col-span-4"
        >
          <section
            aria-labelledby="admin-organization-summary"
            className="rounded-2xl border border-line/60 bg-white p-5 shadow-sm"
          >
            <h2
              id="admin-organization-summary"
              className="text-lg font-semibold"
            >
              Organization overview
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Account verification and the mix of tracked organization records.
            </p>

            {administration ? (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <dt className="text-sm text-emerald-800">Verified users</dt>
                    <dd className="mt-2 text-2xl font-semibold text-emerald-950 tabular-nums">
                      {administration.summary.verified_users.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                    <dt className="text-sm text-amber-800">Unverified users</dt>
                    <dd className="mt-2 text-2xl font-semibold text-amber-950 tabular-nums">
                      {administration.summary.unverified_users.toLocaleString()}
                    </dd>
                  </div>
                </dl>

                <AdminOrganizationChart
                  metrics={{
                    branches: administration.summary.branches,
                    positions: administration.summary.positions,
                    approvers: administration.summary.approvers,
                    avpStaffAssignments:
                      administration.summary.avp_staff_assignments,
                    branchHeadAssignments:
                      administration.summary.branch_head_assignments,
                  }}
                />

                <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-900">
                      Feedback submissions
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      Feedback received from users
                    </p>
                  </div>
                  <p className="shrink-0 text-2xl font-semibold text-amber-950 tabular-nums">
                    {administration.summary.feedbacks.toLocaleString()}
                  </p>
                </div>
              </>
            ) : (
              <p
                role="status"
                className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted"
              >
                Organization metrics are currently unavailable.
              </p>
            )}
          </section>

          <section
            aria-labelledby="admin-quick-links"
            className="rounded-2xl border border-line/60 bg-white p-5 shadow-sm"
          >
            <h2 id="admin-quick-links" className="text-lg font-semibold">
              Administrative quick links
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Open common administration tools.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex min-h-16 min-w-0 items-center gap-3 rounded-xl border border-line/60 bg-slate-50/60 p-3 transition-colors hover:border-brand/40 hover:bg-blue-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-white text-blue-700">
                    <Icon name={link.icon} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">
                      {link.label}
                    </span>
                    <span className="mt-0.5 block text-sm leading-5 text-muted">
                      {link.description}
                    </span>
                  </span>
                  <Icon
                    name="chevronRight"
                    className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
