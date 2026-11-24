import type { ReactNode } from "react";
import SessionProvider from "@/components/auth/session-provider";
import AppShell from "@/components/layouts/app-shell";
import { APP_ROLES } from "@/lib/roles";
import { getAssignedRequestsServer } from "@/lib/requests/assigned-request-server";
import { getCurrentUser } from "@/lib/server-auth";
import { getInitialNotificationStateServer } from "@/lib/notifications-server";
import type { NotificationPage } from "@/lib/notifications";

export const instant = false;

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const notificationFallback: {
    page: NotificationPage;
    unreadCount: number;
  } = {
    page: {
      data: [],
      links: {
        first: null,
        last: null,
        prev: null,
        next: null,
      },
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: null,
        to: null,
      },
      message: "Notifications retrieved successfully.",
    },
    unreadCount: 0,
  };

  const pendingAssignmentsTask =
    user.role === APP_ROLES.APPROVER
      ? getAssignedRequestsServer({
          assignmentStatus: "Pending",
          page: 1,
          perPage: 10,
        }).catch(() => null)
      : Promise.resolve(null);
  const notificationTask =
    getInitialNotificationStateServer().catch(
      () => notificationFallback,
    );

  const [pendingAssignments, notificationState] =
    await Promise.all([
      pendingAssignmentsTask,
      notificationTask,
    ]);
  const pendingApprovalCount =
    pendingAssignments?.meta.total ?? 0;

  return (
    <SessionProvider initialUser={user}>
      <AppShell
        initialPendingApprovalCount={pendingApprovalCount}
        initialNotificationPage={notificationState.page}
        initialUnreadNotificationCount={notificationState.unreadCount}
      >
        {children}
      </AppShell>
    </SessionProvider>
  );
}
