import Link from "next/link";
import PageHeader from "@/components/layouts/page-header";
import ApprovalActivity from "@/components/dashboard/approval-activity";
import DashboardRefreshButton from "@/components/dashboard/dashboard-refresh-button";
import Icon, { type IconName } from "@/components/ui/icon";
import MetricCard, { type MetricTone } from "@/components/ui/metric-card";
import type {
  DashboardData,
  DashboardRequestStatus,
} from "@/lib/dashboard";

export type DashboardUser = {
  name: string;
  firstName: string | null;
  email: string | null;
  position: string | null;
  branch: string | null;
};

type DashboardOverviewProps = {
  user: DashboardUser;
  initialData: DashboardData | null;
  mode?: "personal" | "approval";
  accessLabel: string;
  canCreateRequest: boolean;
};

const statusStyles: Record<DashboardRequestStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Ongoing: "bg-blue-100 text-blue-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Disapproved: "bg-red-100 text-red-800",
  Canceled: "bg-slate-200 text-slate-700",
};

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

export default function DashboardOverview({
  user,
  initialData,
  mode = "personal",
  accessLabel,
  canCreateRequest,
}: DashboardOverviewProps) {
  const summary = initialData?.personal.summary ?? null;
  const approval = initialData?.approval ?? null;
  const recentRequests = initialData?.personal.recent_requests ?? [];
  const name = user.firstName || user.name || "there";
  // const auditAccess = Boolean(user.position?.startsWith("Audit"));

  const personalCards: Array<{
    label: string;
    value: number | null;
    icon: IconName;
    tone: MetricTone;
    note?: string;
  }> = [
    {
      label: "Total requests",
      value: summary?.total ?? null,
      icon: "file",
      tone: "blue",
      note: summary
        ? `Canceled: ${summary.canceled.toLocaleString()}`
        : undefined,
    },
    {
      label: "Completed",
      value: summary?.completed ?? null,
      icon: "checkCircle",
      tone: "emerald",
      note: "Completed successfully",
    },
    {
      label: "Ongoing",
      value: summary?.ongoing ?? null,
      icon: "progress",
      tone: "cyan",
      note: "In progress",
    },
    {
      label: "Pending",
      value: summary?.pending ?? null,
      icon: "clock",
      tone: "amber",
      note: "Awaiting action",
    },
    {
      label: "Disapproved",
      value: summary?.disapproved ?? null,
      icon: "xCircle",
      tone: "rose",
      note: "Not approved",
    },
  ];

  const approvalCards: Array<{
    label: string;
    value: number;
    icon: IconName;
    tone: MetricTone;
    note: string;
  }> = approval
    ? [
        {
          label: "Total assigned",
          value: approval.summary.total_assigned,
          icon: "clipboard",
          tone: "blue",
          note: "All steps assigned to you",
        },
        {
          label: "Approved by me",
          value: approval.summary.approved,
          icon: "checkCircle",
          tone: "emerald",
          note: "Decisions you approved",
        },
        {
          label: "Awaiting my action",
          value: approval.summary.awaiting_action,
          icon: "clock",
          tone: "amber",
          note: "Assignments waiting for your decision",
        },
        {
          label: "Disapproved by me",
          value: approval.summary.disapproved,
          icon: "xCircle",
          tone: "rose",
          note: "Decisions you disapproved",
        },
        {
          label: "Closed without action",
          value: approval.summary.closed_without_action,
          icon: "close",
          tone: "cyan",
          note: "Assignments skipped or canceled",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="WORKSPACE OVERVIEW"
        title={mode === "approval" ? "Approver dashboard" : "Dashboard"}
        description={
          mode === "approval"
            ? "Keep track of your requests and the approvals waiting for your attention."
            : accessLabel === "Administrator"
              ? "Your account, your team, and your workplace in one connected space."
              : "Keep your requests organized and follow their progress in one place."
        }
      >
        <DashboardRefreshButton label="Refresh overview" showLabel />
      </PageHeader>

      <section
        aria-labelledby="welcome-title"
        className="relative isolate overflow-hidden rounded-2xl border border-blue-200 bg-linear-to-br from-blue-100 via-blue-100/80 to-indigo-100 p-5 shadow-[0_2px_12px_#0f172a04] sm:p-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-12 -z-10 size-80 rounded-full border-[40px] border-blue-200/40"
        />
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-sm font-medium text-blue-800">
              <Icon
                name={accessLabel === "Administrator" ? "shieldCheck" : "profile"}
                className="size-4"
              />
              {accessLabel}
              {/*{auditAccess ? " · Audit access" : ""} */}
            </p>
            <h2
              id="welcome-title"
              className="mt-5 text-2xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-3xl"
            >
              Welcome back, <span className="text-blue-800">{name}.</span>
            </h2>
            <p className="mt-2 max-w2xl text-sm leading-6 text-slate-600">
              {mode === "approval"
                ? "Your personal requests and approval activity in one place."
                : accessLabel === "Administrator"
                  ? "Your account, your team, and your workplace in one connected space."
                  : "Keep your requests organized and follow their progress in one place."}
            </p>
            {(canCreateRequest || mode === "approval") && (
              <div className="mt-5 flex flex-wrap gap-3">
                {canCreateRequest && (
                  <Link
                    href="/create-request"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <Icon name="plus" />
                    Create a Request
                  </Link>
                )}
                {mode === "approval" && (
                  <Link
                    href="/approver/request?assignment_status=Pending"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-800 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <Icon name="clipboard" />
                    Process Request
                  </Link>
                )}
              </div>
            )}
          </div>
          <div
            aria-hidden="true"
            className="hidden size-28 shrink-0 place-items-center rounded-3xl border border-white bg-white/70 text-blue-700 shadow-[0_8px_32px_#1e40af0a] xl:grid"
          >
            <Icon
              name={accessLabel === "Administrator" ? "shieldCheck" : "clipboard"}
              className="size-12"
            />
          </div>
        </div>
      </section>

      {initialData === null && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          We couldn&apos;t load your dashboard data. Use the refresh button to try
          again.
        </p>
      )}

      {mode === "approval" && (
        <section aria-labelledby="approval-summary">
          <h2 id="approval-summary" className="mb-4 text-lg font-semibold">
            Approval Requests
          </h2>
          {approval ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
              {approvalCards.map((card) => (
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
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Your approval summary is currently unavailable. Use the refresh
              button to try again.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="my-summary">
        <h2 id="my-summary" className="mb-4 text-lg font-semibold">
          My Requests
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
          {personalCards.map((card) => (
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

        {summary?.total === 0 && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950"
          >
            <p className="font-medium">No requests yet.</p>
            <p className="mt-1 text-sm text-blue-900">
              {canCreateRequest
                ? "When you submit a request, it will appear here."
                : "This account has no personal requests to display."}
            </p>
            {canCreateRequest && (
              <Link
                href="/create-request"
                className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Create your first request
              </Link>
            )}
          </div>
        )}
      </section>

      <section
        aria-labelledby="recent-title"
        className="overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 p-4 sm:px-5">
          <div>
            <h2 id="recent-title" className="text-lg font-semibold">
              Recent requests
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Your five latest requests and their current status.
            </p>
          </div>
          <Link
            href="/request"
            className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            See all
          </Link>
        </div>
        <div
          role="region"
          aria-label="Recent requests table"
          tabIndex={0}
          className="overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        >
          <table className="w-full min-w-[650px] text-left text-sm">
            <caption className="sr-only">
              Recent requests with their request ID, type, date, branch and
              status
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
              {initialData === null ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm leading-6 text-muted"
                  >
                    Your recent requests are currently unavailable.
                  </td>
                </tr>
              ) : recentRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm leading-6 text-muted"
                  >
                    No requests yet.
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

      {mode === "approval" && (
        <ApprovalActivity activity={approval?.activity ?? null} />
      )}

      <section
        aria-labelledby="account-title"
        className="rounded-2xl border border-line/60 bg-white p-5"
      >
        <h2 id="account-title" className="text-lg font-semibold">
          Your account
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Name", user.name],
            ["Email", user.email],
            ["Position", user.position],
            ["Branch / company", user.branch],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-1 wrap-anywhere font-medium">
                {value || "Not provided"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
