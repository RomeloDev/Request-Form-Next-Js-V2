import type { Metadata } from "next";
import BranchesPage from "@/components/admin/branches/branches-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Branches | SMCT Request Form",
};

export default async function AdminBranchesPage() {
  await requireRole(APP_ROLES.ADMIN);

  return <BranchesPage />;
}
