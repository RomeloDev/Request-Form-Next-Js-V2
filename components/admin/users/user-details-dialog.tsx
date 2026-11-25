"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminUserProtectedMedia from "@/components/admin/users/admin-user-protected-media";
import Modal from "@/components/ui/modal";
import StatusBadge from "@/components/ui/status-badge";
import { branchCodeFor, userFullName, type AdminUser } from "@/lib/admin/users";

export default function UserDetailsDialog({ user, branchCodes, onClose }: { user: AdminUser | null; branchCodes: Record<string, string>; onClose: () => void }) {
  const router = useRouter();
  const date = user?.email_verified_at ? new Date(user.email_verified_at) : null;
  const handleSessionExpired = useCallback(() => {
    onClose();
    router.replace("/login");
  }, [onClose, router]);

  return (
    <Modal open={Boolean(user)} title="User information" onClose={onClose}>
      {user && (
        <>
          <div className="flex flex-wrap items-center gap-5 border-b border-line/60 pb-6">
            <AdminUserProtectedMedia
              key={`photo-${user.id}-${user.has_profile_picture}`}
              userId={user.id}
              available={user.has_profile_picture}
              kind="photo"
              onSessionExpired={handleSessionExpired}
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-2xl leading-tight font-semibold wrap-anywhere">{userFullName(user)}</h3>
              <p className="mt-1 text-sm leading-6 wrap-anywhere text-muted">@{user.username}</p>
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
            ].map(([label, value]) => <div key={label}><dt className="text-sm leading-6 text-muted">{label}</dt><dd className="mt-1 text-sm leading-6 font-medium wrap-anywhere">{value || "Not provided"}</dd></div>)}
          </dl>
          <section aria-labelledby="user-signature-title" className="border-t border-line/60 pt-6">
            <h3 id="user-signature-title" className="mb-3 text-base font-semibold">Signature</h3>
            <AdminUserProtectedMedia
              key={`signature-${user.id}-${user.has_signature}`}
              userId={user.id}
              available={user.has_signature}
              kind="signature"
              onSessionExpired={handleSessionExpired}
            />
          </section>
        </>
      )}
    </Modal>
  );
}
