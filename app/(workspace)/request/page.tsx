import type { Metadata } from "next";
import MyRequestsPage from "@/components/requests/my-requests/my-requests-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "My Requests | SMCT Request Form",
};

export default async function RequestPage() {
  await requireRole([
    APP_ROLES.USER,
    APP_ROLES.APPROVER,
    APP_ROLES.ADMIN,
  ]);

  return <MyRequestsPage />;
}