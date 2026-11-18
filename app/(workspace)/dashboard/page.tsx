import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import DashboardOverview from "@/components/dashboard/dashboard-overview";
import { ApiError } from "@/lib/api";
import type { DashboardData } from "@/lib/dashboard";
import { getDashboardServer } from "@/lib/dashboard-server";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const metadata: Metadata = { title: "Dashboard | SMCT Request Form" };
export const instant = false;

export default async function DashboardPage() {
  // The role check runs on the server before any dashboard data is fetched.
  // An approver who opens /dashboard is sent to the forbidden page.
  const user = await requireRole([APP_ROLES.ADMIN, APP_ROLES.USER]);

  let initialData: DashboardData | null = null;

  try {
    initialData = await getDashboardServer("none");
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 419) {
        redirect("/login");
      }

      if (error.status === 403) forbidden();
    }

    // Other failures leave initialData null so the dashboard can show a safe
    // unavailable state instead of crashing the route.
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
      mode="personal"
      accessLabel={
        user.role === APP_ROLES.ADMIN ? "Administrator" : "User"
      }
      canCreateRequest={user.role === APP_ROLES.USER}
    />
  );
}
