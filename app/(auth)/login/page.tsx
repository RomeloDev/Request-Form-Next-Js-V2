import type { Metadata } from "next";
import AuthPage from "@/components/auth/auth-page";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | SMCT Request Form",
  description: "Sign in to your SMCT Request Form account.",
};

export default function LoginPage() {
  return (
    <AuthPage
      id="login-title"
      eyebrow="Good to see you again"
      title="Welcome"
      accent="back"
      description="Sign in to your account to continue to your workplace."
      backLink={{ href: "/", label: "Back to home" }}
      compact
    >
      <LoginForm />
    </AuthPage>
  );
}
