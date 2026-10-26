import { dashboardFor, type AuthenticatedUser } from "@/lib/auth";

export type NavigationItem = { label: string; href: string; available: boolean };

export function isAuditor(user: AuthenticatedUser) {
  return user.position?.startsWith("Audit") ?? false;
}

/** Keep reference sidebar visibility/order; enable modules as they are delivered. */
export function navigationFor(user: AuthenticatedUser): NavigationItem[] {
  const dashboard = { label: "Dashboard", href: dashboardFor(user), available: true };
  const item = (label: string, href: string) => ({ label, href, available: false });
  const reports = item("Reports", "/reports");
  const help = item("Help", "/help");
  const personal = [item("My Request", "/request"), item("Create Request", "/create-request?title=Stock%20Requisition")];
  const shared = item("Shared Requests", "/shared-requests");
  const process = item("Process Request", "/approver/request?status=Pending");

  // The reference checks Audit capability before the Admin navigation branch.
  if (isAuditor(user)) return [dashboard, ...personal, ...(user.role === "approver" ? [process] : []), reports, shared, help];
  if (user.role === "approver") return [dashboard, ...personal, process, shared, help];
  if (user.role === "Admin") {
    return [dashboard, item("Users", "/admin/users"), item("Positions", "/admin/positions"),
      item("Branches", "/admin/branches"), item("Approvers", "/admin/approvers"),
      item("AVP Staffs", "/admin/avp-staffs"), item("Area Managers", "/admin/area-managers"),
      item("Branch Heads", "/admin/branch-heads"), item("Feedbacks", "/admin/feedbacks"),
      item("Request Access", "/admin/request-access"), reports, help];
  }
  return [dashboard, ...personal, shared, help];
}
