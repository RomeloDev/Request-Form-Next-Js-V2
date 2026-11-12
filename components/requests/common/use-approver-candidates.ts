"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api";
import {
  getApproverCandidates,
  type ApproverCandidate,
  type CandidatePaginationMeta,
} from "@/lib/requests/request-approvers";

export type ApproverCandidateStatus =
  | "loading"
  | "ready"
  | "error"
  | "forbidden"
  | "rate-limited";

const emptyMeta: CandidatePaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: null,
  to: null,
};

export function useApproverCandidates() {
  const router = useRouter();

  const [records, setRecords] = useState<
    ApproverCandidate[]
  >([]);

  const [meta, setMeta] =
    useState<CandidatePaginationMeta>(emptyMeta);

  const [status, setStatus] =
    useState<ApproverCandidateStatus>("loading");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<10 | 20 | 50>(10);

  const [attempt, setAttempt] = useState(0);

  const debouncedSearch = useDebouncedValue(
    search.trim(),
    400,
  );

  useEffect(() => {
    const controller = new AbortController();

    /*
     * Mark the new request as loading outside the direct effect body.
     * This also follows the project's existing hooks convention.
     */
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
        perPage: pageSize,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        const lastPage = Math.max(
          1,
          result.meta.last_page,
        );

        /*
         * Search results may have fewer pages than the previous query.
         */
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setRecords(result.data);
        setMeta(result.meta);
        setStatus("ready");
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
          return;
        }

        if (
          error instanceof ApiError &&
          error.status === 403
        ) {
          setStatus("forbidden");
          return;
        }

        if (
          error instanceof ApiError &&
          error.status === 429
        ) {
          setStatus("rate-limited");
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
    page,
    pageSize,
    router,
  ]);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function changePageSize(value: 10 | 20 | 50) {
    setPageSize(value);
    setPage(1);
  }

  function changePage(value: number) {
    const lastPage = Math.max(1, meta.last_page);

    setPage(
      Math.max(1, Math.min(value, lastPage)),
    );
  }

  function refresh() {
    setStatus("loading");
    setAttempt((current) => current + 1);
  }

  return {
    records,
    meta,
    status,
    search,
    page,
    pageSize,
    changeSearch,
    changePage,
    changePageSize,
    refresh,
  };
}
