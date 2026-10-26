"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { dashboardFor, signIn } from "@/lib/auth";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import SubmitButton from "@/components/ui/submit-button";
import TextLink from "@/components/ui/text-link";

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "We couldn’t reach the sign-in service. Please check your connection and try again.";
  if (error.status === 419) return "Your sign-in session expired. Please reload and try again.";
  if (error.status === 429) return error.message || "Too many attempts. Please wait before trying again.";
  if (error.status === 503) return "Sign in is temporarily unavailable. Please try again later.";
  if (error.status >= 500) return "We couldn’t complete your sign-in. Please try again later.";
  return error.message;
}

export default function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitting = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || signedIn) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true;
    setPending(true);
    setMessage("");
    setErrors({});

    try {
      const user = await signIn({
        // The reference names this field email even for usernames and employee IDs.
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
      setSignedIn(true);
      router.replace(dashboardFor(user));
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(error.errors).map(([name, messages]) => [name, messages[0]])));
      }
      setMessage(loginErrorMessage(error));
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  function dismissError() {
    setMessage("");
    setErrors({});
    document.getElementById("login-email")?.focus();
  }

  return (
    <>
      {message && <FormAlert ref={alertRef} message={message} onDismiss={dismissError} />}
      <form
        id="login-form"
        aria-label="Sign in to your account"
        aria-busy={pending}
        className="mt-8 space-y-6"
        onSubmit={submit}
        onChange={(event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement)) return;
          setErrors((current) => ({ ...current, [target.name]: "" }));
        }}
      >
        <fieldset disabled={pending || signedIn} className="min-w-0 space-y-6">
          <legend className="sr-only">Sign-in details</legend>
          <FormField
            id="login-email"
            name="email"
            label="Email / username / employee ID"
            placeholder="Enter your email, username, or employee ID"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={50}
            error={errors.email}
            required
          />
          <FormField
            id="login-password"
            name="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            minLength={5}
            maxLength={20}
            error={errors.password}
            labelAction={<TextLink href="/forgot-password">Forgot password?</TextLink>}
            required
          />
          <SubmitButton pending={pending} pendingLabel="Signing in…" disabled={signedIn}>
            {signedIn ? "Opening your dashboard…" : "Sign In"}
          </SubmitButton>
        </fieldset>
        {signedIn && <p role="status" className="text-center text-base leading-7 text-muted">Signed in. Opening your dashboard…</p>}
      </form>
      <p className="mt-6 text-center text-base leading-7 text-muted">
        Don’t have an account? <TextLink href="/registration">Create one</TextLink>
      </p>
      <p className="mt-4 text-center text-sm leading-6 text-muted">
        Newly registered? Your account must be verified by an administrator before you can sign in.
      </p>
    </>
  );
}
