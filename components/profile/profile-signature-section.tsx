"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad, {
  type SignaturePadHandle,
} from "@/components/auth/signature-pad";
import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import {
  getProfileSignature,
  removeProfileSignature,
  updateProfileSignature,
} from "@/lib/profile";
import {
  isSessionExpired,
  profileFailureMessage,
  profileFieldErrors,
} from "./profile-errors";
import { useProtectedImage } from "./use-protected-image";

export default function ProfileSignatureSection({
  initialHasSignature,
}: {
  initialHasSignature: boolean;
}) {
  const router = useRouter();
  const [hasSignature, setHasSignature] = useState(initialHasSignature);
  const [editing, setEditing] = useState(!initialHasSignature);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [signatureError, setSignatureError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const signature = useProtectedImage(hasSignature, getProfileSignature);
  const pad = useRef<SignaturePadHandle>(null);
  const mutationRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (signature.status === "expired") router.replace("/login");
  }, [signature.status, router]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      mutationRef.current?.abort();
    };
  }, []);

  function startEditing() {
    if (inFlight.current) return;

    setSignatureError("");
    setMessage("");
    setNotice("");
    setEditing(true);
  }

  function stopEditing() {
    if (saving || removing) return;

    setEditing(false);
    setSignatureError("");
    setMessage("");
  }

  async function saveSignature() {
    if (inFlight.current) return;

    // Reserve the mutation before the async canvas encode so a double click
    // cannot start two uploads.
    inFlight.current = true;
    setSaving(true);
    setSignatureError("");
    setMessage("");
    setNotice("");

    let file: File | null = null;

    try {
      file = (await pad.current?.getFile()) ?? null;
    } catch {
      inFlight.current = false;

      if (!mountedRef.current) return;

      setSaving(false);
      setSignatureError(
        "We couldn’t prepare the signature image. Try again.",
      );
      return;
    }

    // The component may have unmounted while the canvas encoded the PNG.
    if (!mountedRef.current) {
      inFlight.current = false;
      return;
    }

    // Never submit an empty canvas. SignaturePad returns null when no
    // stroke was drawn, and the PNG File stays a binary PNG, not a data URL.
    if (file === null) {
      inFlight.current = false;
      setSaving(false);
      setSignatureError("Draw your signature before saving.");
      return;
    }

    const controller = new AbortController();
    mutationRef.current = controller;

    try {
      const result = await updateProfileSignature(
        file,
        controller.signal,
      );

      if (controller.signal.aborted) return;

      // Only a successful backend response changes the local flag.
      setHasSignature(result.has_signature);

      if (result.has_signature) {
        signature.reload();
      } else {
        signature.clear();
      }

      setEditing(false);
      setNotice(result.message);
    } catch (error) {
      if (controller.signal.aborted) return;

      if (isSessionExpired(error)) {
        router.replace("/login");
        return;
      }

      const fields = profileFieldErrors(error);
      const fieldMessage = fields.signature ?? "";
      const validationFailure =
        error instanceof ApiError && error.status === 422;

      setSignatureError(fieldMessage);
      setMessage(
        fieldMessage
          ? "Please check the signature image and try again."
          : validationFailure
            ? "The signature could not be accepted. Draw it again and retry."
            : profileFailureMessage(
                error,
                "We couldn’t update your signature. Try again.",
              ),
      );
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;

      if (mutationRef.current === controller) {
        mutationRef.current = null;
      }

      if (!controller.signal.aborted) setSaving(false);
    }
  }

  function openRemovalConfirmation() {
    if (inFlight.current) return;

    setRemoveError("");
    setMessage("");
    setSignatureError("");
    setNotice("");
    setConfirmingRemoval(true);
  }

  function closeRemovalConfirmation() {
    if (removing) return;

    setConfirmingRemoval(false);
    setRemoveError("");
  }

  async function confirmRemoval() {
    if (inFlight.current) return;

    const controller = new AbortController();
    mutationRef.current = controller;
    inFlight.current = true;
    setRemoving(true);
    setRemoveError("");

    try {
      const result = await removeProfileSignature(controller.signal);

      if (controller.signal.aborted) return;

      // Only a confirmed backend response changes the local state.
      setHasSignature(result.has_signature);
      signature.clear();
      setEditing(true);
      setConfirmingRemoval(false);
      setNotice(result.message);
    } catch (error) {
      if (controller.signal.aborted) return;

      if (isSessionExpired(error)) {
        router.replace("/login");
        return;
      }

      setRemoveError(
        profileFailureMessage(
          error,
          "We couldn’t remove your signature. Try again.",
        ),
      );
    } finally {
      inFlight.current = false;

      if (mutationRef.current === controller) {
        mutationRef.current = null;
      }

      if (!controller.signal.aborted) setRemoving(false);
    }
  }

  const previewFailed =
    signature.status === "ready" &&
    signature.url !== null &&
    brokenUrl === signature.url;

  const busy = saving || removing;

  return (
    <section
      aria-labelledby="profile-signature-title"
      className="flex flex-col rounded-2xl border border-line/60 bg-white p-5 shadow-sm sm:p-6"
    >
      <div>
        <h2
          id="profile-signature-title"
          className="text-xl font-semibold text-ink"
        >
          Signature
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Your signature is stored as a PNG and loaded privately through your
          own account. It is never shared through a public link.
        </p>
      </div>

      {hasSignature && !editing && (
        <div className="mt-5">
          {signature.status === "ready" &&
          signature.url !== null &&
          !previewFailed ? (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <Image
                src={signature.url}
                alt="Your saved signature"
                width={640}
                height={240}
                unoptimized
                onError={() => {
                  if (signature.url !== null) {
                    setBrokenUrl(signature.url);
                  }
                }}
                className="h-40 w-full object-contain p-2"
              />
            </div>
          ) : signature.status === "loading" ? (
            <p
              role="status"
              className="grid h-40 place-items-center rounded-xl border border-line bg-slate-50 px-4 text-center text-sm leading-6 text-muted"
            >
              Loading your signature…
            </p>
          ) : signature.status === "missing" ? (
            <p
              role="status"
              className="grid h-40 place-items-center rounded-xl border border-dashed border-line bg-slate-50 px-4 text-center text-sm leading-6 text-muted"
            >
              No stored signature file was found. Draw a replacement below.
            </p>
          ) : (
            <div className="grid h-40 place-items-center rounded-xl border border-line bg-slate-50 px-4 text-center">
              <div>
                <p role="status" className="text-sm leading-6 text-muted">
                  Your saved signature couldn’t be loaded.
                </p>
                <button
                  type="button"
                  onClick={signature.reload}
                  className="mt-2 min-h-11 rounded-lg px-2 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Try loading it again
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startEditing}
              disabled={busy}
              className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium text-ink enabled:hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Draw replacement
            </button>
            <button
              type="button"
              onClick={openRemovalConfirmation}
              disabled={busy}
              className="min-h-12 rounded-xl border border-rose-200 bg-white px-5 py-3 text-base font-medium text-rose-700 enabled:hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Remove signature
            </button>
          </div>
        </div>
      )}

      {!hasSignature && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-dashed border-line bg-slate-50 p-3 text-sm leading-6 text-muted"
        >
          No signature on file yet. Draw your signature below and save it to
          add one.
        </p>
      )}

      {editing && (
        <div className="mt-5 rounded-2xl border border-line/60 bg-slate-50/50 p-4">
          <SignaturePad
            ref={pad}
            disabled={busy}
            error={signatureError}
            onChange={() => {
              // Editing the pad clears stale errors from an earlier save.
              setSignatureError("");
              setMessage("");
            }}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveSignature}
              disabled={busy}
              aria-busy={saving}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
            >
              {saving ? "Saving…" : "Save signature"}
            </button>

            {hasSignature && (
              <button
                type="button"
                onClick={stopEditing}
                disabled={busy}
                className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium text-ink enabled:hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Cancel
              </button>
            )}
          </div>

          {saving && (
            <p role="status" className="mt-3 text-sm leading-6 text-muted">
              Saving your signature. Please wait.
            </p>
          )}
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900"
        >
          {notice}
        </p>
      )}

      {message && <FormAlert ref={alertRef} message={message} />}

      {confirmingRemoval && (
        <Modal
          open
          title="Remove signature"
          onClose={closeRemovalConfirmation}
          dismissible={!removing}
          maxWidth="md"
          footer={
            <>
              <button
                type="button"
                disabled={removing}
                onClick={closeRemovalConfirmation}
                className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
              >
                Keep signature
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={confirmRemoval}
                aria-busy={removing}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                {removing ? "Removing…" : "Remove signature"}
              </button>
            </>
          }
        >
          <p className="text-base leading-7 text-ink">
            Remove your saved signature?
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Requests that need your signature may no longer be available until
            you add a new one. This cannot be undone.
          </p>
          {removing && (
            <p role="status" className="mt-4 text-sm leading-6 text-muted">
              Removing your signature. Please wait.
            </p>
          )}
          {removeError && <FormAlert message={removeError} />}
        </Modal>
      )}
    </section>
  );
}
