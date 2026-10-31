"use client";

import Icon from "@/components/ui/icon";
import Modal from "@/components/ui/modal";

type LogoutConfirmationDialogProps = {
  open: boolean;
  accountName: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Shared sign-out confirmation for every authenticated workspace role. */
export default function LogoutConfirmationDialog({
  open,
  accountName,
  pending,
  onCancel,
  onConfirm,
}: LogoutConfirmationDialogProps) {
  if (!open) return null;

  return (
    <Modal
      open
      title="Sign out of your account?"
      onClose={onCancel}
      dismissible={!pending}
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
          >
            Stay signed in
          </button>
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={onConfirm}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 font-semibold text-white enabled:hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-60"
          >
            <Icon name="logout" />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-700">
          <Icon name="logout" className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-base leading-7 text-ink">
            You are about to sign out <strong className="wrap-anywhere">{accountName}</strong> from the SMCT Request Form.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            You will need to enter your credentials again to return to your workspace.
          </p>
          {pending && <p role="status" className="mt-4 text-sm font-medium text-muted">Securely ending your Laravel session. Please wait.</p>}
        </div>
      </div>
    </Modal>
  );
}

