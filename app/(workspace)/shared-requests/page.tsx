import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import SharedRequestsPage from "@/components/requests/shared-requests/shared-requests-page";
import { ApiError } from "@/lib/api";
import { getSharedRequestsServer } from "@/lib/requests/shared-request-server";
import type { SharedRequestPage } from "@/lib/requests/shared-requests";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";
import { parseOptionalRequestId } from "@/lib/request-route-params";

export const instant = false;

export const metadata: Metadata = {
  title: "Shared Requests | SMCT Request Form",
};

export default async function SharedRequestsRoute({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string | string[];
    request_id?: string | string[];
  }>;
}) {
  await requireRole([
    APP_ROLES.USER,
    APP_ROLES.APPROVER,
    APP_ROLES.ADMIN,
  ]);

  const parameters = await searchParams;
  const suppliedSearch = Array.isArray(parameters.search)
    ? parameters.search[0]
    : parameters.search;
  const initialSearch = suppliedSearch?.trim().slice(0, 100) ?? "";
  const initialSelectedRequestId = parseOptionalRequestId(
    parameters.request_id,
  );

  let initialPage: SharedRequestPage | null = null;

  try {
    initialPage = await getSharedRequestsServer({
      search: initialSearch,
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
    <SharedRequestsPage
      key={`${initialSearch}:${initialSelectedRequestId ?? "none"}`}
      initialSearch={initialSearch}
      initialSelectedRequestId={initialSelectedRequestId}
      initialPage={initialPage}
    />
  );
}
