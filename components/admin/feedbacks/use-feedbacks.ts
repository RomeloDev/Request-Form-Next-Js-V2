"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getFeedbacks,
  isFeedbackPerPage,
  type FeedbackListItem,
  type FeedbackPage,
  type FeedbackPerPage,
} from "@/lib/admin/feedbacks";
import { ApiError } from "@/lib/api";

export type FeedbacksLoadStatus =
  | "loading"
  | "ready"
  | "refreshing"
  | "forbidden"
  | "rate-limited"
  | "error";

const emptyMeta: FeedbackPage["meta"] = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
  from: null,
  to: null,
};

/**
 * Server-backed state for the Admin Feedbacks list.
 *
 * Feedbacks only supports pagination, so this hook is deliberately smaller
 * than the request-reports hook: page and page-size changes each become one
 * Laravel request, and nothing is filtered or sorted in the browser.
 */
export function useFeedbacks(initialPage: FeedbackPage | null) {
  const router = useRouter();
  // Valid server-rendered data is authoritative for the first paint, so the
  // first client fetch is skipped. Retries still run because attempt changes.
  const skipInitialLoad = useRef(initialPage !== null);
  const hasLoaded = useRef(initialPage !== null);

  const [records, setRecords] = useState<FeedbackListItem[]>(
    initialPage?.data ?? [],
  );
  const [meta, setMeta] = useState<FeedbackPage["meta"]>(
    initialPage?.meta ?? emptyMeta,
  );
  const [page, setPage] = useState(
    initialPage?.meta.current_page ?? 1,
  );
  const [pageSize, setPageSize] =
    useState<FeedbackPerPage>(
      initialPage?.meta.per_page ?? 20,
    );
  const [loadStatus, setLoadStatus] =
    useState<FeedbacksLoadStatus>(
      initialPage ? "ready" : "loading",
    );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }

    const controller = new AbortController();

    const statusTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setLoadStatus(
          hasLoaded.current ? "refreshing" : "loading",
        );
      }
    }, 0);

    getFeedbacks({ page, perPage: pageSize }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;

        hasLoaded.current = true;

        const lastPage = Math.max(1, result.meta.last_page);

        // A stale page (for example after the list shrinks) is clamped
        // instead of showing an empty table forever.
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setRecords(result.data);
        setMeta(result.meta);
        setLoadStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 419)
        ) {
          router.replace("/login");
          return;
        }

        if (
          error instanceof ApiError &&
          error.status === 403
        ) {
          setLoadStatus("forbidden");
          return;
        }

        if (
          error instanceof ApiError &&
          error.status === 429
        ) {
          setLoadStatus("rate-limited");
          return;
        }

        setLoadStatus("error");
      });

    return () => {
      window.clearTimeout(statusTimer);
      controller.abort();
    };
  }, [attempt, page, pageSize, router]);

  function changePage(value: number): void {
    if (!Number.isInteger(value) || value < 1) return;

    const lastPage = Math.max(1, meta.last_page);

    setPage(Math.max(1, Math.min(value, lastPage)));
  }

  function changePageSize(value: FeedbackPerPage): void {
    if (!isFeedbackPerPage(value)) return;

    setPageSize(value);
    setPage(1);
  }

  const refresh = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return {
    records,
    meta,
    page,
    pageSize,
    loadStatus,
    changePage,
    changePageSize,
    refresh,
  };
}
