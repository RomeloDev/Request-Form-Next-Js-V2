"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api";
import {
  getSharedRequests,
  type SharedRequest,
  type SharedRequestFilters,
  type SharedRequestPage,
} from "@/lib/requests/shared-requests";

export type SharedRequestsLoadStatus =
  | "loading"
  | "ready"
  | "error"
  | "forbidden"
  | "rate-limited";

const emptyMeta: SharedRequestPage["meta"] = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: null,
  to: null,
};

export function useSharedRequests(
  initialPage: SharedRequestPage | null,
) {
  const router = useRouter();
  const skipInitialLoad = useRef(initialPage !== null);
  const [records, setRecords] = useState<SharedRequest[]>(
    initialPage?.data ?? [],
  );
  const [meta, setMeta] =
    useState<SharedRequestPage["meta"]>(initialPage?.meta ?? emptyMeta);
  const [loadStatus, setLoadStatus] =
    useState<SharedRequestsLoadStatus>(
      initialPage ? "ready" : "error",
    );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<10 | 20 | 50>(10);
  const [attempt, setAttempt] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }

    const controller = new AbortController();

    const loadingTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) {
        setLoadStatus("loading");
      }
    }, 0);

    const filters: SharedRequestFilters = {
      search: debouncedSearch,
      page,
      perPage: pageSize,
    };

    getSharedRequests(filters, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;

        const lastPage = Math.max(1, result.meta.last_page);

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

        if (error instanceof ApiError && error.status === 403) {
          setLoadStatus("forbidden");
          return;
        }

        if (error instanceof ApiError && error.status === 429) {
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
  ]);

  function changeSearch(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function changePageSize(value: 10 | 20 | 50): void {
    setPageSize(value);
    setPage(1);
  }

  function changePage(value: number): void {
    const lastPage = Math.max(1, meta.last_page);
    setPage(Math.max(1, Math.min(value, lastPage)));
  }

  const refresh = useCallback(() => {
    setLoadStatus("loading");
    setAttempt((current) => current + 1);
  }, []);

  return {
    records,
    meta,
    loadStatus,
    search,
    page,
    pageSize,
    changeSearch,
    changePage,
    changePageSize,
    refresh,
  };
}
