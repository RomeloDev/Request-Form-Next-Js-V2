import type { ReactNode } from "react";
import SessionProvider from "@/components/auth/session-provider";
import AppShell from "@/components/layouts/app-shell";
import { APP_ROLES } from "@/lib/roles";
import { getAssignedRequestsServer } from "@/lib/requests/assigned-request-server";
import { getCurrentUser } from "@/lib/server-auth";

export const instant = false;

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  let pendingApprovalCount = 0;

  if (user.role === APP_ROLES.APPROVER) {
    try {
      const pendingAssignments = await getAssignedRequestsServer({
        assignmentStatus: "Pending",
        page: 1,
        perPage: 10,
      });
      pendingApprovalCount = pendingAssignments.meta.total;
    } catch {
      // The workspace remains usable if the optional badge cannot load.
    }
  }

  return (
    <SessionProvider initialUser={user}>
      <AppShell initialPendingApprovalCount={pendingApprovalCount}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
