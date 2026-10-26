import type { Metadata } from "next";
import UsersPage from "@/components/admin/users/users-page";

export const metadata: Metadata = { title: "Users | SMCT Request Form" };

export default function AdminUsersPage() {
  return <UsersPage />;
}
