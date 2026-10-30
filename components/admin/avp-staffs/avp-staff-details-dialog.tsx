"use client";

import Modal from "@/components/ui/modal";
import {
  avpStaffPersonName,
  type AvpStaffAssignment,
} from "@/lib/admin/avp-staffs";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not provided" : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AvpStaffDetailsDialog({ assignment, onClose }: { assignment: AvpStaffAssignment; onClose: () => void }) {
  return (
    <Modal open title="AVP Staff assignment details" onClose={onClose} maxWidth="3xl">
      <div className="grid gap-5 sm:grid-cols-2">
        <div><p className="text-sm text-muted">AVP Finance</p><p className="mt-1 text-lg font-semibold wrap-anywhere">{avpStaffPersonName(assignment.avp)}</p><p className="text-sm text-muted wrap-anywhere">{assignment.avp.position}</p></div>
        <div><p className="text-sm text-muted">Delegated staff</p><p className="mt-1 text-lg font-semibold wrap-anywhere">{avpStaffPersonName(assignment.staff)}</p><p className="text-sm text-muted wrap-anywhere">{assignment.staff.position}</p></div>
      </div>
      <section className="mt-7 border-t border-line/60 pt-6">
        <h3 className="text-lg font-semibold">Assigned branches ({assignment.branches.length})</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {assignment.branches.map((branch) => <li key={branch.id} className="rounded-xl border border-line/60 bg-slate-50 p-3"><p className="font-medium wrap-anywhere">{branch.branch_code} — {branch.branch_name}</p><p className="mt-1 text-sm text-muted wrap-anywhere">{branch.branch} · {branch.acronym}</p></li>)}
        </ul>
      </section>
      <dl className="mt-7 grid gap-5 border-t border-line/60 pt-6 sm:grid-cols-2">
        <div><dt className="text-sm text-muted">Created</dt><dd className="mt-1 font-medium">{formatDate(assignment.created_at)}</dd></div>
        <div><dt className="text-sm text-muted">Last updated</dt><dd className="mt-1 font-medium">{formatDate(assignment.updated_at)}</dd></div>
      </dl>
    </Modal>
  );
}
