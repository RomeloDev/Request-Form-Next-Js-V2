type DashboardLoadingProps = {
  title: string;
  approval?: boolean;
};

function MetricCardSkeletons() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
      {Array.from({ length: 5 }, (_, index) => (
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

export default function DashboardLoading({
  title,
  approval = false,
}: DashboardLoadingProps) {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="sr-only">
        Loading {title.toLowerCase()}.
      </p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">WORKSPACE OVERVIEW</p>
          <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
        </div>
        <div
          aria-hidden="true"
          className="h-12 w-40 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none"
        />
      </div>

      <section
        aria-hidden="true"
        className="animate-pulse rounded-3xl border border-blue-200 bg-blue-50 p-8 motion-reduce:animate-none"
      >
        <div className="h-6 w-24 rounded-full bg-blue-100" />
        <div className="mt-6 h-9 w-2/3 max-w-md rounded bg-blue-100" />
        <div className="mt-4 h-5 w-full max-w-2xl rounded bg-blue-100" />
        <div className="mt-6 h-12 w-44 rounded-xl bg-white" />
      </section>

      {approval && (
        <section aria-hidden="true" className="space-y-4">
          <div className="h-7 w-48 rounded bg-slate-200" />
          <MetricCardSkeletons />
        </section>
      )}

      <section aria-hidden="true" className="space-y-4">
        <div className="h-7 w-40 rounded bg-slate-200" />
        <MetricCardSkeletons />
      </section>

      <section
        aria-hidden="true"
        className="h-64 animate-pulse rounded-2xl border border-line/60 bg-white motion-reduce:animate-none"
      />
    </div>
  );
}
