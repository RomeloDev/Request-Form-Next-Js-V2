"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type TableColumn } from "@/components/ui/data-table";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import Modal from "@/components/ui/modal";
import RefreshButton from "@/components/ui/refresh-button";
import RowAction from "@/components/ui/row-action";
import TablePagination from "@/components/ui/table-pagination";
import { ApiError } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  getRequestShareCandidates,
  getRequestShareRecipients,
  revokeRequestShare,
  shareRequestWithUsers,
  type RequestShareCandidate,
  type RequestShareCandidatePage,
  type RequestShareRecipient,
  type RequestShareRecipientPage,
} from "@/lib/requests/request-sharing";

type ShareRequestDialogProps = {
  requestId: number;
  requestCode: string;
  onClose: () => void;
  /** Called when the backend reports the request is unavailable (404). */
  onUnavailable: () => void;
  /** Reconciles owner-side request summaries after a share changes. */
  onChanged?: () => void;
};

const maxShareRecipients = 50;

function personName(
  person: Pick<RequestShareCandidate, "firstname" | "lastname">,
): string {
  return `${person.firstname} ${person.lastname}`.trim();
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
      }).format(date);
}

export default function ShareRequestDialog({
  requestId,
  requestCode,
  onClose,
  onUnavailable,
  onChanged,
}: ShareRequestDialogProps) {
  const router = useRouter();

  // Current recipients section
  const [recipients, setRecipients] =
    useState<RequestShareRecipientPage | null>(null);
  const [recipientsLoading, setRecipientsLoading] =
    useState(true);
  const [recipientsError, setRecipientsError] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientPageSize, setRecipientPageSize] =
    useState<10 | 20 | 50>(10);
  const [recipientAttempt, setRecipientAttempt] = useState(0);
  const debouncedRecipientSearch = useDebouncedValue(
    recipientSearch.trim(),
    400,
  );
  const recipientControllerRef = useRef<AbortController | null>(null);

  // Add recipients section
  const [candidates, setCandidates] =
    useState<RequestShareCandidatePage | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [candidatesError, setCandidatesError] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidatePageSize, setCandidatePageSize] =
    useState<10 | 20 | 50>(10);
  const [candidateAttempt, setCandidateAttempt] = useState(0);
  const debouncedCandidateSearch = useDebouncedValue(
    candidateSearch.trim(),
    400,
  );
  const candidateControllerRef = useRef<AbortController | null>(null);

  // Selection and submission
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [sharePending, setSharePending] = useState(false);
  const shareInFlight = useRef(false);

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] =
    useState<RequestShareRecipient | null>(null);
  const [revoking, setRevoking] = useState(false);
  const revokeInFlight = useRef(false);

  // Shared notice/error shown at the top of the modal
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  function handleClose(): void {
    recipientControllerRef.current?.abort();
    candidateControllerRef.current?.abort();
    onClose();
  }

  useEffect(() => {
    return () => {
      recipientControllerRef.current?.abort();
      candidateControllerRef.current?.abort();
    };
  }, []);

  const refreshRecipients = useCallback(() => {
    setRecipientAttempt((current) => current + 1);
  }, []);

  const refreshCandidates = useCallback(() => {
    setCandidateAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    recipientControllerRef.current = controller;

    const loadingTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setRecipientsLoading(true);
      }
    }, 0);

    getRequestShareRecipients(
      requestId,
      {
        search: debouncedRecipientSearch,
        page: recipientPage,
        perPage: recipientPageSize,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        const lastPage = Math.max(1, result.meta.last_page);

        if (recipientPage > lastPage) {
          setRecipientPage(lastPage);
          return;
        }

        setRecipients(result);
        setRecipientsError("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 419)
        ) {
          router.replace("/login");
          onClose();
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          onUnavailable();
          return;
        }

        if (error instanceof ApiError && error.status === 403) {
          setRecipientsError(
            "You don’t have permission to manage sharing for this request.",
          );
        } else if (
          error instanceof ApiError &&
          error.status === 409
        ) {
          setRecipientsError(
            "Only Completed requests can be shared. Close this dialog and refresh the request.",
          );
        } else if (
          error instanceof ApiError &&
          error.status === 429
        ) {
          setRecipientsError(
            "Too many requests were sent. Wait a moment and try again.",
          );
        } else {
          setRecipientsError(
            "We couldn’t load the current recipients. Try again.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRecipientsLoading(false);
        }
      });

    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [
    debouncedRecipientSearch,
    onClose,
    onUnavailable,
    recipientAttempt,
    recipientPage,
    recipientPageSize,
    requestId,
    router,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    candidateControllerRef.current = controller;

    const loadingTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setCandidatesLoading(true);
      }
    }, 0);

    getRequestShareCandidates(
      requestId,
      {
        search: debouncedCandidateSearch,
        page: candidatePage,
        perPage: candidatePageSize,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        const lastPage = Math.max(1, result.meta.last_page);

        if (candidatePage > lastPage) {
          setCandidatePage(lastPage);
          return;
        }

        setCandidates(result);
        setCandidatesError("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 419)
        ) {
          router.replace("/login");
          onClose();
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          onUnavailable();
          return;
        }

        if (error instanceof ApiError && error.status === 403) {
          setCandidatesError(
            "You don’t have permission to manage sharing for this request.",
          );
        } else if (
          error instanceof ApiError &&
          error.status === 409
        ) {
          setCandidatesError(
            "Only Completed requests can be shared. Close this dialog and refresh the request.",
          );
        } else if (
          error instanceof ApiError &&
          error.status === 429
        ) {
          setCandidatesError(
            "Too many requests were sent. Wait a moment and try again.",
          );
        } else {
          setCandidatesError(
            "We couldn’t load the available recipients. Try again.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCandidatesLoading(false);
        }
      });

    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [
    debouncedCandidateSearch,
    onClose,
    onUnavailable,
    candidateAttempt,
    candidatePage,
    candidatePageSize,
    requestId,
    router,
  ]);

  function toggleCandidate(candidate: RequestShareCandidate): void {
    const selected = selectedIds.includes(candidate.id);

    if (selected) {
      setSelectedIds((current) =>
        current.filter((id) => id !== candidate.id),
      );
      setSelectionMessage("");
      return;
    }

    if (selectedIds.length >= maxShareRecipients) {
      setSelectionMessage(
        "You can share this request with at most 50 recipients.",
      );
      return;
    }

    setSelectionMessage("");
    setSelectedIds((current) => [...current, candidate.id]);
  }

  async function handleShare(): Promise<void> {
    if (shareInFlight.current || sharePending) {
      return;
    }

    if (selectedIds.length === 0) {
      return;
    }

    shareInFlight.current = true;
    setSharePending(true);
    setNotice("");
    setActionError("");

    try {
      const result = await shareRequestWithUsers(
        requestId,
        selectedIds,
      );

      setSelectedIds([]);
      setSelectionMessage("");
      refreshCandidates();
      refreshRecipients();
      onChanged?.();
      setNotice(
        `Request shared with ${result.shared_count.toLocaleString()} ${
          result.shared_count === 1 ? "recipient" : "recipients"
        }.`,
      );
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        onUnavailable();
        return;
      }

      if (error instanceof ApiError && error.status === 422) {
        setActionError(
          "Check the selected recipients and try again.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 403
      ) {
        setActionError(
          "You don’t have permission to share this request.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 409
      ) {
        setActionError(
          "Only Completed requests can be shared. Refresh the request and try again.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 429
      ) {
        setActionError(
          "Too many requests were sent. Wait a moment and try again.",
        );
      } else {
        setActionError(
          "We couldn’t share this request. Try again.",
        );
      }
    } finally {
      shareInFlight.current = false;
      setSharePending(false);
    }
  }

  async function handleRevoke(): Promise<void> {
    if (!revokeTarget || revokeInFlight.current) {
      return;
    }

    revokeInFlight.current = true;
    setRevoking(true);
    setNotice("");
    setActionError("");

    try {
      await revokeRequestShare(requestId, revokeTarget.id);

      const revokedName = personName(revokeTarget);
      setRevokeTarget(null);
      refreshRecipients();
      refreshCandidates();
      onChanged?.();
      setNotice(`Access revoked for ${revokedName}.`);
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setRevokeTarget(null);
        refreshRecipients();
        refreshCandidates();
        onChanged?.();
        setNotice(
          "That recipient no longer has access. The sharing lists are being refreshed.",
        );
        return;
      }

      if (error instanceof ApiError && error.status === 403) {
        setActionError(
          "You don’t have permission to revoke this share.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 409
      ) {
        setActionError(
          "This request is no longer Completed, so its shares can no longer be changed. Refresh the request and try again.",
        );
      } else if (
        error instanceof ApiError &&
        error.status === 429
      ) {
        setActionError(
          "Too many requests were sent. Wait a moment and try again.",
        );
      } else {
        setActionError(
          "We couldn’t revoke this share. Try again.",
        );
      }
    } finally {
      revokeInFlight.current = false;
      setRevoking(false);
    }
  }

  function changeRecipientSearch(value: string): void {
    setRecipientSearch(value);
    setRecipientPage(1);
  }

  function changeRecipientPageSize(value: 10 | 20 | 50): void {
    setRecipientPageSize(value);
    setRecipientPage(1);
  }

  function changeRecipientPage(value: number): void {
    const lastPage = Math.max(
      1,
      recipients?.meta.last_page ?? 1,
    );

    setRecipientPage(
      Math.max(1, Math.min(value, lastPage)),
    );
  }

  function changeCandidateSearch(value: string): void {
    setCandidateSearch(value);
    setCandidatePage(1);
  }

  function changeCandidatePageSize(value: 10 | 20 | 50): void {
    setCandidatePageSize(value);
    setCandidatePage(1);
  }

  function changeCandidatePage(value: number): void {
    const lastPage = Math.max(
      1,
      candidates?.meta.last_page ?? 1,
    );

    setCandidatePage(
      Math.max(1, Math.min(value, lastPage)),
    );
  }

  const selectedCount = selectedIds.length;
  const selectedLabel = `${selectedCount.toLocaleString()} of ${maxShareRecipients.toLocaleString()} selected`;

  const recipientColumns: TableColumn<RequestShareRecipient>[] = [
    {
      key: "name",
      label: "Name",
      render: (recipient) => (
        <div className="min-w-44">
          <p className="font-medium">
            {personName(recipient)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {recipient.position ?? "Position not provided"}
          </p>
        </div>
      ),
    },
    {
      key: "branch",
      label: "Branch",
      render: (recipient) => (
        <div className="min-w-40">
          <p className="font-medium">
            {recipient.branch_code}
          </p>
          <p className="mt-1 text-sm text-muted">
            {recipient.branch_name}
          </p>
        </div>
      ),
    },
    {
      key: "shared_at",
      label: "Shared",
      render: (recipient) => (
        <span className="whitespace-nowrap">
          {formatDate(recipient.shared_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (recipient) => (
        <RowAction
          label={`Revoke access for ${personName(recipient)}`}
          icon="trash"
          tone="danger"
          disabled={revoking || sharePending}
          onClick={() => setRevokeTarget(recipient)}
        />
      ),
    },
  ];

  const candidateColumns: TableColumn<RequestShareCandidate>[] = [
    {
      key: "select",
      label: "Select",
      render: (candidate) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(candidate.id)}
          disabled={sharePending}
          onChange={() => toggleCandidate(candidate)}
          aria-label={`Select ${personName(candidate)} as a recipient`}
          className="size-5 rounded accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (candidate) => (
        <div className="min-w-44">
          <p className="font-medium">
            {personName(candidate)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {candidate.position ?? "Position not provided"}
          </p>
        </div>
      ),
    },
    {
      key: "branch",
      label: "Branch",
      render: (candidate) => (
        <div className="min-w-40">
          <p className="font-medium">
            {candidate.branch_code}
          </p>
          <p className="mt-1 text-sm text-muted">
            {candidate.branch_name}
          </p>
        </div>
      ),
    },
  ];

  return (
    <>
      <Modal
        open
        title={`Share request ${requestCode}`}
        onClose={handleClose}
        dismissible={!sharePending}
        maxWidth="5xl"
        footer={
          <>
            <button
              type="button"
              disabled={sharePending}
              onClick={handleClose}
              className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={
                sharePending || selectedCount === 0
              }
              onClick={() => {
                void handleShare();
              }}
              aria-busy={sharePending}
              className="inline-flex min-h-12 items-center rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sharePending
                ? "Sharing…"
                : selectedCount === 0
                  ? "Share request"
                  : `Share with ${selectedCount.toLocaleString()} ${
                      selectedCount === 1
                        ? "recipient"
                        : "recipients"
                    }`}
            </button>
          </>
        }
      >
        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-base leading-7 text-emerald-800"
          >
            <p className="font-medium">{notice}</p>
          </div>
        )}

        {actionError && (
          <div className="mb-5">
            <FormAlert message={actionError} />
          </div>
        )}

        <section
          aria-labelledby="share-recipients-title"
          className="rounded-2xl border border-line/60 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3
              id="share-recipients-title"
              className="text-lg font-semibold text-ink"
            >
              Current recipients
            </h3>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted" aria-live="polite">
                {recipientsLoading
                  ? "Loading recipients…"
                  : `${(recipients?.meta.total ?? 0).toLocaleString()} recipient${
                      (recipients?.meta.total ?? 0) === 1
                        ? ""
                        : "s"
                    }`}
              </p>
              <RefreshButton
                label="Refresh recipients"
                loading={recipientsLoading}
                onClick={refreshRecipients}
              />
            </div>
          </div>

          <div className="mt-4">
            <FormField
              id="share-recipients-search"
              label="Search recipients"
              type="search"
              placeholder="Name or branch"
              autoComplete="off"
              value={recipientSearch}
              onChange={(event) => {
                changeRecipientSearch(event.target.value);
              }}
            />
          </div>

          {recipientsError && (
            <div className="mt-4">
              <FormAlert message={recipientsError} />
            </div>
          )}

          <div className="mt-4">
            <DataTable
              caption="People this request is currently shared with"
              columns={recipientColumns}
              rows={recipients?.data ?? []}
              rowKey={(recipient) => recipient.id}
              loading={recipientsLoading}
              loadingLabel="Loading recipients…"
              empty={
                <div>
                  <p className="text-lg font-medium">
                    {recipientSearch
                      ? "No matching recipients"
                      : "No recipients yet"}
                  </p>
                  <p className="mt-2 text-muted">
                    {recipientSearch
                      ? "Try another search."
                      : "Use the section below to share this request with people."}
                  </p>
                </div>
              }
            />

            <TablePagination
              page={recipientPage}
              pageSize={recipientPageSize}
              totalItems={recipients?.meta.total ?? 0}
              onPageChange={changeRecipientPage}
              onPageSizeChange={(value) => {
                if (value === 10 || value === 20 || value === 50) {
                  changeRecipientPageSize(value);
                }
              }}
              loading={recipientsLoading}
              itemLabel="recipients"
              ariaLabel="Current recipients pagination"
            />
          </div>
        </section>

        <section
          aria-labelledby="share-candidates-title"
          className="mt-6 rounded-2xl border border-line/60 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3
              id="share-candidates-title"
              className="text-lg font-semibold text-ink"
            >
              Add recipients
            </h3>
            <div className="flex items-center gap-3">
              <p
                className="text-sm font-semibold tabular-nums text-muted"
                aria-live="polite"
              >
                {selectedLabel}
              </p>
              <RefreshButton
                label="Refresh available recipients"
                loading={candidatesLoading}
                onClick={refreshCandidates}
              />
            </div>
          </div>

          <div className="mt-4">
            <FormField
              id="share-candidates-search"
              label="Search available recipients"
              type="search"
              placeholder="Name or branch"
              autoComplete="off"
              value={candidateSearch}
              onChange={(event) => {
                changeCandidateSearch(event.target.value);
              }}
            />
          </div>

          {selectionMessage && (
            <p
              role="status"
              className="mt-4 text-sm font-medium text-amber-700"
            >
              {selectionMessage}
            </p>
          )}

          {candidatesError && (
            <div className="mt-4">
              <FormAlert message={candidatesError} />
            </div>
          )}

          <div className="mt-4">
            <DataTable
              caption="People available to receive this request"
              columns={candidateColumns}
              rows={candidates?.data ?? []}
              rowKey={(candidate) => candidate.id}
              loading={candidatesLoading}
              loadingLabel="Loading available recipients…"
              empty={
                <div>
                  <p className="text-lg font-medium">
                    {candidateSearch
                      ? "No matching people"
                      : "No available recipients"}
                  </p>
                  <p className="mt-2 text-muted">
                    {candidateSearch
                      ? "Try another search."
                      : "Everyone eligible has already been added."}
                  </p>
                </div>
              }
            />

            <TablePagination
              page={candidatePage}
              pageSize={candidatePageSize}
              totalItems={candidates?.meta.total ?? 0}
              onPageChange={changeCandidatePage}
              onPageSizeChange={(value) => {
                if (value === 10 || value === 20 || value === 50) {
                  changeCandidatePageSize(value);
                }
              }}
              loading={candidatesLoading}
              itemLabel="available recipients"
              ariaLabel="Available recipients pagination"
            />
          </div>
        </section>
      </Modal>

      {revokeTarget && (
        <Modal
          open
          title="Revoke share"
          onClose={() => setRevokeTarget(null)}
          dismissible={!revoking}
          maxWidth="md"
          footer={
            <>
              <button
                type="button"
                disabled={revoking}
                onClick={() => setRevokeTarget(null)}
                className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
              >
                Keep access
              </button>
              <button
                type="button"
                disabled={revoking}
                onClick={() => {
                  void handleRevoke();
                }}
                aria-busy={revoking}
                className="inline-flex min-h-12 items-center rounded-xl bg-rose-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-wait disabled:opacity-50"
              >
                {revoking ? "Revoking…" : "Revoke access"}
              </button>
            </>
          }
        >
          <p className="text-lg font-semibold wrap-anywhere text-ink">
            Revoke access for {personName(revokeTarget)}?
          </p>
          <p className="mt-3 text-base leading-7 text-muted">
            This person will no longer be able to view request{" "}
            {requestCode}.
          </p>

          {revoking && (
            <p role="status" className="mt-4 text-sm text-muted">
              Revoking access. Please wait.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
