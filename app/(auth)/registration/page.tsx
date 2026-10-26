import type { Metadata } from "next";
import AuthPage from "@/components/auth/auth-page";
import RegistrationForm from "@/components/auth/registration-form";

export const metadata: Metadata = {
  title: "Create your account | SMCT Request Form",
  description: "Create your SMCT Request Form account.",
};

export default function RegistrationPage() {
  return (
    <AuthPage
      id="registration-title"
      eyebrow="Let’s get you started"
      title="Create your"
      accent="account"
      description="Welcome to SMCT Request Form. Start with a few details about you."
    >
      <p className="mt-6 text-sm leading-6 text-muted sm:text-right">
        Fields marked <span aria-hidden="true" className="text-danger">*</span> are required.
      </p>
      <RegistrationForm />
    </AuthPage>
  );
}
