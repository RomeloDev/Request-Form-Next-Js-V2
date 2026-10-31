import type { Metadata } from "next";
import AvpStaffsPage from "@/components/admin/avp-staffs/avp-staffs-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "AVP Staff | SMCT Request Form",
};

export default async function AdminAvpStaffsPage() {
  await requireRole(APP_ROLES.ADMIN);

  return <AvpStaffsPage />;
}
