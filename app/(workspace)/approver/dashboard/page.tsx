import type { Metadata } from "next";
import DashboardOverview from "@/components/dashboard/dashboard-overview";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const metadata: Metadata = { title: "Approver dashboard | SMCT Request Form" };
export const instant = false;

export default async function ApproverDashboardPage() {
  await requireRole(APP_ROLES.APPROVER);

  return <DashboardOverview approvalView />;
}
