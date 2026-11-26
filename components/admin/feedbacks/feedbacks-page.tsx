"use client";

import { useState } from "react";
import PageHeader from "@/components/layouts/page-header";
import DataTable, {
  type TableColumn,
} from "@/components/ui/data-table";
import FormAlert from "@/components/ui/form-alert";
import Modal from "@/components/ui/modal";
import RefreshButton from "@/components/ui/refresh-button";
import RowAction from "@/components/ui/row-action";
import TablePagination from "@/components/ui/table-pagination";
import {
  isFeedbackPerPage,
  type FeedbackListItem,
  type FeedbackPage,
} from "@/lib/admin/feedbacks";
import { useFeedbacks } from "./use-feedbacks";

type FeedbacksPageProps = {
  initialPage: FeedbackPage | null;
};

/**
 * Feedback timestamps are rendered in the same zone Laravel uses for its
 * dates. An explicit timeZone also keeps server rendering and hydration
 * identical on machines in other zones.
 */
function formatSubmittedDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatSubmittedDateTime(value: string | null): string {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function phoneLabel(value: string | null): string {
  return value?.trim() ? value : "Not provided";
}

/**
 * "Other" opinions store their explanation in other_opinion. A blank
 * explanation falls back to a neutral label instead of showing an empty cell.
 * Values are returned as plain strings and rendered as React text only.
 */
function opinionLabel(feedback: FeedbackListItem): string {
  if (feedback.opinion.trim().toLowerCase() === "other") {
    return feedback.other_opinion?.trim()
      ? feedback.other_opinion
      : "Not specified";
  }

  return feedback.opinion.trim()
    ? feedback.opinion
    : "Not provided";
}

function FeedbackDetailsDialog({
  feedback,
  onClose,
}: {
  feedback: FeedbackListItem | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(feedback)}
      title="Feedback details"
      onClose={onClose}
      maxWidth="3xl"
    >
      {feedback && (
        <div className="space-y-6">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              ["Feedback ID", `#${feedback.id}`],
              ["Feedback code", feedback.feedback_code],
              ["Name", feedback.name],
              ["Email address", feedback.email],
              ["Phone number", phoneLabel(feedback.phone)],
              ["Department", feedback.department],
              ["Opinion", feedback.opinion.trim() || "Not provided"],
              ["Submitted", formatSubmittedDateTime(feedback.created_at)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm leading-6 text-muted">{label}</dt>
                <dd className="mt-1 text-sm leading-6 font-medium [overflow-wrap:anywhere]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {feedback.opinion.trim().toLowerCase() === "other" && (
            <section className="border-t border-line/60 pt-5">
              <h3 className="text-sm leading-6 text-muted">Other opinion</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 font-medium [overflow-wrap:anywhere]">
                {feedback.other_opinion?.trim() || "Not specified"}
              </p>
            </section>
          )}

          <section className="border-t border-line/60 pt-5">
            <h3 className="text-sm leading-6 text-muted">Message</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
              {feedback.message.trim() || "Not provided"}
            </p>
          </section>
        </div>
      )}
    </Modal>
  );
}

