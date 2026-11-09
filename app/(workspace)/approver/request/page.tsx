import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import AssignedRequestsPage from "@/components/requests/assigned-requests/assigned-requests-page";
import { ApiError } from "@/lib/api";
import { APP_ROLES } from "@/lib/roles";
import { getAssignedRequestsServer } from "@/lib/requests/assigned-request-server";
import type { AssignedRequestPage } from "@/lib/requests/assigned-requests";
import type { MyRequestStatus } from "@/lib/requests/my-requests";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Process Requests | SMCT Request Form",
};

const allowedStatuses = new Set<string>([
  "ALL",
  "Pending",
  "Ongoing",
  "Completed",
  "Disapproved",
]);

export default async function ProcessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await requireRole(APP_ROLES.APPROVER);

  const parameters = await searchParams;
  const suppliedStatus = Array.isArray(parameters.status)
    ? parameters.status[0]
    : parameters.status;
  const initialStatus =
    suppliedStatus && allowedStatuses.has(suppliedStatus)
      ? (suppliedStatus as "ALL" | MyRequestStatus)
      : "Pending";

  let initialPage: AssignedRequestPage | null = null;

  try {
    initialPage = await getAssignedRequestsServer({
      status: initialStatus,
      page: 1,
      perPage: 10,
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 419) {
        redirect("/login");
      }

      if (error.status === 403) forbidden();
    }
  }

  return (
    <AssignedRequestsPage
      initialStatus={initialStatus}
      initialPage={initialPage}
    />
  );
}
