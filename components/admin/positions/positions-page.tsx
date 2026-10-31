"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import PageHeader from "@/components/layouts/page-header";
import DataTable, { type TableColumn } from "@/components/ui/data-table";
import TablePagination from "@/components/ui/table-pagination";
import RefreshButton from "@/components/ui/refresh-button";
import FormField from "@/components/ui/form-field";
import FormAlert from "@/components/ui/form-alert";
import RowAction from "@/components/ui/row-action";
import Icon from "@/components/ui/icon";
import TextLink from "@/components/ui/text-link";
import { ApiError } from "@/lib/api";
import { dashboardFor } from "@/lib/auth";
import {
  getPositions,
  type PositionRecord,
} from "@/lib/admin/positions";
import { APP_ROLES } from "@/lib/roles";
import PositionFormDialog from "@/components/admin/positions/position-form-dialog";
import DeletePositionDialog from "@/components/admin/positions/delete-position-dialog";

type Sort = {
  key: "id" | "label";
  direction: "asc" | "desc";
};

type PositionFormState =
  | { mode: "create" }
  | { mode: "edit"; position: PositionRecord };


export default function PositionsPage() {
  const { user } = useSession();
  const router = useRouter();
  const canView = user.role === APP_ROLES.ADMIN;

  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [attempt, setAttempt] = useState(0);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>({
    key: "label",
    direction: "asc",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [form, setForm] = useState<PositionFormState | null>(null);
  const [notice, setNotice] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<PositionRecord | null>(null);

  useEffect(() => {
    if (!canView) return;

    const controller = new AbortController();

    getPositions(controller.signal)
      .then((records) => {
        if (controller.signal.aborted) return;

        setPositions(records);
        setStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
          return;
        }

        setStatus("error");
      });

    return () => controller.abort();
  }, [canView, attempt, router]);

  function refresh() {
    setStatus("loading");
    setAttempt((previous) => previous + 1);
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function changeSort(key: string) {
    if (key !== "id" && key !== "label") return;

    setSort((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc"
          ? "desc"
          : "asc",
    }));

    setPage(1);
  }

  const query = search.trim().toLowerCase();

  const filtered = positions
    .filter((position) =>
      `${position.id} ${position.label}`
        .toLowerCase()
        .includes(query),
    )
    .sort((left, right) => {
      const order =
        sort.key === "id"
          ? left.id - right.id
          : left.label.localeCompare(right.label, undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return sort.direction === "asc" ? order : -order;
    });

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize),
  );

  const currentPage = Math.min(page, totalPages);

  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const loading = status === "loading";

  if (!canView) {
    return (
      <section className="rounded-2xl border border-line bg-white p-6">
        <h1 className="text-2xl font-semibold">Access restricted</h1>
        <p className="mt-3 text-base text-muted">
          This screen is available to administrators.
        </p>
        <div className="mt-5">
          <TextLink href={dashboardFor(user)}>
            Back to dashboard
          </TextLink>
        </div>
      </section>
    );
  }

    const columns: TableColumn<PositionRecord>[] = [
        {
            key: "id",
            label: "ID",
            sortable: true,
            render: (position) => (
            <span className="text-muted">#{position.id}</span>
            ),
        },
        {
            key: "label",
            label: "Position name",
            sortable: true,
            render: (position) => (
            <span className="font-medium wrap-anywhere">
                {position.label}
            </span>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            render: (position) => (
            <div className="flex items-center gap-2">
                <RowAction
                    label={`Edit ${position.label}`}
                    icon="pencil"
                    tone="blue"
                    onClick={() => {
                        setNotice("");
                        setForm({ mode: "edit", position });
                    }}
                />
                <RowAction
                  label={`Delete ${position.label}`}
                  icon="trash"
                  tone="danger"
                  onClick={() => {
                    setNotice("");
                    setDeleteTarget(position);
                  }}
                />
            </div>
            ),
        },
    ];

  return (
    <div className="space-y-7">
      <PageHeader
        title="Positions"
        eyebrow="ADMINISTRATION"
        description="Manage position names used across your workplace."
      >
        <RefreshButton
          label="Refresh positions"
          showLabel
          loading={loading}
          onClick={refresh}
        />

        <button
            type="button"
            disabled={loading}
            onClick={() => {
                setNotice("");
                setForm({ mode: "create" });
            }}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
            >
            <Icon name="plus" />
            Add Position
        </button>
      </PageHeader>

        {notice && (
            <p
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-base leading-7 text-emerald-900"
            >
                {notice}
            </p>
        )}

      {status === "error" ? (
        <FormAlert message="We couldn’t load positions. Check your connection and try Refresh positions." />
      ) : (
        <section
          aria-labelledby="positions-list-title"
          className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm"
        >
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="positions-list-title"
                className="text-xl font-semibold"
              >
                Position directory
              </h2>
              <p className="text-sm text-muted">
                {loading
                  ? "Loading positions…"
                  : `${filtered.length} matching positions`}
              </p>
            </div>

            <div className="max-w-md">
              <FormField
                id="positions-search"
                label="Search positions"
                type="search"
                placeholder="Position name or ID"
                autoComplete="off"
                value={search}
                onChange={(event) =>
                  changeSearch(event.target.value)
                }
              />
            </div>

            {search && (
              <button
                type="button"
                onClick={() => changeSearch("")}
                className="min-h-11 rounded px-2 text-sm font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand"
              >
                Clear search
              </button>
            )}
          </div>

          <DataTable
            caption="Positions directory"
            columns={columns}
            rows={rows}
            rowKey={(position) => position.id}
            loading={loading}
            loadingLabel="Loading positions…"
            sort={sort}
            onSort={changeSort}
            empty={
              <div>
                <p className="text-lg font-medium">
                  {query ? "No matching positions" : "No positions yet"}
                </p>
                <p className="mt-2 text-base text-muted">
                  {query
                    ? "Try another search or clear your search."
                    : "Positions will appear here after they are added."}
                </p>
              </div>
            }
          />

          <TablePagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={filtered.length}
            loading={loading}
            itemLabel="positions"
            ariaLabel="Positions table pagination"
            onPageChange={(nextPage) =>
              setPage(Math.max(1, Math.min(nextPage, totalPages)))
            }
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </section>
      )}

      {form && (
        <PositionFormDialog
            key={form.mode === "edit" ? `edit-${form.position.id}` : "create"}
            position={form.mode === "edit" ? form.position : undefined}
            onClose={() => setForm(null)}
            onSaved={(message) => {
            setForm(null);
            setNotice(message);
            refresh();
            }}
        />
      )}

      {deleteTarget && (
        <DeletePositionDialog
          key={deleteTarget.id}
          position={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onStale={refresh}
          onDeleted={(message) => {
            setDeleteTarget(null);
            setNotice(message);
            refresh();
          }}
        />
      )}
    </div>
  );
}
