"use client";

import type { ReactNode } from "react";
import { useSession } from "@/components/auth/session-provider";
import { APP_ROLES } from "@/lib/roles";

export default function DashboardLoadingSelector({
  administration,
  personal,
}: {
  administration: ReactNode;
  personal: ReactNode;
}) {
  const { user } = useSession();

  return user.role === APP_ROLES.ADMIN ? administration : personal;
}
