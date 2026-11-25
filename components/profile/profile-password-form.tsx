"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import SubmitButton from "@/components/ui/submit-button";
import { changeProfilePassword } from "@/lib/profile";
import {
  isSessionExpired,
  profileFailureMessage,
  profileFieldErrors,
} from "./profile-errors";

const fieldIds = {
  current_password: "profile-current-password",
  new_password: "profile-new-password",
  new_password_confirmation: "profile-new-password-confirmation",
} as const;

/**
 * Self-service password change for the signed-in account. Laravel owns the
 * password policy; this form only checks that every field is present and that
 * the two new-password fields match before calling the API.
 */
export default function ProfilePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const mutationRef = useRef<AbortController | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Password values live only in this component's memory and are dropped
  // when the section unmounts. Any in-flight request is aborted too.
  useEffect(
    () => () => {
      mutationRef.current?.abort();
    },
    [],
  );

  function clearFieldError(name: keyof typeof fieldIds) {
    setFieldErrors((current) => {
      if (!current[name]) return current;

      return { ...current, [name]: "" };
    });
    setMessage("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inFlight.current) return;

    const errors: Record<string, string> = {};

    if (currentPassword.length === 0) {
      errors.current_password = "Enter your current password.";
    }

    if (newPassword.length === 0) {
      errors.new_password = "Enter a new password.";
    }

    if (confirmation.length === 0) {
      errors.new_password_confirmation = "Confirm your new password.";
    } else if (newPassword !== confirmation) {
      errors.new_password_confirmation =
        "The new password and confirmation do not match.";
    }

    setFieldErrors(errors);
    setMessage("");
    setSuccess("");

    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0] as keyof typeof fieldIds;
      document.getElementById(fieldIds[firstField])?.focus();
      return;
    }

    const controller = new AbortController();
    mutationRef.current = controller;
    inFlight.current = true;
    setPending(true);

    try {
      const result = await changeProfilePassword(
        {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: confirmation,
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      // Never keep password values after a successful change.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setFieldErrors({});
      setSuccess(result.message);
    } catch (error) {
      if (controller.signal.aborted) return;

      if (isSessionExpired(error)) {
        router.replace("/login");
        return;
      }

      const fields = profileFieldErrors(error);
      const mappedErrors = {
        current_password: fields.current_password ?? "",
        new_password: fields.new_password ?? "",
        new_password_confirmation:
          fields.new_password_confirmation ?? "",
      };

      if (
        mappedErrors.current_password ||
        mappedErrors.new_password ||
        mappedErrors.new_password_confirmation
      ) {
        setFieldErrors(mappedErrors);
        setMessage(
          "Please check the highlighted fields. Your password was not changed.",
        );
      } else {
        setMessage(
          profileFailureMessage(
            error,
            "We couldn’t change your password. Try again.",
          ),
        );
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;

      if (mutationRef.current === controller) {
        mutationRef.current = null;
      }

      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="profile-password-title"
      className="max-w-3xl rounded-2xl border border-line/60 bg-white p-4 shadow-sm sm:p-5"
    >
      <div>
        <h2
          id="profile-password-title"
          className="text-lg font-semibold text-ink"
        >
          Change password
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Choose a new password for your own account. The server validates the
          final password rules.
        </p>
      </div>

      <form
        className="mt-4 space-y-4"
        aria-busy={pending}
        onSubmit={handleSubmit}
        noValidate
      >
        <fieldset disabled={pending} className="min-w-0 space-y-4">
          <legend className="sr-only">Password change details</legend>

          <FormField
            id={fieldIds.current_password}
            name="current_password"
            label="Current password"
            type="password"
            placeholder="Enter your current password"
            autoComplete="current-password"
            value={currentPassword}
            error={fieldErrors.current_password}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              clearFieldError("current_password");
            }}
            required
          />

          <FormField
            id={fieldIds.new_password}
            name="new_password"
            label="New password"
            type="password"
            placeholder="Enter your new password"
            autoComplete="new-password"
            value={newPassword}
            error={fieldErrors.new_password}
            hint="The new password and confirmation must match."
            onChange={(event) => {
              setNewPassword(event.target.value);
              clearFieldError("new_password");
              // A new value may resolve a previous confirmation mismatch.
              clearFieldError("new_password_confirmation");
            }}
            required
          />

          <FormField
            id={fieldIds.new_password_confirmation}
            name="new_password_confirmation"
            label="Confirm new password"
            type="password"
            placeholder="Enter your new password again"
            autoComplete="new-password"
            value={confirmation}
            error={fieldErrors.new_password_confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
              clearFieldError("new_password_confirmation");
            }}
            required
          />
        </fieldset>

        <SubmitButton pending={pending} pendingLabel="Changing password…">
          Change password
        </SubmitButton>

        {pending && (
          <p role="status" className="text-sm leading-6 text-muted">
            Updating your password. Please wait.
          </p>
        )}

        {success && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"
          >
            {success} Use your new password the next time you sign in.
          </p>
        )}

        {message && <FormAlert ref={alertRef} message={message} />}
      </form>
    </section>
  );
}
