"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api";
import {
  getMyRequests,
  type MyRequest,
  type MyRequestFilters,
  type MyRequestPage,
  type MyRequestSummary,
  type MyRequestStatus,
} from "@/lib/requests/my-requests";

export type MyRequestsLoadStatus =
  | "loading"
  | "ready"
  | "error"
  | "forbidden"
  | "rate-limited";

const emptyMeta: MyRequestPage["meta"] = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: null,
  to: null,
};

const emptySummary: MyRequestSummary = {
  total: 0,
  pending: 0,
  ongoing: 0,
  completed: 0,
  disapproved: 0,
  canceled: 0,
};

export function useMyRequests() {
  const router = useRouter();

  const [records, setRecords] = useState<MyRequest[]>([]);
  const [meta, setMeta] =
    useState<MyRequestPage["meta"]>(emptyMeta);
  const [summary, setSummary] =
    useState<MyRequestSummary>(emptySummary);

  const [loadStatus, setLoadStatus] =
    useState<MyRequestsLoadStatus>("loading");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | MyRequestStatus>("ALL");
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

    const loadingTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setLoadStatus("loading");
      }
    }, 0);

    const filters: MyRequestFilters = {
      search: debouncedSearch,
      status: statusFilter,
      page,
      perPage: pageSize,
    };

    getMyRequests(filters, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        const lastPage = Math.max(
          1,
          result.meta.last_page,
        );

        setSummary(result.summary);

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setRecords(result.data);
        setMeta(result.meta);
        setLoadStatus("ready");
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
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [
    attempt,
    debouncedSearch,
    page,
    pageSize,
    router,
    statusFilter,
  ]);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function changeStatusFilter(
    value: "ALL" | MyRequestStatus,
  ) {
    setStatusFilter(value);
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
    setLoadStatus("loading");
    setAttempt((current) => current + 1);
  }

  return {
    records,
    meta,
    summary,
    loadStatus,
    search,
    statusFilter,
    page,
    pageSize,
    changeSearch,
    changeStatusFilter,
    changePage,
    changePageSize,
    refresh,
  };
}
