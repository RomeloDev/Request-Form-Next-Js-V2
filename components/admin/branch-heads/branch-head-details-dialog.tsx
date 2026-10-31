"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import {
  branchHeadName,
  getBranchHeadAssignment,
  type BranchHeadAssignment,
} from "@/lib/admin/branch-heads";

type BranchHeadDetailsDialogProps = {
  assignmentId: number;
  onClose: () => void;
  onStale: () => void;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not provided" : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function BranchHeadDetailsDialog({ assignmentId, onClose, onStale }: BranchHeadDetailsDialogProps) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<BranchHeadAssignment | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    getBranchHeadAssignment(assignmentId, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setAssignment(response.data);
      setLoading(false);
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        onClose();
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        setMessage("This assignment no longer exists. Close this dialog to view the refreshed list.");
        onStale();
      } else if (error instanceof ApiError && error.status === 403) {
        setMessage("You don’t have permission to view this assignment.");
      } else if (error instanceof ApiError && error.status === 429) {
        setMessage("Too many requests. Wait a moment, then close and try again.");
      } else {
        setMessage("We couldn’t load the latest assignment details. Close this dialog and try again.");
      }
      setLoading(false);
    });

    return () => controller.abort();
  }, [assignmentId, onClose, onStale, router]);

  return (
    <Modal open title="Branch Head assignment details" onClose={onClose} maxWidth="2xl">
      {loading ? (
        <p role="status" className="py-10 text-center text-muted">Loading assignment details…</p>
      ) : message ? (
        <FormAlert message={message} />
      ) : assignment ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-line/60 bg-slate-50 p-5">
            <p className="text-sm font-medium text-muted">BRANCH HEAD</p>
            <h3 className="mt-2 text-xl font-semibold wrap-anywhere">{branchHeadName(assignment.user)}</h3>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Position</dt><dd className="mt-1 font-medium wrap-anywhere">{assignment.user.position || "Not provided"}</dd></div>
              <div><dt className="text-muted">Home branch / company</dt><dd className="mt-1 font-medium wrap-anywhere">{assignment.user.branch ?? assignment.user.branch_code ?? "Not assigned"}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="assigned-branch-details-title">
            <h3 id="assigned-branch-details-title" className="text-lg font-semibold">Assigned branches</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {assignment.branches.map((branch) => (
                <div key={branch.id} className="rounded-xl border border-line/60 p-4">
                  <p className="font-semibold wrap-anywhere">{branch.branch_code} — {branch.branch_name}</p>
                  <p className="mt-1 text-sm text-muted wrap-anywhere">{branch.branch} · {branch.acronym}</p>
                </div>
              ))}
            </div>
          </section>

          <dl className="grid gap-4 border-t border-line/60 pt-5 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Created</dt><dd className="mt-1 font-medium">{formatDate(assignment.created_at)}</dd></div>
            <div><dt className="text-muted">Last updated</dt><dd className="mt-1 font-medium">{formatDate(assignment.updated_at)}</dd></div>
          </dl>
        </div>
      ) : null}
    </Modal>
  );
}

