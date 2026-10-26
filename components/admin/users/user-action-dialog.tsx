"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import Icon from "@/components/ui/icon";
import FormAlert from "@/components/ui/form-alert";
import { ApiError } from "@/lib/api";
import { deleteUser, userFullName, verifyUser, type AdminUser } from "@/lib/admin/users";

export type UserAction = "verify" | "delete";

export default function UserActionDialog({ action, user, onClose, onSuccess, onStale }: {
  action: UserAction; user: AdminUser; onClose: () => void; onSuccess: (message: string) => void; onStale: () => void;
}) {
  const deleting = action === "delete";
  const router = useRouter();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(true);

  async function confirm() {
    if (inFlight.current || !canRetry) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await (deleting ? deleteUser(user.id) : verifyUser(user.id));
      onSuccess(response.message);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        onClose();
        return;
      }
      if (error instanceof ApiError && (error.status === 404 || (!deleting && error.status === 409))) {
        setError(error.message);
        setCanRetry(false);
        onStale();
      } else if (error instanceof ApiError && error.status === 419) {
        setError("Your session needs to be refreshed. Reload the page and try again.");
        setCanRetry(false);
      } else if (error instanceof ApiError && error.status === 403) {
        setError(`You don’t have permission to ${action} this account.`);
        setCanRetry(false);
      } else {
        setError(`We couldn’t confirm whether ${deleting ? "deletion" : "verification"} finished. Refresh the users list to check the account before trying again.`);
        setCanRetry(false);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <Modal open title={deleting ? "Delete user account" : "Verify user account"} onClose={onClose} dismissible={!busy} footer={<>
    <button type="button" disabled={busy} onClick={onClose} className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50">{canRetry ? "Cancel" : "Close"}</button>
    {canRetry && <button type="button" disabled={busy} onClick={confirm} aria-busy={busy} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait ${deleting ? "bg-rose-700 enabled:hover:bg-rose-800 focus-visible:outline-rose-700" : "bg-emerald-700 enabled:hover:bg-emerald-800 focus-visible:outline-emerald-700"}`}><Icon name={busy ? "refresh" : deleting ? "trash" : "shieldCheck"} className={`size-5 ${busy ? "motion-safe:animate-spin" : ""}`} />{busy ? deleting ? "Deleting…" : "Verifying…" : deleting ? "Delete account" : "Verify account"}</button>}
  </>}>
    <div className="flex items-start gap-4">
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl border ${deleting ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}><Icon name={deleting ? "trash" : "shieldCheck"} className="size-6" /></span>
      <div className="min-w-0"><p className="text-lg leading-7 font-semibold wrap-anywhere">{deleting ? "Delete" : "Verify"} {userFullName(user)}?</p><p className="mt-2 text-base leading-7 text-muted">{deleting ? "This permanently deletes this user account. This action cannot be undone." : "This approves the account so this person can sign in."}</p></div>
    </div>
    <dl className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-base"><div><dt className="text-sm text-muted">Email address</dt><dd className="mt-1 font-medium wrap-anywhere">{user.email || "Not provided"}</dd></div><div><dt className="text-sm text-muted">Employee ID</dt><dd className="mt-1 font-medium wrap-anywhere">{user.employee_id || "Not provided"}</dd></div></dl>
    {busy && <p role="status" className="mt-4 text-sm leading-6 text-muted">{deleting ? "Deleting account." : "Saving verification."} Please keep this dialog open.</p>}
    {error && <FormAlert message={error} />}
  </Modal>;
}
