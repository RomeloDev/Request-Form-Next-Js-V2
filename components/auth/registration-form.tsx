"use client";

import TextLink from "@/components/ui/text-link";
import FormAlert from "@/components/ui/form-alert";
import SubmitButton from "@/components/ui/submit-button";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { loadRegistrationOptions, registerAccount, type RegistrationOptions } from "@/lib/registration";
import FormField from "@/components/ui/form-field";
import FormSection from "@/components/ui/form-section";
import FormSelect from "@/components/ui/form-select";
import SignaturePad, { type SignaturePadHandle } from "@/components/auth/signature-pad";

type LookupState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: RegistrationOptions };

export default function RegistrationForm() {
  const router = useRouter();
  const [lookup, setLookup] = useState<LookupState>({ status: "loading" });
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [branchId, setBranchId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const signatureRef = useRef<SignaturePadHandle>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadRegistrationOptions(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setLookup({ status: "ready", data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLookup({ status: "error" });
      });
    return () => controller.abort();
  }, [retryAttempt]);

  useEffect(() => () => {
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
  }, []);

  const options = lookup.status === "ready" ? lookup.data : null;
  const selectedBranch = options?.branches.find((branch) => String(branch.id) === branchId);
  const hasOptions = Boolean(options?.branches.length && options?.positions.length);
  const locked = busy || succeeded;

  function clearError(name: string) {
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function showErrors(nextErrors: Record<string, string>, nextMessage: string) {
    setErrors(nextErrors);
    setMessage(nextMessage);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  function retryLookups() {
    setLookup({ status: "loading" });
    setBranchId("");
    setRetryAttempt((attempt) => attempt + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || succeeded) return;

    // Capture values before disabling fields; disabled controls are excluded from FormData.
    const data = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};
    if (data.get("password") !== data.get("confirmPassword")) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!hasOptions || !selectedBranch) {
      nextErrors.branch_code = "Choose an available branch before continuing.";
    }
    if (Object.keys(nextErrors).length) {
      showErrors(nextErrors, "Please check the highlighted fields.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    setMessage("");
    setErrors({});

    try {
      const signature = await signatureRef.current?.getFile();
      if (!signature) {
        showErrors({ signature: "Please draw your signature." }, "Your signature is required to create an account.");
        return;
      }
      if (signature.size > 3 * 1024 * 1024) {
        showErrors({ signature: "The signature must be no larger than 3 MB." }, "Please clear your signature and try again.");
        return;
      }

      data.set("signature", signature);
      data.set("branch", selectedBranch!.branch);
      // Match the reference screen's existing name formatting.
      for (const name of ["firstName", "lastName"]) {
        data.set(name, String(data.get(name)).replace(/\b\w+/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase()));
      }

      const response = await registerAccount(data);
      if (!response.status || typeof response.token !== "string" || !response.token) {
        throw new ApiError(502, "Unexpected registration response.");
      }
      // Retain the reference token behavior; login remains a separate step.
      try { localStorage.setItem("token", response.token); } catch { /* Registration already succeeded if storage is unavailable. */ }
      setSucceeded(true);
      redirectTimer.current = setTimeout(() => router.push("/login"), 2000);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const fieldErrors = Object.fromEntries(Object.entries(error.errors).map(([name, messages]) => [name, messages[0]]));
        showErrors(fieldErrors, "Please check the highlighted fields.");
      } else if (error instanceof ApiError && error.status === 429) {
        showErrors({}, "Too many attempts. Please wait a minute before trying again.");
      } else {
        showErrors({}, "We couldn’t confirm your registration. Check your connection and whether your account was created before trying again.");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      {message && (
        <FormAlert ref={summaryRef} message={message}>
          {Object.keys(errors).length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6">
              {Object.entries(errors).map(([name, error]) => (
                <li key={name}><a href={`#${name}`} className="underline underline-offset-2">{error}</a></li>
              ))}
            </ul>
          )}
        </FormAlert>
      )}

      <form
        id="registration-form"
        className="mt-6 focus:outline-none"
        aria-label="Create your account"
        aria-busy={busy}
        tabIndex={-1}
        onSubmit={submit}
        onChange={(event) => {
          const target = event.target;
          if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) clearError(target.name);
        }}
      >
        <FormSection
          disabled={locked}
          number="01"
          title="Personal information"
          description="A little introduction, so we know it’s you."
        >
          <FormField
            id="firstName"
            name="firstName"
            error={errors.firstName}
            label="First name"
            placeholder="First name"
            autoComplete="given-name"
            maxLength={30}
            required
          />
          <FormField
            id="lastName"
            name="lastName"
            error={errors.lastName}
            label="Last name"
            placeholder="Last name"
            autoComplete="family-name"
            maxLength={30}
            required
          />
          <FormField
            id="employee_id"
            name="employee_id"
            error={errors.employee_id}
            label="Employee ID"
            placeholder="Your employee ID"
            minLength={2}
            maxLength={30}
            required
          />
          <FormField
            id="contact"
            name="contact"
            error={errors.contact}
            label="Contact number"
            type="tel"
            placeholder="09XXXXXXXXX"
            autoComplete="tel"
            inputMode="numeric"
            pattern="[0-9]{11}"
            maxLength={11}
            hint="11 digits, including the leading zero."
            required
          />
        </FormSection>

        <FormSection
          disabled={locked}
          number="02"
          title="Account details"
          description="The details you’ll use to sign in."
        >
          <FormField
            id="userName"
            name="userName"
            error={errors.userName}
            label="Username"
            placeholder="Choose a username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={5}
            maxLength={20}
            hint="Lowercase letters, numbers, _ or -."
            required
          />
          <FormField
            id="email"
            name="email"
            error={errors.email}
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <FormField
            id="password"
            name="password"
            error={errors.password}
            label="Password"
            type="password"
            placeholder="Create a password"
            autoComplete="new-password"
            minLength={8}
            maxLength={20}
            hint="Use 8–20 characters."
            required
          />
          <FormField
            id="confirmPassword"
            name="confirmPassword"
            error={errors.confirmPassword}
            label="Confirm password"
            type="password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            minLength={8}
            maxLength={20}
            required
          />
        </FormSection>

        <FormSection number="03" title="Work information" description="Choose your position and the branch you belong to." disabled={locked}>
          {lookup.status === "loading" && (
            <p role="status" className="text-base leading-7 text-muted sm:col-span-2">Loading positions and branches…</p>
          )}
          {lookup.status === "error" && (
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base leading-7 text-amber-950 sm:col-span-2">
              <p>We couldn’t load positions and branches. Please try again.</p>
              <button type="button" onClick={retryLookups} className="mt-2 min-h-11 rounded-lg px-1 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Try again</button>
            </div>
          )}
          {options && !hasOptions && (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base leading-7 text-amber-950 sm:col-span-2">
              {!options.positions.length ? "No positions are available. " : ""}
              {!options.branches.length ? "No branches are available. " : ""}
              Please contact your administrator before registering.
            </p>
          )}
          <FormSelect id="position" name="position" label="Position" defaultValue="" required disabled={lookup.status !== "ready" || !options?.positions.length} error={errors.position}>
            <option value="" disabled>Select your position</option>
            {options?.positions.map((position) => <option key={position.id} value={position.value}>{position.label}</option>)}
          </FormSelect>
          <FormSelect id="branch_code" name="branch_code" label="Branch code" value={branchId} onChange={(event) => setBranchId(event.target.value)} required disabled={lookup.status !== "ready" || !options?.branches.length} error={errors.branch_code}>
            <option value="" disabled>Select your branch</option>
            {options?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code}</option>)}
          </FormSelect>
          <div className="sm:col-span-2">
            <FormField id="branch" name="branch" label="Branch / company" placeholder="Filled automatically when you select a branch" value={selectedBranch?.branch ?? ""} readOnly required error={errors.branch} hint="This follows your selected branch code." className="bg-slate-100/70" />
          </div>
        </FormSection>

        <FormSection number="04" title="Signature" description="Add the signature you’ll use for your requests." disabled={locked}>
          <SignaturePad ref={signatureRef} disabled={locked} error={errors.signature} onChange={() => clearError("signature")} />
        </FormSection>

        <div className="mt-8 border-t border-line/70 pt-8">
          {succeeded && (
            <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-base leading-7 text-emerald-900">
              Account created successfully. Redirecting you to sign in…
            </p>
          )}
          <SubmitButton pending={busy} pendingLabel="Creating account…" disabled={locked || !hasOptions}>
            {succeeded ? "Account created" : "Create Account"}
          </SubmitButton>
          <p className="mt-5 text-center text-base leading-7 text-muted">
            Already have an account?{" "}
            <TextLink href="/login">Sign In</TextLink>
          </p>
        </div>
      </form>
    </>
  );
}
