import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import AssignedRequestsPage from "@/components/requests/assigned-requests/assigned-requests-page";
import { ApiError } from "@/lib/api";
import { APP_ROLES } from "@/lib/roles";
import { getAssignedRequestsServer } from "@/lib/requests/assigned-request-server";
import type { AssignedRequestPage } from "@/lib/requests/assigned-requests";
import type { AssignedRequestStep } from "@/lib/requests/assigned-requests";
import { requireRole } from "@/lib/server-auth";
import { parseOptionalRequestId } from "@/lib/request-route-params";

export const instant = false;

export const metadata: Metadata = {
  title: "Process Requests | SMCT Request Form",
};

const allowedStatuses = new Set<string>([
  "ALL",
  "Pending",
  "Approved",
  "Disapproved",
  "Skipped",
]);

export default async function ProcessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    assignment_status?: string | string[];
    search?: string | string[];
    request_id?: string | string[];
  }>;
}) {
  await requireRole(APP_ROLES.APPROVER);

  const parameters = await searchParams;
  const suppliedStatus = Array.isArray(parameters.assignment_status)
    ? parameters.assignment_status[0]
    : parameters.assignment_status;
  const initialAssignmentStatus =
    suppliedStatus && allowedStatuses.has(suppliedStatus)
      ? (suppliedStatus as "ALL" | AssignedRequestStep["status"])
      : "Pending";
  const suppliedSearch = Array.isArray(parameters.search)
    ? parameters.search[0]
    : parameters.search;
  const initialSearch = suppliedSearch?.trim().slice(0, 100) ?? "";
  const initialSelectedRequestId = parseOptionalRequestId(
    parameters.request_id,
  );

  let initialPage: AssignedRequestPage | null = null;

  try {
    initialPage = await getAssignedRequestsServer({
      search: initialSearch,
      assignmentStatus: initialAssignmentStatus,
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
      key={`${initialAssignmentStatus}:${initialSearch}:${
        initialSelectedRequestId ?? "none"
      }`}
      initialSearch={initialSearch}
      initialSelectedRequestId={initialSelectedRequestId}
      initialAssignmentStatus={initialAssignmentStatus}
      initialPage={initialPage}
    />
  );
}
