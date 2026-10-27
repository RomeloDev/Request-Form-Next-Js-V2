"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import FormField from "@/components/ui/form-field";
import FormAlert from "@/components/ui/form-alert";
import { ApiError } from "@/lib/api";
import {
  createPosition,
  updatePosition,
  type PositionRecord,
} from "@/lib/admin/positions";

type PositionFormDialogProps = {
  position?: PositionRecord;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export default function PositionFormDialog({
  position,
  onClose,
  onSaved,
}: PositionFormDialogProps) {
  const router = useRouter();
  const formId = useId();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(position?.label ?? "");
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inFlight.current || blocked) return;

    inFlight.current = true;
    setSaving(true);
    setFieldError("");
    setMessage("");

    try {
      const enteredName = name.trim();

      const response = position
        ? await updatePosition(position.id, enteredName)
        : await createPosition(enteredName);

      onSaved(response.message);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 422) {
        const field = position ? "label" : "value";

        setFieldError(
          error.errors[field]?.[0] ?? "Check the position name.",
        );
        setMessage("Please check the position name.");
      } else {
        setBlocked(true);

        if (error instanceof ApiError && error.status === 403) {
          setMessage("You don’t have permission to save this position.");
        } else if (error instanceof ApiError && error.status === 404) {
          setMessage(
            position
              ? "This position is no longer available. Close and refresh the list."
              : "Position creation is unavailable. Close and refresh the page.",
          );
        } else if (error instanceof ApiError && error.status === 419) {
          setMessage("Your session needs refreshing. Reload the page and try again.");
        } else {
          setMessage(
            "We couldn’t confirm whether the changes were saved. " +
            "Close and refresh the list before trying again.",
          );
        }
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={position ? "Edit position" : "Add position"}
      onClose={onClose}
      dismissible={!saving}
      footer={
        <>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
          >
            {blocked ? "Close" : "Cancel"}
          </button>

          <button
            type="submit"
            form={formId}
            disabled={saving || blocked}
            aria-busy={saving}
            className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : position
                ? "Save changes"
                : "Add position"}
          </button>
        </>
      }
    >
      {message && (
        <FormAlert ref={alertRef} message={message} />
      )}

      <form
        id={formId}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <FormField
          id={`${formId}-name`}
          label="Position name"
          required
          maxLength={255}
          disabled={saving || blocked}
          value={name}
          error={fieldError}
          hint={
            position
              ? "Renaming keeps existing user assignments and access unchanged."
              : "Choose a unique position name."
          }
          onChange={(event) => {
            setName(event.target.value);
            setFieldError("");
          }}
        />
      </form>
    </Modal>
  );
}