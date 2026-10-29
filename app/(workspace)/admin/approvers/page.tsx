import type { Metadata } from "next";
import ApproversPage from "@/components/admin/approvers/approvers-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Approvers | SMCT Request Form",
};

// Keep the route file thin; interactive state belongs in ApproversPage.
export default function AdminApproversPage() {
  return <ApproversPage />;
}