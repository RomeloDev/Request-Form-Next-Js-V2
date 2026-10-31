import type { Metadata } from "next";
import PositionsPage from "@/components/admin/positions/positions-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Positions | SMCT Request Form",
};

export default async function AdminPositionsPage() {
  await requireRole(APP_ROLES.ADMIN);

  return <PositionsPage />;
}
