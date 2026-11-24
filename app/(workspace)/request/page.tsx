import type { Metadata } from "next";
import MyRequestsPage from "@/components/requests/my-requests/my-requests-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";
import { parseOptionalRequestId } from "@/lib/request-route-params";

export const instant = false;

export const metadata: Metadata = {
  title: "My Requests | SMCT Request Form",
};

type RequestSearchParams = {
  search?: string | string[];
  request_id?: string | string[];
};

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<RequestSearchParams>;
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

  return (
    <MyRequestsPage
      key={`${initialSearch}:${initialSelectedRequestId ?? "none"}`}
      initialSearch={initialSearch}
      initialSelectedRequestId={initialSelectedRequestId}
    />
  );
}
