import type { Metadata } from "next";
import ApproversPage from "@/components/admin/approvers/approvers-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Approvers | SMCT Request Form",
};

// Keep the route file thin; interactive state belongs in ApproversPage.
export default async function AdminApproversPage() {
  await requireRole(APP_ROLES.ADMIN);

  return <ApproversPage />;
}
