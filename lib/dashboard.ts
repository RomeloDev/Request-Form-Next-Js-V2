import { ApiError, apiRequest } from "@/lib/api";

export type RequestSummary = { total: number | null; completed: number | null; ongoing: number | null; pending: number | null; disapproved: number | null };
type PersonalCounts = { totalRequestSent: number; totalCompletedRequest: number; totalOngoingRequest: number; totalPendingRequest: number; totalDisapprovedRequest: number };
type ApprovalCounts = { total: number; total_completed: number; total_ongoing: number; total_pending: number; total_disapproved: number };
export type RecentRequest = { id: number; request_code: string; form_type: string; created_at: string; status: string; form_data?: { branch?: string | number }[] };
export type DashboardData = { personal: RequestSummary | null; approval: RequestSummary | null; recent: RecentRequest[] | null; branches: Record<string, string> };

export async function loadDashboard(userId: number, approver: boolean, signal: AbortSignal): Promise<DashboardData> {
  const options = { credentials: "include" as const, signal };
  const results = await Promise.allSettled([
    apiRequest<PersonalCounts>(`/total-request-sent/${userId}/my-request-total`, options),
    approver ? apiRequest<ApprovalCounts>("/approval-request-counts", options) : Promise.resolve(null),
    apiRequest<{ data: { data: RecentRequest[] } }>("/view-request?page=1&per_page=5", options),
    apiRequest<{ data: { id: number; branch_code: string }[] }>("/view-branch", options),
  ]);
  for (const result of results) {
    if (result.status === "rejected" && result.reason instanceof ApiError && result.reason.status === 401) throw result.reason;
  }
  const [personal, approval, recent, branches] = results;
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

  return {
    personal: personal.status === "fulfilled" ? {
      total: number(personal.value.totalRequestSent), completed: number(personal.value.totalCompletedRequest),
      ongoing: number(personal.value.totalOngoingRequest), pending: number(personal.value.totalPendingRequest),
      disapproved: number(personal.value.totalDisapprovedRequest),
    } : null,
    approval: approval.status === "fulfilled" && approval.value ? {
      total: number(approval.value.total), completed: number(approval.value.total_completed),
      ongoing: number(approval.value.total_ongoing), pending: number(approval.value.total_pending),
      disapproved: number(approval.value.total_disapproved),
    } : null,
    recent: recent.status === "fulfilled" && Array.isArray(recent.value.data?.data)
      ? [...recent.value.data.data].sort((a, b) => b.id - a.id).slice(0, 5) : null,
    branches: branches.status === "fulfilled" && Array.isArray(branches.value.data)
      ? Object.fromEntries(branches.value.data.map((branch) => [String(branch.id), branch.branch_code])) : {},
  };
}
