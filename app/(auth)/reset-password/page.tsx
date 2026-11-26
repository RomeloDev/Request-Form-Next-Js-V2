import type { Metadata } from "next";
import { Suspense } from "react";
import AuthPage from "@/components/auth/auth-page";
import ResetPasswordForm from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password | SMCT Request Form",
  description: "Choose a new password for your SMCT Request Form account.",
  referrer: "no-referrer",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[];
    email?: string | string[];
  }>;
};

async function ResetPasswordDetails({
  searchParams,
}: ResetPasswordPageProps) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const email = typeof query.email === "string" ? query.email : "";
  const invalidLink = !token || token.length > 255 || !email || email.length > 255;

  return (
    <ResetPasswordForm
      email={email}
      token={token}
      invalidLink={invalidLink}
    />
  );
}

export default function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  return (
    <AuthPage
      id="reset-password-title"
      eyebrow="Account recovery"
      title="Choose a new"
      accent="password"
      description="Use the email and secure link from your reset message to choose a new password."
      backLink={{ href: "/login", label: "Back to sign in" }}
      compact
    >
      <Suspense
        fallback={(
          <p role="status" className="mt-6 text-sm leading-6 text-muted">
            Checking your reset link…
          </p>
        )}
      >
        <ResetPasswordDetails searchParams={searchParams} />
      </Suspense>
    </AuthPage>
  );
}
