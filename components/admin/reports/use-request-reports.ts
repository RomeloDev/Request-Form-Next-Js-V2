"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  getBranches,
  type BranchRecord,
} from "@/lib/admin/branches";
import {
  getRequestReports,
  isRequestReportFormType,
  isRequestReportPerPage,
  isRequestReportSort,
  isRequestReportStatus,
  type RequestReportDirection,
  type RequestReportFilters,
  type RequestReportFormTypeFilter,
  type RequestReportListItem,
  type RequestReportPage,
  type RequestReportPerPage,
  type RequestReportSort,
  type RequestReportStatusFilter,
} from "@/lib/admin/request-reports";
import { ApiError } from "@/lib/api";

export type RequestReportsLoadStatus =
  | "loading"
  | "ready"
  | "refreshing"
  | "error"
  | "forbidden"
  | "rate-limited";

export type RequestReportsBranchStatus =
  | "loading"
  | "ready"
  | "error";

const emptyMeta: RequestReportPage["meta"] = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
  from: null,
  to: null,
};

/**
 * Server-backed state for the Admin Reports ledger.
 *
 * The browser never sorts or paginates a single page locally: every filter,
 * sort, page, and page-size change becomes a new Laravel query.
 */
export function useRequestReports(
  initialPage: RequestReportPage | null,
) {
  const router = useRouter();
  // Valid server-rendered data is authoritative for the first paint, so the
  // first client fetch is skipped. Retries still run because attempt changes.
  const skipInitialLoad = useRef(initialPage !== null);
  const hasLoaded = useRef(initialPage !== null);

  const [records, setRecords] = useState<RequestReportListItem[]>(
    initialPage?.data ?? [],
  );
  const [meta, setMeta] = useState<RequestReportPage["meta"]>(
    initialPage?.meta ?? emptyMeta,
  );
  const [loadStatus, setLoadStatus] =
    useState<RequestReportsLoadStatus>(
      initialPage ? "ready" : "loading",
    );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<RequestReportStatusFilter>("ALL");
  const [formTypeFilter, setFormTypeFilter] =
    useState<RequestReportFormTypeFilter>("ALL");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] =
    useState<RequestReportSort>("created_at");
  const [direction, setDirection] =
    useState<RequestReportDirection>("desc");
  const [page, setPage] = useState(
    initialPage?.meta.current_page ?? 1,
  );
  const [pageSize, setPageSize] =
    useState<RequestReportPerPage>(
      initialPage?.meta.per_page ?? 20,
    );
  const [attempt, setAttempt] = useState(0);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchesStatus, setBranchesStatus] =
    useState<RequestReportsBranchStatus>("loading");

  const debouncedSearch = useDebouncedValue(search.trim(), 400);

  // Laravel rejects a lone date bound, so partial pairs are never sent.
  const datePairIncomplete =
    (dateFrom === "") !== (dateTo === "");
  const appliedDateFrom = datePairIncomplete ? "" : dateFrom;
  const appliedDateTo = datePairIncomplete ? "" : dateTo;

  const isFiltered =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    formTypeFilter !== "ALL" ||
    branchId !== null ||
    dateFrom !== "" ||
    dateTo !== "";

  useEffect(() => {
    const controller = new AbortController();

    getBranches(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;

        setBranches(result);
        setBranchesStatus("ready");
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

        // The branch filter is optional: a failure must not break the
        // report table, so it only disables the branch selector.
        setBranchesStatus("error");
      });

    return () => controller.abort();
  }, [router]);

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

    const filters: RequestReportFilters = {
      search: debouncedSearch,
      status: statusFilter,
      formType: formTypeFilter,
      branchId: branchId ?? undefined,
      sort,
      direction,
      page,
      perPage: pageSize,
    };

    if (appliedDateFrom !== "" && appliedDateTo !== "") {
      filters.dateFrom = appliedDateFrom;
      filters.dateTo = appliedDateTo;
    }

    getRequestReports(filters, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;

        hasLoaded.current = true;

        const lastPage = Math.max(1, result.meta.last_page);

        // A stale page (for example after deleting the last row) is
        // clamped instead of showing an empty table forever.
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
  }, [
    appliedDateFrom,
    appliedDateTo,
    attempt,
    branchId,
    debouncedSearch,
    direction,
    formTypeFilter,
    page,
    pageSize,
    router,
    sort,
    statusFilter,
  ]);

  function changeSearch(value: string): void {
    setSearch(value.slice(0, 100));
    setPage(1);
  }

  function changeStatusFilter(
    value: RequestReportStatusFilter,
  ): void {
    if (value !== "ALL" && !isRequestReportStatus(value)) {
      return;
    }

    setStatusFilter(value);
    setPage(1);
  }

  function changeFormTypeFilter(
    value: RequestReportFormTypeFilter,
  ): void {
    if (value !== "ALL" && !isRequestReportFormType(value)) {
      return;
    }

    setFormTypeFilter(value);
    setPage(1);
  }

  function changeBranchId(value: number | null): void {
    if (
      value !== null &&
      (!Number.isInteger(value) || value < 1)
    ) {
      return;
    }

    setBranchId(value);
    setPage(1);
  }

  function changeDateFrom(value: string): void {
    setDateFrom(value);
    setPage(1);
  }

  function changeDateTo(value: string): void {
    setDateTo(value);
    setPage(1);
  }

  function changeSort(key: string): void {
    if (!isRequestReportSort(key)) return;

    setSort(key);
    setDirection((previous) =>
      sort === key
        ? previous === "asc"
          ? "desc"
          : "asc"
        : "asc",
    );
    setPage(1);
  }

  function changePage(value: number): void {
    if (!Number.isInteger(value)) return;

    const lastPage = Math.max(1, meta.last_page);

    setPage(Math.max(1, Math.min(value, lastPage)));
  }

  function changePageSize(value: RequestReportPerPage): void {
    if (!isRequestReportPerPage(value)) return;

    setPageSize(value);
    setPage(1);
  }

  function clearFilters(): void {
    setSearch("");
    setStatusFilter("ALL");
    setFormTypeFilter("ALL");
    setBranchId(null);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const refresh = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return {
    records,
    meta,
    loadStatus,
    search,
    statusFilter,
    formTypeFilter,
    branchId,
    dateFrom,
    dateTo,
    sort,
    direction,
    page,
    pageSize,
    branches,
    branchesStatus,
    datePairIncomplete,
    isFiltered,
    changeSearch,
    changeStatusFilter,
    changeFormTypeFilter,
    changeBranchId,
    changeDateFrom,
    changeDateTo,
    changeSort,
    changePage,
    changePageSize,
    clearFilters,
    refresh,
  };
}
