import type { ReactNode } from "react";
import SessionProvider from "@/components/auth/session-provider";
import AppShell from "@/components/layouts/app-shell";
import { getCurrentUser } from "@/lib/server-auth";

export const instant = false;

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return <SessionProvider initialUser={user}><AppShell>{children}</AppShell></SessionProvider>;
}
