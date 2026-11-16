import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import ReportsPage from "@/components/admin/reports/reports-page";
import { getRequestReportsServer } from "@/lib/admin/request-report-server";
import type { RequestReportPage } from "@/lib/admin/request-reports";
import { ApiError } from "@/lib/api";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Reports | SMCT Request Form",
};

export default async function AdminReportsPage() {
  // Server-side role check runs before any report data is fetched. Laravel
  // enforces the Admin report policy again on every API call.
  await requireRole(APP_ROLES.ADMIN);

  let initialPage: RequestReportPage | null = null;

  try {
    initialPage = await getRequestReportsServer({
      page: 1,
      perPage: 20,
      sort: "created_at",
      direction: "desc",
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 419) {
        redirect("/login");
      }

      if (error.status === 403) forbidden();
    }

    // Other failures leave initialPage null so the client page can show
    // its own retry state instead of crashing the route.
  }

  return <ReportsPage initialPage={initialPage} />;
}
