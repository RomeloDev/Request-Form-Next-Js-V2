"use client";

import Image from "next/image";
import { useState } from "react";
import Modal from "@/components/ui/modal";
import StatusBadge from "@/components/ui/status-badge";
import { branchCodeFor, publicStorageUrl, userFullName, type AdminUser } from "@/lib/admin/users";

function StoredImage({ path, kind }: { path: string | null; kind: "photo" | "signature" }) {
  const [failed, setFailed] = useState(false);
  const src = publicStorageUrl(path);
  if (!src || failed) {
    return <div className={`grid place-items-center rounded-xl border border-dashed border-line bg-slate-50 p-4 text-center text-sm leading-6 text-muted ${kind === "photo" ? "size-24 shrink-0" : "min-h-32 w-full"}`}>
      {failed ? "Image unavailable" : kind === "photo" ? "No photo" : "No signature provided"}
    </div>;
  }
  return <Image src={src} unoptimized width={kind === "photo" ? 96 : 600} height={kind === "photo" ? 96 : 200} alt={kind === "photo" ? "User profile photo" : "User signature"} onError={() => setFailed(true)} className={kind === "photo" ? "size-24 shrink-0 rounded-xl border border-line object-cover" : "h-40 w-full rounded-xl border border-line bg-white p-3 object-contain"} />;
}

export default function UserDetailsDialog({ user, branchCodes, onClose }: { user: AdminUser | null; branchCodes: Record<string, string>; onClose: () => void }) {
  const date = user?.email_verified_at ? new Date(user.email_verified_at) : null;
  return (
    <Modal open={Boolean(user)} title="User information" onClose={onClose}>
      {user && (
        <>
          <div className="flex flex-wrap items-center gap-5 border-b border-line/60 pb-6">
            <StoredImage key={`photo-${user.id}-${user.profile_picture}`} path={user.profile_picture} kind="photo" />
            <div className="min-w-0 flex-1">
              <h3 className="text-2xl leading-tight font-semibold wrap-anywhere">{userFullName(user)}</h3>
              <p className="mt-1 text-base leading-7 wrap-anywhere text-muted">@{user.username}</p>
              <div className="mt-3"><StatusBadge status={user.verification_status} /></div>
            </div>
          </div>
          <dl className="my-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              ["User ID", user.id], ["Employee ID", user.employee_id],
              ["First name", user.firstname], ["Last name", user.lastname],
              ["Email address", user.email], ["Contact number", user.contact],
              ["Role", user.role], ["Position", user.position],
              ["Branch code", branchCodeFor(user, branchCodes)], ["Branch / company", user.branch],
              ["Verification date", date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "Not Verified"],
            ].map(([label, value]) => <div key={label}><dt className="text-sm leading-6 text-muted">{label}</dt><dd className="mt-1 text-base leading-7 font-medium wrap-anywhere">{value || "Not provided"}</dd></div>)}
          </dl>
          <section aria-labelledby="user-signature-title" className="border-t border-line/60 pt-6">
            <h3 id="user-signature-title" className="mb-3 text-base font-semibold">Signature</h3>
            <StoredImage key={`signature-${user.id}-${user.signature}`} path={user.signature} kind="signature" />
          </section>
        </>
      )}
    </Modal>
  );
}
