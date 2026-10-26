"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import { ApiError } from "@/lib/api";
import { dashboardFor } from "@/lib/auth";
import { isAuditor } from "@/lib/navigation";
import { loadDashboard, type DashboardData, type RequestSummary } from "@/lib/dashboard";

const summaries: { key: keyof RequestSummary; label: string; color: string }[] = [
  { key: "total", label: "Total requests", color: "bg-blue-50 text-blue-700" },
  { key: "completed", label: "Completed", color: "bg-emerald-50 text-emerald-700" },
  { key: "ongoing", label: "Ongoing", color: "bg-cyan-50 text-cyan-700" },
  { key: "pending", label: "Pending", color: "bg-amber-50 text-amber-800" },
  { key: "disapproved", label: "Disapproved", color: "bg-rose-50 text-rose-700" },
];

function SummaryCards({ data, loading }: { data: RequestSummary | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
      {summaries.map(({ key, label, color }) => (
        <article key={key} className="min-w-0 rounded-2xl border border-line/60 bg-white p-5 shadow-sm">
          <span aria-hidden="true" className={`mb-4 grid size-10 place-items-center rounded-xl text-lg ${color}`}>▤</span>
          <h3 className="text-sm leading-6 font-medium text-muted">{label}</h3>
          <p className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-ink" aria-label={data?.[key] == null ? `${label}: unavailable` : undefined}>
            {loading ? <span className="inline-block h-8 w-14 rounded bg-slate-100 motion-safe:animate-pulse" aria-label="Loading" /> : data?.[key]?.toLocaleString() ?? "—"}
          </p>
          {!loading && data?.[key] == null && <p className="mt-2 text-sm text-muted">Unavailable</p>}
        </article>
      ))}
    </div>
  );
}

export default function DashboardOverview({ approvalView = false }: { approvalView?: boolean }) {
  const { user } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const allowed = approvalView === (user.role === "approver");

  useEffect(() => {
    if (!allowed) { router.replace(dashboardFor(user)); return; }
    const controller = new AbortController();
    loadDashboard(user.id, approvalView, controller.signal).then((result) => {
      if (!controller.signal.aborted) { setData(result); setLoading(false); }
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) router.replace("/login");
      else setLoading(false);
    });
    return () => controller.abort();
  }, [allowed, approvalView, attempt, router, user]);

  if (!allowed) return null;

  function refresh() {
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  const name = user.firstName || user.name || "there";
  const access = user.role === "Admin" ? "Administrator" : user.role === "approver" ? "Approver" : "User";
  const unavailable = !loading && (!data?.personal || !data?.recent || (approvalView && !data?.approval));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-muted">WORKSPACE OVERVIEW</p><h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{approvalView ? "Approver dashboard" : "Dashboard"}</h1></div>
        <button type="button" onClick={refresh} disabled={loading} className="min-h-12 rounded-xl border border-line bg-white px-4 py-3 text-base font-medium text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60">{loading ? "Refreshing…" : "Refresh overview"}</button>
      </div>

      <section aria-labelledby="welcome-title" className="relative overflow-hidden rounded-2xl border border-blue-100 bg-auth-header p-6 sm:p-8">
        <p className="text-sm font-medium text-brand">{access}{isAuditor(user) ? " · Audit access" : ""}</p>
        <h2 id="welcome-title" className="mt-3 text-2xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-3xl">Welcome back, {name}.</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{approvalView ? "Keep track of your requests and the approvals waiting for your attention." : user.role === "Admin" ? "Your account, your team, and your workplace in one connected space." : "Keep your requests organized and follow their progress in one place."}</p>
        {user.role !== "Admin" && <button type="button" disabled title="Request creation is not available yet." className="mt-5 min-h-12 cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3 text-base font-semibold text-slate-600">Create a Request</button>}
      </section>

      {unavailable && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base leading-7 text-amber-950">Some request information is currently unavailable. You can refresh the overview to try again.</p>}

      {approvalView && <section aria-labelledby="approval-summary"><h2 id="approval-summary" className="mb-4 text-xl font-semibold">Approval requests</h2><SummaryCards data={data?.approval ?? null} loading={loading} /></section>}
      <section aria-labelledby="my-summary"><h2 id="my-summary" className="mb-4 text-xl font-semibold">My requests</h2><SummaryCards data={data?.personal ?? null} loading={loading} /></section>

      <section aria-labelledby="recent-title" className="overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm">
        <div className="border-b border-line/60 p-5 sm:px-6"><h2 id="recent-title" className="text-xl font-semibold">Recent requests</h2><p className="mt-1 text-sm leading-6 text-muted">Your five latest requests and their current status.</p></div>
        <div role="region" aria-label="Recent requests table" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand">
          <table className="w-full min-w-[650px] text-left text-base">
            <caption className="sr-only">Recent requests with their request ID, type, date, branch and status</caption>
            <thead className="bg-slate-50 text-sm text-muted"><tr>{["Request ID", "Request type", "Date", "Branch", "Status"].map((label) => <th key={label} scope="col" className="px-6 py-4 font-medium">{label}</th>)}</tr></thead>
            <tbody>
              {loading || data?.recent == null || !data.recent.length ? (
                <tr><td colSpan={5} className="px-6 py-14 text-center text-base leading-7 text-muted">{loading ? "Loading your requests…" : data?.recent == null ? "Your recent requests are currently unavailable." : "No requests yet."}</td></tr>
              ) : data.recent.map((request) => {
                const date = new Date(request.created_at);
                return <tr key={request.id} className="border-t border-line/50"><th scope="row" className="px-6 py-4 font-medium">{request.request_code}</th><td className="px-6 py-4">{request.form_type}</td><td className="px-6 py-4 whitespace-nowrap text-muted">{Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td><td className="px-6 py-4">{data.branches[String(request.form_data?.[0]?.branch)] ?? "—"}</td><td className="px-6 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">{request.status}</span></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      {approvalView && <section className="rounded-2xl border border-line/60 bg-white p-6"><h2 className="text-xl font-semibold">Approval activity</h2><p className="mt-3 text-base leading-7 text-muted">Approval charts are currently unavailable.</p></section>}

      <section aria-labelledby="account-title" className="rounded-2xl border border-line/60 bg-white p-6">
        <h2 id="account-title" className="text-xl font-semibold">Your account</h2>
        <dl className="mt-5 grid grid-cols-1 gap-5 text-base sm:grid-cols-2 xl:grid-cols-4">
          {[["Name", user.name], ["Email", user.email], ["Position", user.position], ["Branch / company", user.branch]].map(([label, value]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 wrap-anywhere font-medium">{value || "Not provided"}</dd></div>)}
        </dl>
      </section>
    </div>
  );
}
