"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BranchSelector from "@/components/admin/branch-heads/branch-selector";
import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api";
import {
  branchHeadName,
  getAvailableBranchHeadBranches,
  updateBranchHeadAssignment,
  type BranchHeadAssignment,
  type BranchHeadBranch,
  type PaginationMeta,
} from "@/lib/admin/branch-heads";

type EditBranchHeadDialogProps = {
  assignment: BranchHeadAssignment;
  onClose: () => void;
  onUpdated: (message: string) => void;
  onStale: () => void;
};

const emptyMeta: PaginationMeta = { current_page: 1, per_page: 10, total: 0, last_page: 1, from: null, to: null };

export default function EditBranchHeadDialog({ assignment, onClose, onUpdated, onStale }: EditBranchHeadDialogProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(() => new Map(assignment.branches.map((branch) => [branch.id, branch])));
  const [records, setRecords] = useState<BranchHeadBranch[]>([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadMessage, setLoadMessage] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => setStatus("loading"), 0);

    getAvailableBranchHeadBranches(
      { search: debouncedSearch, page, pageSize, sort: "branch_code", direction: "asc" },
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return;
      setRecords(result.records);
      setMeta(result.meta);
      setStatus("ready");
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        onClose();
        return;
      }
      if (error instanceof ApiError && error.status === 403) setLoadMessage("You don’t have permission to view available branches.");
      else if (error instanceof ApiError && error.status === 429) setLoadMessage("Too many requests. Wait a moment, then try again.");
      else setLoadMessage("We couldn’t load available branches. Check your connection and try again.");
      setStatus("error");
    });

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [attempt, debouncedSearch, onClose, page, pageSize, router]);

  function toggle(branch: BranchHeadBranch) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(branch.id)) next.delete(branch.id);
      else next.set(branch.id, branch);
      return next;
    });
    setMessage("");
  }

  async function submit() {
    if (inFlight.current || blocked || selected.size === 0) return;
    inFlight.current = true;
    setSaving(true);
    setMessage("");

    try {
      const response = await updateBranchHeadAssignment(assignment.id, { branch_ids: [...selected.keys()] });
      onUpdated(response.message);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        onClose();
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        setBlocked(true);
        setMessage("This assignment no longer exists. Close this dialog to view the refreshed list.");
        onStale();
      } else if (error instanceof ApiError && error.status === 409) {
        setBlocked(true);
        setMessage("Branch availability changed. Close this dialog, refresh the assignment, and review its branches again.");
      } else if (error instanceof ApiError && error.status === 422) {
        setMessage("Select at least one branch and make sure every selected branch is still available.");
      } else if (error instanceof ApiError && error.status === 403) {
        setBlocked(true);
        setMessage("You don’t have permission to update this assignment.");
      } else if (error instanceof ApiError && error.status === 429) {
        setMessage("Too many requests. Wait a moment, then try again.");
      } else {
        setBlocked(true);
        setMessage("We couldn’t confirm whether the update finished. Close this dialog and refresh the list before trying again.");
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
      title="Edit Branch Head branches"
      onClose={onClose}
      dismissible={!saving}
      maxWidth="5xl"
      footer={
        <>
          <button type="button" disabled={saving} onClick={onClose} className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50">{blocked ? "Close" : "Cancel"}</button>
          {!blocked && <button type="button" disabled={saving || selected.size === 0} onClick={submit} aria-busy={saving} className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-50">{saving ? "Saving…" : "Save branches"}</button>}
        </>
      }
    >
      <div className="mb-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-muted">Branch Head</p>
        <p className="mt-1 text-base font-semibold">{branchHeadName(assignment.user)}</p>
        <p className="mt-1 text-sm text-muted">{assignment.user.position}</p>
      </div>
      <p className="mb-5 text-sm leading-6 text-muted">The Branch Head identity cannot be changed here. Saving sends the complete selected branch set.</p>
      {message && <FormAlert ref={alertRef} message={message} />}
      <BranchSelector branches={records} currentBranches={assignment.branches} meta={meta} loading={status === "loading"} error={status === "error" ? loadMessage : ""} search={search} selected={selected} page={page} pageSize={pageSize} onSearchChange={(value) => { setSearch(value); setPage(1); }} onToggle={toggle} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} onRetry={() => setAttempt((value) => value + 1)} />
      {selected.size === 0 && <p role="alert" className="mt-4 text-sm font-medium text-danger">Select at least one branch before saving.</p>}
    </Modal>
  );
}

