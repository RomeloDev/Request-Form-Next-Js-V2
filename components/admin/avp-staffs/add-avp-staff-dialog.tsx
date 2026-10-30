"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import FormAlert from "@/components/ui/form-alert";
import CandidateSelector from "@/components/admin/avp-staffs/candidate-selector";
import BranchSelector from "@/components/admin/avp-staffs/branch-selector";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api";
import {
  avpStaffPersonName,
  createAvpStaffAssignment,
  getAvailableBranches,
  getAvpCandidates,
  getStaffCandidates,
  type AvpStaffBranch,
  type AvpStaffCandidate,
  type PaginationMeta,
} from "@/lib/admin/avp-staffs";

type AddAvpStaffDialogProps = {
  onClose: () => void;
  onCreated: (message: string) => void;
};

const emptyMeta: PaginationMeta = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};

function loadError(error: unknown, label: string): string {
  if (error instanceof ApiError && error.status === 403) return `You don’t have permission to view ${label}.`;
  if (error instanceof ApiError && error.status === 429) return "Too many requests. Wait a moment, then try again.";
  if (error instanceof ApiError && error.status === 419) return "Your session needs refreshing. Reload the page and try again.";
  return `We couldn’t load ${label}. Check your connection and try again.`;
}

export default function AddAvpStaffDialog({ onClose, onCreated }: AddAvpStaffDialogProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [selectedAvp, setSelectedAvp] = useState<AvpStaffCandidate | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<AvpStaffCandidate | null>(null);
  const [selectedBranches, setSelectedBranches] = useState(new Map<number, AvpStaffBranch>());
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");

  const [avpRecords, setAvpRecords] = useState<AvpStaffCandidate[]>([]);
  const [avpMeta, setAvpMeta] = useState(emptyMeta);
  const [avpSearch, setAvpSearch] = useState("");
  const avpDebounced = useDebouncedValue(avpSearch.trim(), 400);
  const [avpPage, setAvpPage] = useState(1);
  const [avpPageSize, setAvpPageSize] = useState(10);
  const [avpStatus, setAvpStatus] = useState<"loading" | "ready" | "error">("loading");
  const [avpError, setAvpError] = useState("");
  const [avpAttempt, setAvpAttempt] = useState(0);

  const [staffRecords, setStaffRecords] = useState<AvpStaffCandidate[]>([]);
  const [staffMeta, setStaffMeta] = useState(emptyMeta);
  const [staffSearch, setStaffSearch] = useState("");
  const staffDebounced = useDebouncedValue(staffSearch.trim(), 400);
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(10);
  const [staffStatus, setStaffStatus] = useState<"loading" | "ready" | "error">("loading");
  const [staffError, setStaffError] = useState("");
  const [staffAttempt, setStaffAttempt] = useState(0);

  const [branchRecords, setBranchRecords] = useState<AvpStaffBranch[]>([]);
  const [branchMeta, setBranchMeta] = useState(emptyMeta);
  const [branchSearch, setBranchSearch] = useState("");
  const branchDebounced = useDebouncedValue(branchSearch.trim(), 400);
  const [branchPage, setBranchPage] = useState(1);
  const [branchPageSize, setBranchPageSize] = useState(10);
  const [branchStatus, setBranchStatus] = useState<"loading" | "ready" | "error">("loading");
  const [branchError, setBranchError] = useState("");
  const [branchAttempt, setBranchAttempt] = useState(0);

  useEffect(() => {
    if (stage !== 1) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => setAvpStatus("loading"), 0);
    getAvpCandidates({ search: avpDebounced, page: avpPage, pageSize: avpPageSize, sort: "firstname", direction: "asc" }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setAvpRecords(result.records);
        setAvpMeta(result.meta);
        setAvpStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          onClose();
          return;
        }
        setAvpError(loadError(error, "AVP candidates"));
        setAvpStatus("error");
      });
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [avpAttempt, avpDebounced, avpPage, avpPageSize, onClose, router, stage]);

  useEffect(() => {
    if (stage !== 2 || !selectedAvp) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => setStaffStatus("loading"), 0);
    getStaffCandidates(selectedAvp.id, { search: staffDebounced, page: staffPage, pageSize: staffPageSize, sort: "firstname", direction: "asc" }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setStaffRecords(result.records);
        setStaffMeta(result.meta);
        setStaffStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          onClose();
          return;
        }
        setStaffError(loadError(error, "staff candidates"));
        setStaffStatus("error");
      });
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [onClose, router, selectedAvp, staffAttempt, staffDebounced, staffPage, staffPageSize, stage]);

  useEffect(() => {
    if (stage !== 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => setBranchStatus("loading"), 0);
    getAvailableBranches({ search: branchDebounced, page: branchPage, pageSize: branchPageSize, sort: "branch_code", direction: "asc" }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setBranchRecords(result.records);
        setBranchMeta(result.meta);
        setBranchStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          onClose();
          return;
        }
        setBranchError(loadError(error, "available branches"));
        setBranchStatus("error");
      });
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [branchAttempt, branchDebounced, branchPage, branchPageSize, onClose, router, stage]);

  function chooseAvp(candidate: AvpStaffCandidate) {
    if (selectedAvp?.id !== candidate.id) {
      setSelectedStaff(null);
      setSelectedBranches(new Map());
      setStaffSearch("");
      setStaffPage(1);
    }
    setSelectedAvp(candidate);
    setMessage("");
  }

  function toggleBranch(branch: AvpStaffBranch) {
    setSelectedBranches((current) => {
      const next = new Map(current);
      if (next.has(branch.id)) next.delete(branch.id);
      else next.set(branch.id, branch);
      return next;
    });
    setMessage("");
  }

  async function submit() {
    if (inFlight.current || blocked || !selectedAvp || !selectedStaff || selectedBranches.size === 0) return;
    inFlight.current = true;
    setSubmitting(true);
    setMessage("");

    try {
      const response = await createAvpStaffAssignment({
        avp_user_id: selectedAvp.id,
        staff_user_id: selectedStaff.id,
        branch_ids: [...selectedBranches.keys()],
      });
      onCreated(response.message);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        setSelectedStaff(null);
        setSelectedBranches(new Map());
        setStaffAttempt((value) => value + 1);
        setBranchAttempt((value) => value + 1);
        setStage(2);
        setMessage("Eligibility or branch availability changed. Select an eligible staff member again, then review the refreshed branches.");
      } else if (error instanceof ApiError && error.status === 422) {
        const fields = Object.keys(error.errors);
        if (fields.some((field) => field.startsWith("avp_user_id"))) setStage(1);
        else if (fields.some((field) => field.startsWith("staff_user_id"))) setStage(2);
        else setStage(3);
        setMessage("Review the highlighted step. One or more selections are no longer valid.");
      } else if (error instanceof ApiError && error.status === 403) {
        setBlocked(true);
        setMessage("You don’t have permission to create this assignment.");
      } else if (error instanceof ApiError && error.status === 419) {
        setBlocked(true);
        setMessage("Your session needs refreshing. Reload the page before trying again.");
      } else if (error instanceof ApiError && error.status === 429) {
        setMessage("Too many requests. Wait a moment, then try again.");
      } else {
        setBlocked(true);
        setMessage("We couldn’t confirm whether the assignment was created. Close this dialog and refresh the list before trying again.");
      }
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const nextDisabled = stage === 1 ? !selectedAvp : stage === 2 ? !selectedStaff : selectedBranches.size === 0;

  return (
    <Modal
      open
      title="Add AVP Staff assignment"
      onClose={onClose}
      dismissible={!submitting}
      maxWidth="5xl"
      footer={
        <>
          <button type="button" disabled={submitting} onClick={stage === 1 || blocked ? onClose : () => setStage((stage - 1) as 1 | 2)} className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50">
            {stage === 1 || blocked ? "Close" : "Back"}
          </button>
          {!blocked && stage < 3 && (
            <button type="button" disabled={nextDisabled} onClick={() => setStage((stage + 1) as 2 | 3)} className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Continue</button>
          )}
          {!blocked && stage === 3 && (
            <button type="button" disabled={submitting || nextDisabled} aria-busy={submitting} onClick={submit} className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-50">{submitting ? "Saving…" : "Create assignment"}</button>
          )}
        </>
      }
    >
      <ol className="mb-6 grid gap-2 sm:grid-cols-3" aria-label="Assignment steps">
        {["Select AVP", "Select staff", "Assign branches"].map((label, index) => {
          const number = index + 1;
          return <li key={label} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${stage === number ? "border-blue-300 bg-blue-50 text-blue-800" : stage > number ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-line text-muted"}`}>{number}. {label}</li>;
        })}
      </ol>

      {message && <FormAlert ref={alertRef} message={message} />}

      {stage === 1 && (
        <CandidateSelector id="avp" label="AVP Finance candidates" searchPlaceholder="Name, position, or branch" candidates={avpRecords} meta={avpMeta} loading={avpStatus === "loading"} error={avpStatus === "error" ? avpError : ""} search={avpSearch} selected={selectedAvp} page={avpPage} pageSize={avpPageSize} onSearchChange={(value) => { setAvpSearch(value); setAvpPage(1); }} onSelect={chooseAvp} onPageChange={setAvpPage} onPageSizeChange={(size) => { setAvpPageSize(size); setAvpPage(1); }} onRetry={() => setAvpAttempt((value) => value + 1)} />
      )}

      {stage === 2 && selectedAvp && (
        <div className="space-y-4">
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">AVP Finance: <strong className="text-ink">{avpStaffPersonName(selectedAvp)}</strong></p>
          <CandidateSelector id="staff" label="Eligible staff candidates" searchPlaceholder="Name, position, or branch" candidates={staffRecords} meta={staffMeta} loading={staffStatus === "loading"} error={staffStatus === "error" ? staffError : ""} search={staffSearch} selected={selectedStaff} page={staffPage} pageSize={staffPageSize} onSearchChange={(value) => { setStaffSearch(value); setStaffPage(1); }} onSelect={(candidate) => { setSelectedStaff(candidate); setSelectedBranches(new Map()); setMessage(""); }} onPageChange={setStaffPage} onPageSizeChange={(size) => { setStaffPageSize(size); setStaffPage(1); }} onRetry={() => setStaffAttempt((value) => value + 1)} />
        </div>
      )}

      {stage === 3 && selectedAvp && selectedStaff && (
        <div className="space-y-5">
          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <p className="text-sm text-muted">AVP Finance<br /><strong className="text-base text-ink">{avpStaffPersonName(selectedAvp)}</strong></p>
            <p className="text-sm text-muted">Delegated staff<br /><strong className="text-base text-ink">{avpStaffPersonName(selectedStaff)}</strong></p>
          </div>
          <BranchSelector id="add-branches" branches={branchRecords} meta={branchMeta} loading={branchStatus === "loading"} error={branchStatus === "error" ? branchError : ""} search={branchSearch} selected={selectedBranches} page={branchPage} pageSize={branchPageSize} onSearchChange={(value) => { setBranchSearch(value); setBranchPage(1); }} onToggle={toggleBranch} onPageChange={setBranchPage} onPageSizeChange={(size) => { setBranchPageSize(size); setBranchPage(1); }} onRetry={() => setBranchAttempt((value) => value + 1)} />
        </div>
      )}
    </Modal>
  );
}
