"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { branchCodeFor, loadUserDirectory, userFullName, type AdminUser, type UserDirectory } from "@/lib/admin/users";

export type UserSortKey = "id" | "name" | "branch" | "email" | "role" | "status";
export type UserSort = { key: UserSortKey; direction: "asc" | "desc" };
type DirectoryState = { status: "loading" } | { status: "ready"; data: UserDirectory } | { status: "error" } | { status: "forbidden" };

export function useUserDirectory(enabled: boolean) {
  const router = useRouter();
  const [state, setState] = useState<DirectoryState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<UserSort>({ key: "id", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    loadUserDirectory(controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ status: "ready", data });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        setState({ status: "forbidden" });
        router.replace("/login");
      } else setState({ status: error instanceof ApiError && error.status === 403 ? "forbidden" : "error" });
    });
    return () => controller.abort();
  }, [enabled, attempt, router]);

  const data = state.status === "ready" ? state.data : null;
  const filtered = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    const rows = data.users.filter((user) => {
      const searchable = [...Object.values(user), userFullName(user), branchCodeFor(user, data.branchCodes)].join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (!role || user.role === role) && (!status || user.verification_status === status);
    });
    function value(user: AdminUser): string | number {
      if (sort.key === "name") return userFullName(user);
      if (sort.key === "branch") return branchCodeFor(user, data!.branchCodes);
      if (sort.key === "status") return user.verification_status;
      return user[sort.key];
    }
    return rows.sort((a, b) => {
      const left = value(a), right = value(b);
      const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? order : -order;
    });
  }, [data, search, role, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  function refresh() { setState({ status: "loading" }); setAttempt((value) => value + 1); }
  function changeSearch(value: string) { setSearch(value); setPage(1); }
  function changeRole(value: string) { setRole(value); setPage(1); }
  function changeStatus(value: string) { setStatus(value); setPage(1); }
  function changePageSize(value: number) { setPageSize(value); setPage(1); }
  function changeSort(key: UserSortKey) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  }
  function clearFilters() { setSearch(""); setRole(""); setStatus(""); setPage(1); }

  return {
    state, data, search, role, status, sort, pageSize, currentPage, totalPages,
    filteredCount: filtered.length,
    rows: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    roles: data ? [...new Set(data.users.map((user) => user.role))].sort() : [],
    refresh, changeSearch, changeRole, changeStatus, changePageSize, changeSort, clearFilters,
    changePage: (value: number) => setPage(Math.max(1, Math.min(value, totalPages))),
  };
}
