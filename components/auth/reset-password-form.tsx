"use client";

import { useRef, useState, type FormEvent } from "react";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import SubmitButton from "@/components/ui/submit-button";
import TextLink from "@/components/ui/text-link";
import { ApiError } from "@/lib/api";
import { resetPassword } from "@/lib/password-reset";

export default function ResetPasswordForm({
  email,
  token,
  invalidLink,
}: {
  email: string;
  token: string;
  invalidLink: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  if (invalidLink) {
    return (
      <div className="mt-6 space-y-5">
        <FormAlert message="This password reset link is incomplete or invalid." />
        <p className="text-center text-sm leading-6 text-muted">
          <TextLink href="/forgot-password">Request a new reset link</TextLink>
        </p>
      </div>
    );
  }

  function clearError(name: string) {
    setErrors((current) => ({ ...current, [name]: "" }));
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || success) return;

    if (password !== confirmation) {
      setErrors({ password_confirmation: "The passwords do not match." });
      setMessage("Please check the highlighted fields.");
      return;
    }

    inFlight.current = true;
    setPending(true);
    setErrors({});
    setMessage("");

    try {
      const response = await resetPassword({
        email,
        token,
        password,
        password_confirmation: confirmation,
      });

      setPassword("");
      setConfirmation("");
      setSuccess(response.message);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 422) {
        setErrors(Object.fromEntries(
          Object.entries(failure.errors).map(([name, values]) => [name, values[0]]),
        ));
        setMessage(failure.message || "This reset link could not be used.");
      } else if (failure instanceof ApiError && failure.status === 429) {
        setMessage("Too many reset attempts. Wait a minute, then try again.");
      } else if (failure instanceof ApiError && failure.status === 419) {
        setMessage("Your reset session expired. Reload the page and try again.");
      } else {
        setMessage("We couldn’t reset your password. Check your connection and try again.");
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form
      aria-label="Choose a new password"
      aria-busy={pending}
      className="mt-6 space-y-5"
      onSubmit={submit}
    >
      {message && <FormAlert ref={alertRef} message={message} />}

      <fieldset disabled={pending || Boolean(success)} className="min-w-0 space-y-5">
        <legend className="sr-only">New password details</legend>
        <FormField
          id="reset-password-email"
          label="Email address"
          type="email"
          value={email}
          readOnly
          autoComplete="email"
          className="bg-slate-100/70"
        />
        <FormField
          id="reset-password"
          name="password"
          label="New password"
          type="password"
          placeholder="Enter your new password"
          autoComplete="new-password"
          minLength={8}
          maxLength={255}
          value={password}
          error={errors.password}
          hint="Use at least 8 characters."
          onChange={(event) => {
            setPassword(event.target.value);
            clearError("password");
            clearError("password_confirmation");
          }}
          required
        />
        <FormField
          id="reset-password-confirmation"
          name="password_confirmation"
          label="Confirm new password"
          type="password"
          placeholder="Enter your new password again"
          autoComplete="new-password"
          minLength={8}
          maxLength={255}
          value={confirmation}
          error={errors.password_confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            clearError("password_confirmation");
          }}
          required
        />
        <SubmitButton pending={pending} pendingLabel="Resetting password…">
          Reset password
        </SubmitButton>
      </fieldset>

      {success && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          {success} <TextLink href="/login">Sign in with your new password</TextLink>.
        </p>
      )}

      {!success && (
        <p className="text-center text-sm leading-6 text-muted">
          <TextLink href="/forgot-password">Request another reset link</TextLink>
        </p>
      )}
    </form>
  );
}
