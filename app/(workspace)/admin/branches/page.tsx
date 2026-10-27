import type { Metadata } from "next";
import BranchesPage from "@/components/admin/branches/branches-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Branches | SMCT Request Form",
};

export default function AdminBranchesPage() {
  return <BranchesPage />;
}