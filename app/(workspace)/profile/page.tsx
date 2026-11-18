import type { Metadata } from "next";
import ProfilePage from "@/components/profile/profile-page";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Profile | SMCT Request Form",
  description:
    "Review your account details and manage your profile picture, signature, and password.",
};

export default async function ProfileRoute() {
  // Server-side role check before the client profile component renders.
  // Laravel enforces the same identity and media policies again on every
  // /profile endpoint, so this guard is defence in depth, not the boundary.
  await requireRole([
    APP_ROLES.ADMIN,
    APP_ROLES.USER,
    APP_ROLES.APPROVER,
  ]);

  return <ProfilePage />;
}
