import type { Metadata } from "next";
import AvpStaffsPage from "@/components/admin/avp-staffs/avp-staffs-page";

export const instant = false;

export const metadata: Metadata = {
  title: "AVP Staff | SMCT Request Form",
};

export default function AdminAvpStaffsPage() {
  return <AvpStaffsPage />;
}
