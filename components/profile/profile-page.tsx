"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layouts/page-header";
import FormAlert from "@/components/ui/form-alert";
import { ApiError } from "@/lib/api";
import { getUserProfile, type UserProfile } from "@/lib/profile";
import { isSessionExpired } from "./profile-errors";
import ProfileIdentityOverview from "./profile-identity-overview";
import ProfilePasswordForm from "./profile-password-form";
import ProfilePictureSection from "./profile-picture-section";
import ProfileSignatureSection from "./profile-signature-section";

type ProfileLoadState = "loading" | "ready" | "error" | "denied";

function profileLoadMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "We couldn’t load your profile. Check your connection and try again.";
  }

  if (error.status === 429) {
    return "Too many attempts. Wait a moment, then try again.";
  }

  if (error.status >= 500) {
    return "The profile service is temporarily unavailable. Please try again later.";
  }

  return "We couldn’t load your profile. Please try again.";
}

function ProfileLoadingState() {
  return (
    <section
      aria-labelledby="profile-loading-title"
      aria-busy="true"
      className="rounded-2xl border border-line/60 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 id="profile-loading-title" className="sr-only">
        Loading your profile
      </h2>
      <p role="status" className="text-base leading-7 text-muted">
        Loading your profile…
      </p>
      <div
        aria-hidden="true"
        className="mt-5 grid animate-pulse grid-cols-1 gap-4 motion-reduce:animate-none sm:grid-cols-2 xl:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-20 rounded-xl bg-slate-100"
          />
        ))}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<ProfileLoadState>("loading");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    getUserProfile(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;

        setProfile(result);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        if (isSessionExpired(error)) {
          router.replace("/login");
          return;
        }

        if (error instanceof ApiError && error.status === 403) {
          setProfile(null);
          setState("denied");
          return;
        }

        // Drop any previously rendered profile so a failed request never
        // leaves stale identity data on screen.
        setProfile(null);
        setState("error");
        setMessage(profileLoadMessage(error));
        requestAnimationFrame(() => alertRef.current?.focus());
      });

    return () => controller.abort();
  }, [attempt, router]);

  function retry() {
    if (state === "loading") return;

    setProfile(null);
    setMessage("");
    setState("loading");
    setAttempt((value) => value + 1);
  }

  const displayName =
    profile === null
      ? "Your account"
      : profile.name.trim() ||
        `${profile.firstName} ${profile.lastName}`.trim() ||
        "Your account";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="MY ACCOUNT"
        title="Profile"
        description="Review the identity details your administrator maintains, and manage the picture, signature, and password tied to your own account."
      />

      {state === "loading" && <ProfileLoadingState />}

      {state === "error" && (
        <FormAlert ref={alertRef} message={message}>
          <button
            type="button"
            onClick={retry}
            className="mt-3 min-h-11 rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-danger hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            Try again
          </button>
        </FormAlert>
      )}

      {state === "denied" && (
        <section
          aria-labelledby="profile-denied-title"
          className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-7"
        >
          <p className="text-sm font-medium text-brand">ACCESS RESTRICTED</p>
          <h2
            id="profile-denied-title"
            className="mt-3 text-2xl font-semibold"
          >
            Profile access is not available
          </h2>
          <p className="mt-3 text-base leading-7 text-muted">
            Your account doesn’t have permission to view this profile. If you
            believe this is a mistake, contact an administrator.
          </p>
        </section>
      )}

      {state === "ready" && profile !== null && (
        <>
          <p role="status" className="sr-only">
            Your profile has loaded.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <ProfilePictureSection
              name={displayName}
              initialHasProfilePicture={profile.has_profile_picture}
            />
            <ProfilePasswordForm />
          </div>

          <ProfileIdentityOverview profile={profile} />

          <ProfileSignatureSection
            initialHasSignature={profile.has_signature}
          />
        </>
      )}
    </div>
  );
}
