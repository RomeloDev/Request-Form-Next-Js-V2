import { dashboardFor, type AuthenticatedUser } from "@/lib/auth";
import type { IconName } from "@/components/ui/icon";

export type NavigationItem = { label: string; href: string; available: boolean; icon: IconName };
const icons: Record<string, IconName> = {
  Dashboard: "dashboard", Users: "users", Positions: "briefcase", Branches: "building",
  Approvers: "userCheck", "AVP Staffs": "team", "Area Managers": "location",
  "Branch Heads": "contact", Feedbacks: "feedback", "Request Access": "lock",
  Reports: "chart", Help: "help", "My Request": "file", "Create Request": "filePlus",
  "Shared Requests": "share", "Process Request": "clipboard",
};

export function isAuditor(user: AuthenticatedUser) {
  return user.position?.startsWith("Audit") ?? false;
}

/** Keep reference sidebar visibility/order; enable modules as they are delivered. */
export function navigationFor(user: AuthenticatedUser): NavigationItem[] {
  const item = (label: string, href: string, available = false): NavigationItem => ({ label, href, available, icon: icons[label] ?? "file" });
  const dashboard = item("Dashboard", dashboardFor(user), true);
  const reports = item("Reports", "/reports");
  const help = item("Help", "/help");
  const personal = [item("My Request", "/request"), item("Create Request", "/create-request?title=Stock%20Requisition")];
  const shared = item("Shared Requests", "/shared-requests");
  const process = item("Process Request", "/approver/request?status=Pending");

  // The reference checks Audit capability before the Admin navigation branch.
  if (isAuditor(user)) return [dashboard, ...personal, ...(user.role === "approver" ? [process] : []), reports, shared, help];
  if (user.role === "approver") return [dashboard, ...personal, process, shared, help];
  if (user.role === "Admin") {
    return [dashboard, item("Users", "/admin/users", true), item("Positions", "/admin/positions", true),
      item("Branches", "/admin/branches", true), item("Approvers", "/admin/approvers", true),
      item("AVP Staffs", "/admin/avp-staffs"), item("Area Managers", "/admin/area-managers"),
      item("Branch Heads", "/admin/branch-heads"), item("Feedbacks", "/admin/feedbacks"),
      item("Request Access", "/admin/request-access"), reports, help];
  }
  return [dashboard, ...personal, shared, help];
}
