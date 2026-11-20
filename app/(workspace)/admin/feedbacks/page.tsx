import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";
import FeedbacksPage from "@/components/admin/feedbacks/feedbacks-page";
import { getFeedbacksServer } from "@/lib/admin/feedbacks-server";
import type { FeedbackPage } from "@/lib/admin/feedbacks";
import { ApiError } from "@/lib/api";
import { APP_ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/server-auth";

export const instant = false;

export const metadata: Metadata = {
  title: "Feedbacks | SMCT Request Form",
};

export default async function AdminFeedbacksPage() {
  // The role check runs on the server before any feedback data is fetched.
  // Laravel enforces the Admin feedback policy again on every API call.
  await requireRole(APP_ROLES.ADMIN);

  let initialPage: FeedbackPage | null = null;

  try {
    initialPage = await getFeedbacksServer({
      page: 1,
      perPage: 20,
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 419) {
        redirect("/login");
      }

      if (error.status === 403) forbidden();
    }

    // Other failures leave initialPage null so the client page can show
    // its own retry state instead of crashing the route.
  }

  return <FeedbacksPage initialPage={initialPage} />;
}
