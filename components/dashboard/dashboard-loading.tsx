type DashboardLoadingProps = {
  title: string;
  variant: "administration" | "personal" | "approval";
};

function MetricCardSkeletons({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-40 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="mt-6 h-10 w-1/2 rounded bg-slate-200" />
          <div className="mt-5 h-4 w-4/5 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function SummarySkeleton({
  cards,
  headingWidth = "w-44",
}: {
  cards: number;
  headingWidth?: string;
}) {
  return (
    <section className="space-y-4">
      <div className={`h-7 rounded bg-slate-200 ${headingWidth}`} />
      <MetricCardSkeletons count={cards} />
    </section>
  );
}

function WelcomeSkeleton({ actionCount }: { actionCount: number }) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
      <div className="h-7 w-32 rounded-full bg-blue-100" />
      <div className="mt-5 h-9 w-2/3 max-w-md rounded bg-blue-100" />
      <div className="mt-3 h-5 w-full max-w-2xl rounded bg-blue-100" />
      {actionCount > 0 && (
        <div className="mt-5 flex flex-wrap gap-3">
          {Array.from({ length: actionCount }, (_, index) => (
            <div key={index} className="h-11 w-44 rounded-xl bg-white" />
          ))}
        </div>
      )}
    </section>
  );
}

function RecentRequestsSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl border border-line/60 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-line/60 p-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="h-7 w-48 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-full max-w-sm rounded bg-slate-100" />
        </div>
        <div className="h-11 w-28 shrink-0 rounded-xl bg-slate-200" />
      </div>
      <div className="min-h-72 p-5">
        <div className="h-10 w-full rounded bg-slate-100" />
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="mt-4 h-9 w-full rounded bg-slate-100"
          />
        ))}
      </div>
    </section>
  );
}

function AccountSkeleton() {
  return (
    <section className="rounded-2xl border border-line/60 bg-white p-5">
      <div className="h-7 w-36 rounded bg-slate-200" />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index}>
            <div className="h-4 w-20 rounded bg-slate-100" />
            <div className="mt-2 h-5 w-32 max-w-full rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickLinksSkeleton() {
  return (
    <section className="space-y-4 rounded-2xl border border-line/60 bg-white p-5">
      <div className="h-7 w-56 rounded bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-16 items-center gap-3 rounded-xl border border-line/60 bg-slate-50 p-3"
          >
            <div className="size-10 shrink-0 rounded-xl bg-blue-100" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-28 rounded bg-slate-200" />
              <div className="mt-2 h-4 w-full rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminLifecycleSkeleton() {
  return (
    <section className="rounded-2xl border border-line/60 bg-white p-5">
      <div className="h-7 w-44 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-full max-w-sm rounded bg-slate-100" />
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-32 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-24 max-w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminOrganizationSkeleton() {
  return (
    <section className="rounded-2xl border border-line/60 bg-white p-5">
      <div className="h-7 w-48 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-full rounded bg-slate-100" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-24 rounded-xl bg-emerald-50" />
        <div className="h-24 rounded-xl bg-amber-50" />
      </div>
      <div className="mt-4 h-72 rounded-xl border border-slate-100 bg-slate-50" />
      <div className="mt-4 h-20 rounded-xl bg-amber-50" />
    </section>
  );
}

function ApprovalActivitySkeleton() {
  return (
    <section className="rounded-2xl border border-line/60 bg-white p-6">
      <div className="h-7 w-44 rounded bg-slate-200" />
      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="h-5 w-36 rounded bg-slate-200" />
          <div className="mt-4 h-80 rounded-xl border border-slate-100 bg-slate-50" />
        </div>
        <div className="min-w-0">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="mt-4 h-64 rounded-xl border border-slate-100 bg-slate-50" />
        </div>
      </div>
    </section>
  );
}

export default function DashboardLoading({
  title,
  variant,
}: DashboardLoadingProps) {
  const administration = variant === "administration";
  const approval = variant === "approval";

  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="sr-only">
        Loading {title.toLowerCase()}.
      </p>
      <header className="flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
            {administration ? "ADMINISTRATION OVERVIEW" : "WORKSPACE OVERVIEW"}
          </p>
          <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <div
            aria-hidden="true"
            className="mt-2 h-5 w-full max-w-xl rounded bg-slate-200 motion-safe:animate-pulse"
          />
        </div>
        <div
          aria-hidden="true"
          className="h-11 w-40 rounded-xl bg-slate-200 motion-safe:animate-pulse"
        />
      </header>

      <div
        aria-hidden="true"
        className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        <WelcomeSkeleton actionCount={administration ? 0 : approval ? 2 : 1} />

        {administration ? (
          <>
            <SummarySkeleton cards={4} headingWidth="w-32" />
            <div className="grid items-start gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-8">
                <AdminLifecycleSkeleton />
                <RecentRequestsSkeleton />
              </div>
              <div className="space-y-6 xl:col-span-4">
                <AdminOrganizationSkeleton />
                <QuickLinksSkeleton />
              </div>
            </div>
          </>
        ) : (
          <>
            {approval && <SummarySkeleton cards={5} headingWidth="w-48" />}
            <SummarySkeleton cards={5} headingWidth="w-40" />
            <RecentRequestsSkeleton />
            {approval && <ApprovalActivitySkeleton />}
            <AccountSkeleton />
          </>
        )}
      </div>
    </div>
  );
}
