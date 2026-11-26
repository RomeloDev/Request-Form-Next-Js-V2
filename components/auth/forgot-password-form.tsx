"use client";

import { useRef, useState, type FormEvent } from "react";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import SubmitButton from "@/components/ui/submit-button";
import { ApiError } from "@/lib/api";
import { requestPasswordReset } from "@/lib/password-reset";

const genericSuccess =
  "If an account exists for that email, a password reset link has been sent.";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    inFlight.current = true;
    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await requestPasswordReset(email);
      setMessage(response.message || genericSuccess);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 422) {
        setError(failure.errors.email?.[0] ?? "Enter a valid email address.");
      } else if (failure instanceof ApiError && failure.status === 429) {
        setError("Too many reset requests. Wait a minute, then try again.");
      } else if (failure instanceof ApiError && failure.status === 419) {
        setError("Your reset session expired. Reload the page and try again.");
      } else {
        setError("We couldn’t request a password reset. Check your connection and try again.");
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <>
      {error && <FormAlert ref={alertRef} message={error} />}
      <form
        aria-label="Request a password reset"
        aria-busy={pending}
        className="mt-6 space-y-5"
        onSubmit={submit}
      >
        <fieldset disabled={pending || Boolean(message)} className="min-w-0 space-y-5">
          <legend className="sr-only">Password reset email</legend>
          <FormField
            id="forgot-password-email"
            name="email"
            label="Email address"
            type="email"
            placeholder="Enter your registered email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={255}
            value={email}
            error={error ? "Check the message above." : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            required
          />
          <SubmitButton pending={pending} pendingLabel="Sending reset link…">
            Send reset link
          </SubmitButton>
        </fieldset>

        {message && (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            {message} Check your inbox and spam folder.
          </p>
        )}
      </form>
    </>
  );
}
