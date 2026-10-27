import type { Metadata } from "next";
import PositionsPage from "@/components/admin/positions/positions-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Positions | SMCT Request Form",
};

export default function AdminPositionsPage() {
  return <PositionsPage />;
}