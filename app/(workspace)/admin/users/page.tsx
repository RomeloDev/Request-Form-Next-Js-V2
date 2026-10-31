import type { Metadata } from "next";
import UsersPage from "@/components/admin/users/users-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;
export const metadata: Metadata = { title: "Users | SMCT Request Form" };

export default async function AdminUsersPage() {
  await requireRole(APP_ROLES.ADMIN);

  return <UsersPage />;
}
