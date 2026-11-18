"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import {
  getProfilePicture,
  PROFILE_PICTURE_CHANGED_EVENT,
  removeProfilePicture,
  updateProfilePicture,
} from "@/lib/profile";
import ProfileAvatar from "./profile-avatar";
import {
  isSessionExpired,
  profileFailureMessage,
  profileFieldErrors,
} from "./profile-errors";
import { useProtectedImage } from "./use-protected-image";

// These checks only improve the immediate experience. Laravel validates the
// uploaded file again (type, dimensions, and size) and remains authoritative.
const maximumPictureBytes = 2 * 1024 * 1024;

type SelectedPicture = {
  file: File;
  previewUrl: string;
};

export default function ProfilePictureSection({
  name,
  initialHasProfilePicture,
}: {
  name: string;
  initialHasProfilePicture: boolean;
}) {
  const router = useRouter();
  const [hasPicture, setHasPicture] = useState(initialHasProfilePicture);
  const picture = useProtectedImage(hasPicture, getProfilePicture);
  const [selected, setSelected] = useState<SelectedPicture | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [fileError, setFileError] = useState("");
  const [message, setMessage] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<SelectedPicture | null>(null);
  const mutationRef = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (picture.status === "expired") router.replace("/login");
  }, [picture.status, router]);

  useEffect(
    () => () => {
      mutationRef.current?.abort();

      if (selectedRef.current !== null) {
        URL.revokeObjectURL(selectedRef.current.previewUrl);
        selectedRef.current = null;
      }
    },
    [],
  );

  function releaseSelection() {
    if (selectedRef.current !== null) {
      URL.revokeObjectURL(selectedRef.current.previewUrl);
      selectedRef.current = null;
    }

    setSelected(null);

    if (fileInput.current) fileInput.current.value = "";
  }

  function cancelSelection() {
    releaseSelection();
    setFileError("");
    setMessage("");
    setNotice("");
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setFileError("");
    setMessage("");
    setNotice("");

    if (!file) {
      releaseSelection();
      return;
    }

    const type = file.type.toLowerCase();
    const allowedType =
      type === "image/jpeg" ||
      type === "image/jpg" ||
      type === "image/png";
    const allowedExtension = /\.(jpe?g|png)$/i.test(file.name);

    // Browsers occasionally report an empty MIME type for a valid local
    // file, so the extension is a fallback. Laravel still inspects the file
    // content and remains authoritative.
    if (!allowedType && !allowedExtension) {
      releaseSelection();
      setFileError("Choose a JPEG or PNG image.");
      return;
    }

    if (file.size > maximumPictureBytes) {
      releaseSelection();
      setFileError("The image must be 2 MB or smaller.");
      return;
    }

    if (selectedRef.current !== null) {
      URL.revokeObjectURL(selectedRef.current.previewUrl);
    }

    const next = {
      file,
      previewUrl: URL.createObjectURL(file),
    };

    selectedRef.current = next;
    setSelected(next);
  }

  async function uploadPicture() {
    if (selected === null || inFlight.current) return;

    const controller = new AbortController();
    mutationRef.current = controller;
    inFlight.current = true;
    setUploading(true);
    setFileError("");
    setMessage("");
    setNotice("");

    try {
      const result = await updateProfilePicture(
        selected.file,
        controller.signal,
      );

      if (controller.signal.aborted) return;

      // The server success flag is the only source for this local flag.
      setHasPicture(result.has_profile_picture);

      if (result.has_profile_picture) {
        picture.reload();
      } else {
        picture.clear();
      }

      releaseSelection();
      setNotice(result.message);
      window.dispatchEvent(new Event(PROFILE_PICTURE_CHANGED_EVENT));
    } catch (error) {
      if (controller.signal.aborted) return;

      if (isSessionExpired(error)) {
        router.replace("/login");
        return;
      }

      const fields = profileFieldErrors(error);
      const fieldMessage = fields.profile_picture ?? "";
      const validationFailure =
        error instanceof ApiError && error.status === 422;

      setFileError(fieldMessage);
      setMessage(
        fieldMessage
          ? "Please check the selected image and try again."
          : validationFailure
            ? "The image could not be accepted. Check the file and try again."
            : profileFailureMessage(
                error,
                "We couldn’t update your profile picture. Try again.",
              ),
      );
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;

      if (mutationRef.current === controller) {
        mutationRef.current = null;
      }

      if (!controller.signal.aborted) setUploading(false);
    }
  }

  function openRemovalConfirmation() {
    if (inFlight.current) return;

    setRemoveError("");
    setMessage("");
    setFileError("");
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
      const result = await removeProfilePicture(controller.signal);

      if (controller.signal.aborted) return;

      // Only a confirmed backend response changes the local state.
      setHasPicture(result.has_profile_picture);
      picture.clear();
      releaseSelection();
      setConfirmingRemoval(false);
      setNotice(result.message);
      window.dispatchEvent(new Event(PROFILE_PICTURE_CHANGED_EVENT));
    } catch (error) {
      if (controller.signal.aborted) return;

      if (isSessionExpired(error)) {
        router.replace("/login");
        return;
      }

      setRemoveError(
        profileFailureMessage(
          error,
          "We couldn’t remove your profile picture. Try again.",
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

  const previewUrl =
    selected?.previewUrl ??
    (picture.status === "ready" ? picture.url : null);

  const busy = uploading || removing;

  return (
    <section
      aria-labelledby="profile-picture-title"
      className="flex flex-col rounded-2xl border border-line/60 bg-white p-5 shadow-sm sm:p-6"
    >
      <div>
        <h2
          id="profile-picture-title"
          className="text-xl font-semibold text-ink"
        >
          Profile picture
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Your picture is loaded privately through your own account. JPEG or
          PNG, up to 2 MB.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <ProfileAvatar
          name={name}
          imageUrl={previewUrl}
          alt={
            selected
              ? "Preview of the profile picture you selected"
              : undefined
          }
        />

        <div className="min-w-0 flex-1">
          {selected ? (
            <p className="text-sm leading-6 wrap-anywhere text-ink">
              Selected:{" "}
              <span className="font-medium">{selected.file.name}</span>
            </p>
          ) : picture.status === "loading" ? (
            <p role="status" className="text-sm leading-6 text-muted">
              Loading your profile picture…
            </p>
          ) : picture.status === "missing" ? (
            <p role="status" className="text-sm leading-6 text-muted">
              No stored picture file was found. Upload a new one below.
            </p>
          ) : picture.status === "error" ? (
            <div>
              <p role="status" className="text-sm leading-6 text-muted">
                Your saved picture couldn’t be loaded.
              </p>
              <button
                type="button"
                onClick={picture.reload}
                className="mt-2 min-h-11 rounded-lg px-2 text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Try loading it again
              </button>
            </div>
          ) : hasPicture ? (
            <p className="text-sm leading-6 text-muted">
              Your picture is loaded privately from your own account.
            </p>
          ) : (
            <p className="text-sm leading-6 text-muted">
              No profile picture yet. The initials avatar is shown until you
              upload one.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label
            htmlFor="profile-picture-file"
            className="block text-base leading-6 font-medium text-ink"
          >
            Choose a new picture
          </label>
          <input
            ref={fileInput}
            id="profile-picture-file"
            name="profile_picture"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            disabled={busy}
            aria-invalid={fileError ? true : undefined}
            aria-describedby={`profile-picture-hint${
              fileError ? " profile-picture-file-error" : ""
            }`}
            onChange={chooseFile}
            className="mt-2 block min-h-12 w-full min-w-0 cursor-pointer rounded-xl border border-line bg-slate-50/50 p-2 text-sm text-ink file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand hover:file:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          />
          <p
            id="profile-picture-hint"
            className="mt-2 text-sm leading-6 text-muted"
          >
            Only JPEG and PNG files are accepted. The server checks the file
            type, dimensions, and size again.
          </p>
          {fileError && (
            <p
              id="profile-picture-file-error"
              className="mt-2 text-sm leading-6 wrap-anywhere text-danger"
            >
              {fileError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={uploadPicture}
            disabled={selected === null || busy}
            aria-busy={uploading}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
          >
            {uploading ? "Uploading…" : "Upload picture"}
          </button>

          <button
            type="button"
            onClick={cancelSelection}
            disabled={selected === null || busy}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium text-ink enabled:hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Cancel
          </button>

          {hasPicture && (
            <button
              type="button"
              onClick={openRemovalConfirmation}
              disabled={busy}
              className="min-h-12 rounded-xl border border-rose-200 bg-white px-5 py-3 text-base font-medium text-rose-700 enabled:hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Remove picture
            </button>
          )}
        </div>

        {uploading && (
          <p role="status" className="text-sm leading-6 text-muted">
            Uploading your profile picture. Please wait.
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900"
          >
            {notice}
          </p>
        )}

        {message && <FormAlert ref={alertRef} message={message} />}
      </div>

      {confirmingRemoval && (
        <Modal
          open
          title="Remove profile picture"
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
                Keep picture
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={confirmRemoval}
                aria-busy={removing}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                {removing ? "Removing…" : "Remove picture"}
              </button>
            </>
          }
        >
          <p className="text-base leading-7 text-ink">
            Remove your current profile picture?
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            The initials avatar will be shown until you upload a new picture.
            This cannot be undone.
          </p>
          {removing && (
            <p role="status" className="mt-4 text-sm leading-6 text-muted">
              Removing your profile picture. Please wait.
            </p>
          )}
          {removeError && <FormAlert message={removeError} />}
        </Modal>
      )}
    </section>
  );
}