export default function FeedbacksPage({
  initialPage,
}: FeedbacksPageProps) {
  const [selectedFeedback, setSelectedFeedback] =
    useState<FeedbackListItem | null>(null);
  const {
    records,
    meta,
    page,
    pageSize,
    loadStatus,
    changePage,
    changePageSize,
    refresh,
  } = useFeedbacks(initialPage);

  const loading = loadStatus === "loading";
  const refreshing = loadStatus === "refreshing";
  const busy = loading || refreshing;
  const failed =
    loadStatus === "error" || loadStatus === "rate-limited";

  const columns: TableColumn<FeedbackListItem>[] = [
    {
      key: "feedback_code",
      label: "code",
      render: (feedback) => (
        <div className="min-w-36 max-w-56">
          <p className="font-semibold break-all text-brand">
            {feedback.feedback_code}
          </p>
        </div>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (feedback) => (
        <p className="min-w-40 max-w-56 font-medium [overflow-wrap:anywhere]">
          {feedback.name}
        </p>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (feedback) => (
        <p className="min-w-48 max-w-64 break-all">
          {feedback.email}
        </p>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (feedback) => (
        <span className="whitespace-nowrap">
          {phoneLabel(feedback.phone)}
        </span>
      ),
    },
    {
      key: "department",
      label: "Department",
      render: (feedback) => (
        <p className="min-w-40 max-w-56 [overflow-wrap:anywhere]">
          {feedback.department}
        </p>
      ),
    },
    {
      key: "opinion",
      label: "Opinion",
      render: (feedback) => (
        <p className="min-w-40 max-w-64 [overflow-wrap:anywhere]">
          {opinionLabel(feedback)}
        </p>
      ),
    },
    {
      key: "message",
      label: "Message",
      render: (feedback) => (
        // Plain text only: whitespace is preserved and long unbroken
        // strings wrap instead of stretching the table.
        <p className="min-w-64 max-w-96 whitespace-pre-wrap [overflow-wrap:anywhere] line-clamp-1">
          {feedback.message}
        </p>
      ),
    },
    {
      key: "created_at",
      label: "Submitted",
      render: (feedback) => (
        <span className="whitespace-nowrap">
          {formatSubmittedDate(feedback.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (feedback) => (
        <div className="flex items-center gap-2">
          <RowAction
            label={`View details for feedback ${feedback.feedback_code}`}
            icon="eye"
            tone="blue"
            onClick={() => setSelectedFeedback(feedback)}
          />
        </div>
      ),
    },
  ];

  if (loadStatus === "forbidden") {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-5 sm:p-6">
        <p className="text-sm font-medium text-brand">
          ADMINISTRATION
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          Access restricted
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          You don’t have permission to view feedbacks.
        </p>
      </section>
    );
  }

  const errorMessage =
    loadStatus === "rate-limited"
      ? "Too many requests were sent. Wait a moment, then try again."
      : "We couldn’t load feedbacks. Check your connection and try again.";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Feedbacks"
        description="Review feedback submitted across the organization. This page is a read-only list; feedback cannot be edited or deleted here."
      >
        <RefreshButton
          label="Refresh feedbacks"
          showLabel
          loading={busy}
          onClick={refresh}
        />
      </PageHeader>

      {failed ? (
        <FormAlert message={errorMessage}>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 min-h-11 rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-danger hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            Try again
          </button>
        </FormAlert>
      ) : (
        <section
          aria-labelledby="feedbacks-list-title"
          aria-busy={busy}
          className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
            <h2
              id="feedbacks-list-title"
              className="text-lg font-semibold text-ink"
            >
              Submitted feedback
            </h2>
            <p
              role="status"
              aria-atomic="true"
              className="text-sm leading-6 text-muted"
            >
              {loading
                ? "Loading feedbacks…"
                : refreshing
                  ? "Refreshing feedbacks…"
                  : `${meta.total.toLocaleString()} ${
                      meta.total === 1
                        ? "feedback entry"
                        : "feedback entries"
                    }`}
            </p>
          </div>

          <DataTable
            caption="Admin feedback list"
            columns={columns}
            rows={records}
            rowKey={(feedback) => feedback.id}
            loading={loading}
            loadingLabel="Loading feedbacks…"
            empty={
              <div>
                <p className="text-md font-medium text-ink">
                  No feedback yet
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Submitted feedback will appear here.
                </p>
              </div>
            }
          />

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={meta.total}
            onPageChange={changePage}
            onPageSizeChange={(value) => {
              if (isFeedbackPerPage(value)) {
                changePageSize(value);
              }
            }}
            loading={busy}
            itemLabel="feedback entries"
            ariaLabel="Feedback table pagination"
            pageSizeOptions={[10, 20, 50]}
          />
        </section>
      )}

      <FeedbackDetailsDialog
        feedback={selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
      />
    </div>
  );
}
