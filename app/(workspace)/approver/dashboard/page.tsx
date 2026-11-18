import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import DashboardOverview from "@/components/dashboard/dashboard-overview";
import { ApiError } from "@/lib/api";
import type { DashboardData } from "@/lib/dashboard";
import { getDashboardServer } from "@/lib/dashboard-server";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const metadata: Metadata = { title: "Approver dashboard | SMCT Request Form" };
export const instant = false;

export default async function ApproverDashboardPage() {
  // Server-side role enforcement runs before the approval data is fetched.
  const user = await requireRole(APP_ROLES.APPROVER);

  let initialData: DashboardData | null = null;

  try {
    initialData = await getDashboardServer("required");
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 419) {
        redirect("/login");
      }

      if (error.status === 403) forbidden();
    }
  }

  return (
    <DashboardOverview
      user={{
        name: user.name ?? "",
        firstName: user.firstName ?? null,
        email: user.email ?? null,
        position: user.position ?? null,
        branch: user.branch ?? null,
      }}
      initialData={initialData}
      mode="approval"
      accessLabel="Approver"
      canCreateRequest={user.role === APP_ROLES.APPROVER}
    />
  );
}
