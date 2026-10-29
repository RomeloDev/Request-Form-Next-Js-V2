"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import DataTable, {
  type TableColumn,
} from "@/components/ui/data-table";
import TablePagination from "@/components/ui/table-pagination";
import FormField from "@/components/ui/form-field";
import FormAlert from "@/components/ui/form-alert";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api";
import {
  approverFullName,
  assignApprovers,
  getApproverCandidates,
  type ApproverUser,
  type PaginationMeta,
} from "@/lib/admin/approvers";

type AddApproverDialogProps = {
  onClose: () => void;
  onAssigned: (message: string) => void;
};

const emptyMeta: PaginationMeta = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};

export default function AddApproverDialog({
  onClose,
  onAssigned,
}: AddApproverDialogProps) {
  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const [candidates, setCandidates] =
    useState<ApproverUser[]>([]);
  const [meta, setMeta] =
    useState<PaginationMeta>(emptyMeta);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [attempt, setAttempt] = useState(0);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(
    search.trim(),
    400,
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // A Set prevents the same user ID from being selected twice.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(),
  );

  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    // Defer loading state to satisfy React's effect-state rule.
    const loadingTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setStatus("loading");
      }
    }, 0);

    getApproverCandidates(
      {
        search: debouncedSearch,
        sort: "firstname",
        direction: "asc",
        page,
        pageSize,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;

        const lastPage = Math.max(1, result.meta.last_page);

        // Assignment by another administrator may remove
        // the final record from the current page.
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setCandidates(result.records);
        setMeta(result.meta);
        setStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          onClose();
          return;
        }

        setStatus("error");
      });

    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [
    attempt,
    debouncedSearch,
    onClose,
    page,
    pageSize,
    router,
  ]);

  function toggleCandidate(id: number) {
    if (saving || blocked) return;

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 50) {
        next.add(id);
      }

      return next;
    });

    setMessage("");
  }

  async function handleAssign() {
    if (
      inFlight.current ||
      blocked ||
      selectedIds.size === 0
    ) {
      return;
    }

    inFlight.current = true;
    setSaving(true);
    setMessage("");

    try {
      const response = await assignApprovers(
        Array.from(selectedIds),
      );

      onAssigned(response.message);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        onClose();
        return;
      }

      if (
        error instanceof ApiError &&
        (error.status === 409 || error.status === 422)
      ) {
        // Candidate eligibility changed after the list loaded.
        setSelectedIds(new Set());
        setAttempt((current) => current + 1);
        setMessage(
          "One or more selected users are no longer eligible. " +
            "The candidate list has been refreshed.",
        );
      } else {
        // Block retries when the result might be uncertain.
        setBlocked(true);

        if (error instanceof ApiError && error.status === 403) {
          setMessage(
            "You don’t have permission to assign approvers.",
          );
        } else if (
          error instanceof ApiError &&
          error.status === 419
        ) {
          setMessage(
            "Your session needs refreshing. Reload the page and try again.",
          );
        } else {
          setMessage(
            "We couldn’t confirm whether the users were assigned. " +
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

  const loading = status === "loading";

  const columns: TableColumn<ApproverUser>[] = [
    {
      key: "selection",
      label: "Select",
      render: (candidate) => {
        const checked = selectedIds.has(candidate.id);
        const selectionLimitReached =
          selectedIds.size >= 50 && !checked;

        return (
          <input
            type="checkbox"
            aria-label={`Select ${approverFullName(candidate)}`}
            checked={checked}
            disabled={
              saving ||
              blocked ||
              selectionLimitReached
            }
            onChange={() => toggleCandidate(candidate.id)}
            className="size-5 rounded border-slate-300 text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          />
        );
      },
    },
    {
      key: "name",
      label: "Name",
      render: (candidate) => (
        <div className="min-w-48">
          <p className="font-medium wrap-anywhere">
            {approverFullName(candidate)}
          </p>
          <p className="mt-1 text-sm text-muted wrap-anywhere">
            @{candidate.username}
          </p>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (candidate) => (
        <span className="wrap-anywhere">
          {candidate.email}
        </span>
      ),
    },
    {
      key: "position",
      label: "Position",
      render: (candidate) => (
        <span className="wrap-anywhere">
          {candidate.position}
        </span>
      ),
    },
    {
      key: "branch",
      label: "Company",
      render: (candidate) => (
        <span className="wrap-anywhere">
          {candidate.branch ?? "Not provided"}
        </span>
      ),
    },
  ];

  return (
    <Modal
      open
      title="Add approvers"
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
            type="button"
            disabled={
              saving ||
              blocked ||
              status !== "ready" ||
              selectedIds.size === 0
            }
            onClick={handleAssign}
            aria-busy={saving}
            className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Assigning…"
              : `Add ${selectedIds.size || ""} approver${
                  selectedIds.size === 1 ? "" : "s"
                }`}
          </button>
        </>
      }
      maxWidth="5xl"
    >
      <div className="space-y-5">
        {message && (
          <FormAlert ref={alertRef} message={message} />
        )}

        <FormField
          id="approver-candidate-search"
          label="Search eligible users"
          type="search"
          placeholder="Name, email, employee ID, or position"
          autoComplete="off"
          disabled={saving || blocked}
          value={search}
          hint="Results update after you stop typing."
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {loading
              ? "Loading eligible users…"
              : `${meta.total} eligible users`}
          </p>

          <p
            role="status"
            className="text-sm font-medium text-brand"
          >
            {selectedIds.size} selected
          </p>
        </div>

        {status === "error" ? (
          <div className="space-y-4">
            <FormAlert message="We couldn’t load eligible users." />

            <button
              type="button"
              onClick={() =>
                setAttempt((current) => current + 1)
              }
              className="min-h-11 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line/60">
            <DataTable
              caption="Eligible users"
              columns={columns}
              rows={candidates}
              rowKey={(candidate) => candidate.id}
              loading={loading}
              loadingLabel="Loading eligible users…"
              empty={
                <div>
                  <p className="text-lg font-medium">
                    {debouncedSearch
                      ? "No matching eligible users"
                      : "No eligible users"}
                  </p>
                  <p className="mt-2 text-base text-muted">
                    {debouncedSearch
                      ? "Try another search."
                      : "All ordinary users may already be approvers."}
                  </p>
                </div>
              }
            />

            <TablePagination
              page={page}
              pageSize={pageSize}
              totalItems={meta.total}
              loading={loading}
              itemLabel="eligible users"
              ariaLabel="Eligible users pagination"
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}