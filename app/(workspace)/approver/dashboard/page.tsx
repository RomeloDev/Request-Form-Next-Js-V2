import type { Metadata } from "next";
import DashboardOverview from "@/components/dashboard/dashboard-overview";

export const metadata: Metadata = { title: "Approver dashboard | SMCT Request Form" };

export default function ApproverDashboardPage() {
  return <DashboardOverview approvalView />;
}
