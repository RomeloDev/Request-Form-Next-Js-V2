import type { Metadata } from "next";
import BranchHeadsPage from "@/components/admin/branch-heads/branch-heads-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;
export const metadata: Metadata = { title: "Branch Heads | SMCT Request Form" };

export default async function AdminBranchHeadsPage() {
  await requireRole(APP_ROLES.ADMIN);

  return <BranchHeadsPage />;
}

