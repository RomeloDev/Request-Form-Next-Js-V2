import type { Metadata } from "next";
import DashboardOverview from "@/components/dashboard/dashboard-overview";
import { getCurrentUser } from "@/lib/server-auth";

export const metadata: Metadata = { title: "Dashboard | SMCT Request Form" };
export const instant = false;

export default async function DashboardPage() {
  await getCurrentUser();

  return <DashboardOverview />;
}
