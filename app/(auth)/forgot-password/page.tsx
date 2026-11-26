import type { Metadata } from "next";
import AuthPage from "@/components/auth/auth-page";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password | SMCT Request Form",
  description: "Request a password reset link for your SMCT Request Form account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      id="forgot-password-title"
      eyebrow="Account recovery"
      title="Reset your"
      accent="password"
      description="Enter the email connected to your account. We’ll send reset instructions if the account exists."
      backLink={{ href: "/login", label: "Back to sign in" }}
      compact
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}
