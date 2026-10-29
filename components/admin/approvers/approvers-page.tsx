"use client";

import {
  useEffect,
  useState,
  useCallback
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import PageHeader from "@/components/layouts/page-header";
import DataTable, {
  type TableColumn,
} from "@/components/ui/data-table";
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
  approverFullName,
  getApprovers,
  type ApproverSort,
  type ApproverUser,
  type PaginationMeta,
} from "@/lib/admin/approvers";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import AddApproverDialog from "@/components/admin/approvers/add-approver-dialog";
import RemoveApproverDialog from "@/components/admin/approvers/remove-approver-dialog";


type Sort = {
  key: ApproverSort;
  direction: "asc" | "desc";
};

const sortableKeys: ApproverSort[] = [
  "id",
  "firstname",
  "email",
  "position",
  "branch",
];

const emptyMeta: PaginationMeta = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};

export default function ApproversPage() {
  const { user } = useSession();
  const router = useRouter();
  const canView = user.role === "Admin";

  const [approvers, setApprovers] = useState<ApproverUser[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [attempt, setAttempt] = useState(0);

  const [search, setSearch] = useState("");


  // Laravel only receives the value after typing pauses.
  const debouncedSearch = useDebouncedValue(
   search.trim(),
   400,
  );

  const [sort, setSort] = useState<Sort>({
    key: "firstname",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const [removeTarget, setRemoveTarget] = useState<ApproverUser | null>(null);

  // Keep the callback stable so the candidate-fetching effect
  // does not restart when the parent page rerenders.
    const closeAddDialog = useCallback(() => {
    setAddOpen(false);
    }, []);

  useEffect(() => {
    if (!canView) return;

    const controller = new AbortController();

    // Defer the state update so the effect itself starts by
    // synchronizing with the external API request.
    const loadingTimer = window.setTimeout(() => {
    if (!controller.signal.aborted) {
        setStatus("loading");
    }
    }, 0);

    // Laravel performs the search, sort, and pagination.
    getApprovers(
      {
        search: debouncedSearch,
        sort: sort.key,
        direction: sort.direction,
        page,
        pageSize,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;

        const lastPage = Math.max(1, result.meta.last_page);

        // A removal can make the current last page disappear.
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setApprovers(result.records);
        setMeta(result.meta);
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

    return () => {
        window.clearTimeout(loadingTimer);
        controller.abort();
    };
  }, [
    attempt,
    canView,
    page,
    pageSize,
    router,
    debouncedSearch,
    sort.direction,
    sort.key,
  ]);

  function refresh() {
    setStatus("loading");
    setAttempt((current) => current + 1);
  }


  function changeSort(key: string) {
    if (!sortableKeys.includes(key as ApproverSort)) return;

    const nextKey = key as ApproverSort;

    setSort((current) => ({
      key: nextKey,
      direction:
        current.key === nextKey &&
        current.direction === "asc"
          ? "desc"
          : "asc",
    }));

    setPage(1);
  }

  const loading = status === "loading";

  const columns: TableColumn<ApproverUser>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (approver) => (
        <span className="text-muted">
          #{approver.id}
        </span>
      ),
    },
    {
      key: "firstname",
      label: "Name",
      sortable: true,
      render: (approver) => (
        <div className="min-w-48">
          <p className="font-medium wrap-anywhere">
            {approverFullName(approver)}
          </p>
          <p className="mt-1 text-sm text-muted wrap-anywhere">
            @{approver.username}
          </p>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (approver) => (
        <span className="wrap-anywhere">
          {approver.email}
        </span>
      ),
    },
    {
      key: "position",
      label: "Position",
      sortable: true,
      render: (approver) => (
        <span className="wrap-anywhere">
          {approver.position}
        </span>
      ),
    },
    {
      key: "branch",
      label: "Company",
      sortable: true,
      render: (approver) => (
        <span className="wrap-anywhere">
          {approver.branch ?? "Not provided"}
        </span>
      ),
    },
    {
      key: "verification",
      label: "Verification",
      render: (approver) => (
        <span
          className={
            approver.email_verified_at
              ? "font-medium text-emerald-700"
              : "font-medium text-amber-700"
          }
        >
          {approver.email_verified_at
            ? "Verified"
            : "Not verified"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (approver) => (
        <RowAction
          label={`Remove ${approverFullName(approver)} as approver`}
          icon="trash"
          tone="danger"
          onClick={() => {
            setNotice("");
            setRemoveTarget(approver);
          }}
        />
      ),
    },
  ];

  if (!canView) {
    return (
      <section className="rounded-2xl border border-line bg-white p-6">
        <h1 className="text-2xl font-semibold">
          Access restricted
        </h1>

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

  return (
    <div className="space-y-7">
      <PageHeader
        title="Approvers"
        eyebrow="ADMINISTRATION"
        description="View users assigned to process requests."
      >
        <RefreshButton
          label="Refresh approvers"
          showLabel
          loading={loading}
          onClick={refresh}
        />

        <button
          type="button"
          title="Add Approvers"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          onClick={() => {
            setNotice("");
            setAddOpen(true);
          }}
        >
          <Icon name="plus" />
          Add Approver
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
        <FormAlert message="We couldn’t load approvers. Check your connection and try Refresh approvers." />
      ) : (
        <section
          aria-labelledby="approvers-list-title"
          className="min-w-0 overflow-hidden rounded-2xl border border-line/60 bg-white shadow-sm"
        >
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="approvers-list-title"
                className="text-xl font-semibold"
              >
                Approver directory
              </h2>

              <p className="text-sm text-muted">
                {loading
                  ? "Loading approvers…"
                  : `${meta.total} approvers`}
              </p>
            </div>

            <div className="max-w-2xl">
                <FormField
                    id="approvers-search"
                    label="Search approvers"
                    type="search"
                    placeholder="Name, email, employee ID, or position"
                    autoComplete="off"
                    value={search}
                    onChange={(event) => {
                    setSearch(event.target.value);

                    // A new search should begin on the first result page.
                    setPage(1);
                    }}
                />
            </div>
          </div>

          <DataTable
            caption="Approvers directory"
            columns={columns}
            rows={approvers}
            rowKey={(approver) => approver.id}
            loading={loading}
            loadingLabel="Loading approvers…"
            sort={sort}
            onSort={changeSort}
            empty={
              <div>
                <p className="text-lg font-medium">
                  {debouncedSearch
                    ? "No matching approvers"
                    : "No approvers yet"}
                </p>

                <p className="mt-2 text-base text-muted">
                  {debouncedSearch
                    ? "Try another search or clear your search."
                    : "Assigned approvers will appear here."}
                </p>
              </div>
            }
          />

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={meta.total}
            loading={loading}
            itemLabel="approvers"
            ariaLabel="Approvers table pagination"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </section>
      )}

        {addOpen && (
            <AddApproverDialog
                onClose={closeAddDialog}
                onAssigned={(message) => {
                setAddOpen(false);
                setNotice(message);

                // Reload the server-paginated Approvers directory.
                refresh();
                }}
            />
        )}

        {removeTarget && (
          <RemoveApproverDialog
            key={removeTarget.id}
            approver={removeTarget}
            onClose={() => setRemoveTarget(null)}
            onStale={refresh}
            onRemoved={(message) => {
              setRemoveTarget(null);
              setNotice(message);

              // Reload the server page instead of removing a row locally.
              refresh();
            }}
          />
        )}
    </div>
  );
}