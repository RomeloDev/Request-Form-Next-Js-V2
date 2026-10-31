"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CandidateSelector from "@/components/admin/branch-heads/candidate-selector";
import BranchSelector from "@/components/admin/branch-heads/branch-selector";
import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api";
import {
  branchHeadName,
  createBranchHeadAssignment,
  getAvailableBranchHeadBranches,
  getBranchHeadCandidates,
  type BranchHeadBranch,
  type BranchHeadCandidate,
  type PaginationMeta,
} from "@/lib/admin/branch-heads";

type AddBranchHeadDialogProps = {
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
  return `We couldn’t load ${label}. Check your connection and try again.`;
}

export default function AddBranchHeadDialog({ onClose, onCreated }: AddBranchHeadDialogProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<1 | 2>(1);
  const [selectedCandidate, setSelectedCandidate] = useState<BranchHeadCandidate | null>(null);
  const [selectedBranches, setSelectedBranches] = useState(new Map<number, BranchHeadBranch>());
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");

  const [candidateRecords, setCandidateRecords] = useState<BranchHeadCandidate[]>([]);
  const [candidateMeta, setCandidateMeta] = useState(emptyMeta);
  const [candidateSearch, setCandidateSearch] = useState("");
  const candidateDebounced = useDebouncedValue(candidateSearch.trim(), 400);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidatePageSize, setCandidatePageSize] = useState(10);
  const [candidateStatus, setCandidateStatus] = useState<"loading" | "ready" | "error">("loading");
  const [candidateError, setCandidateError] = useState("");
  const [candidateAttempt, setCandidateAttempt] = useState(0);

  const [branchRecords, setBranchRecords] = useState<BranchHeadBranch[]>([]);
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
    const timer = window.setTimeout(() => setCandidateStatus("loading"), 0);

    getBranchHeadCandidates(
      { search: candidateDebounced, page: candidatePage, pageSize: candidatePageSize, sort: "firstname", direction: "asc" },
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return;
      setCandidateRecords(result.records);
      setCandidateMeta(result.meta);
      setCandidateStatus("ready");
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        onClose();
        return;
      }
      setCandidateError(loadError(error, "Branch Head candidates"));
      setCandidateStatus("error");
    });

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [candidateAttempt, candidateDebounced, candidatePage, candidatePageSize, onClose, router, stage]);

  useEffect(() => {
    if (stage !== 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => setBranchStatus("loading"), 0);

    getAvailableBranchHeadBranches(
      { search: branchDebounced, page: branchPage, pageSize: branchPageSize, sort: "branch_code", direction: "asc" },
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return;
      setBranchRecords(result.records);
      setBranchMeta(result.meta);
      setBranchStatus("ready");
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        onClose();
        return;
      }
      setBranchError(loadError(error, "available branches"));
      setBranchStatus("error");
    });

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [branchAttempt, branchDebounced, branchPage, branchPageSize, onClose, router, stage]);

  function chooseCandidate(candidate: BranchHeadCandidate) {
    if (selectedCandidate?.id !== candidate.id) setSelectedBranches(new Map());
    setSelectedCandidate(candidate);
    setMessage("");
  }

  function toggleBranch(branch: BranchHeadBranch) {
    setSelectedBranches((current) => {
      const next = new Map(current);
      if (next.has(branch.id)) next.delete(branch.id);
      else next.set(branch.id, branch);
      return next;
    });
    setMessage("");
  }

  async function submit() {
    if (inFlight.current || blocked || !selectedCandidate || selectedBranches.size === 0) return;
    inFlight.current = true;
    setSubmitting(true);
    setMessage("");

    try {
      const response = await createBranchHeadAssignment({
        user_id: selectedCandidate.id,
        branch_ids: [...selectedBranches.keys()],
      });
      onCreated(response.message);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        setSelectedCandidate(null);
        setSelectedBranches(new Map());
        setCandidateAttempt((value) => value + 1);
        setBranchAttempt((value) => value + 1);
        setStage(1);
        setMessage("Candidate eligibility or branch availability changed. Select from the refreshed choices and try again.");
      } else if (error instanceof ApiError && error.status === 422) {
        const fields = Object.keys(error.errors);
        setStage(fields.some((field) => field.startsWith("user_id")) ? 1 : 2);
        setMessage("Review this step. One or more selections are no longer valid.");
      } else if (error instanceof ApiError && error.status === 403) {
        setBlocked(true);
        setMessage("You don’t have permission to create this assignment.");
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

  return (
    <Modal
      open
      title="Add Branch Head assignment"
      onClose={onClose}
      dismissible={!submitting}
      maxWidth="5xl"
      footer={
        <>
          <button type="button" disabled={submitting} onClick={stage === 1 || blocked ? onClose : () => setStage(1)} className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50">{stage === 1 || blocked ? "Close" : "Back"}</button>
          {!blocked && stage === 1 && <button type="button" disabled={!selectedCandidate} onClick={() => setStage(2)} className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Continue</button>}
          {!blocked && stage === 2 && <button type="button" disabled={submitting || selectedBranches.size === 0} aria-busy={submitting} onClick={submit} className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-50">{submitting ? "Saving…" : "Create assignment"}</button>}
        </>
      }
    >
      <ol className="mb-6 grid gap-2 sm:grid-cols-2" aria-label="Assignment steps">
        {["Select Branch Head", "Assign branches"].map((label, index) => {
          const number = index + 1;
          return <li key={label} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${stage === number ? "border-blue-300 bg-blue-50 text-blue-800" : stage > number ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-line text-muted"}`}>{number}. {label}</li>;
        })}
      </ol>

      {message && <FormAlert ref={alertRef} message={message} />}

      {stage === 1 && <CandidateSelector candidates={candidateRecords} meta={candidateMeta} loading={candidateStatus === "loading"} error={candidateStatus === "error" ? candidateError : ""} search={candidateSearch} selected={selectedCandidate} page={candidatePage} pageSize={candidatePageSize} onSearchChange={(value) => { setCandidateSearch(value); setCandidatePage(1); }} onSelect={chooseCandidate} onPageChange={setCandidatePage} onPageSizeChange={(size) => { setCandidatePageSize(size); setCandidatePage(1); }} onRetry={() => setCandidateAttempt((value) => value + 1)} />}

      {stage === 2 && selectedCandidate && (
        <div className="space-y-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-muted">Selected Branch Head</p>
            <p className="mt-1 text-base font-semibold">{branchHeadName(selectedCandidate)}</p>
            <p className="mt-1 text-sm text-muted">{selectedCandidate.position}</p>
          </div>
          <BranchSelector branches={branchRecords} meta={branchMeta} loading={branchStatus === "loading"} error={branchStatus === "error" ? branchError : ""} search={branchSearch} selected={selectedBranches} page={branchPage} pageSize={branchPageSize} onSearchChange={(value) => { setBranchSearch(value); setBranchPage(1); }} onToggle={toggleBranch} onPageChange={setBranchPage} onPageSizeChange={(size) => { setBranchPageSize(size); setBranchPage(1); }} onRetry={() => setBranchAttempt((value) => value + 1)} />
        </div>
      )}
    </Modal>
  );
}

