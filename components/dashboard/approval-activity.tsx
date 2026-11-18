import type {
  DashboardApprovalData,
  DashboardWeekdayLabel,
} from "@/lib/dashboard";

type ApprovalActivityProps = {
  activity: DashboardApprovalData["activity"] | null;
};

const weekdays: Record<DashboardWeekdayLabel, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

function percentage(value: number, maximum: number): string {
  return maximum === 0 ? "0%" : `${(value / maximum) * 100}%`;
}

export default function ApprovalActivity({
  activity,
}: ApprovalActivityProps) {
  if (!activity) {
    return (
      <section
        aria-labelledby="approval-activity-title"
        className="rounded-2xl border border-line/60 bg-white p-6"
      >
        <h2
          id="approval-activity-title"
          className="text-xl font-semibold"
        >
          Approval Activity
        </h2>
        <p
          role="status"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-base leading-7 text-amber-950"
        >
          Approval activity is currently unavailable. Use the refresh button to
          try again.
        </p>
      </section>
    );
  }

  const monthlyMaximum = Math.max(
    0,
    ...activity.monthly_decisions.flatMap(({ approved, disapproved }) => [
      approved,
      disapproved,
    ]),
  );
  const weeklyMaximum = Math.max(
    0,
    ...activity.weekly_assignments.map(({ total }) => total),
  );
  const hasDecisions = monthlyMaximum > 0;
  const hasAssignments = weeklyMaximum > 0;

  return (
    <section
      aria-labelledby="approval-activity-title"
      className="rounded-2xl border border-line/60 bg-white p-6"
    >
      <h2
        id="approval-activity-title"
        className="text-xl font-semibold"
      >
        Approval Activity
      </h2>
      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="monthly-decisions-title" className="min-w-0">
          <h3
            id="monthly-decisions-title"
            className="text-base font-semibold"
          >
            Monthly decisions
          </h3>
          <ul
            aria-label="Monthly approval decisions"
            className="mt-4 space-y-3"
          >
            {!hasDecisions && (
              <li
                role="status"
                className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted"
              >
                No decisions have been recorded this year.
              </li>
            )}
            {activity.monthly_decisions.map((decision) => (
              <li
                key={decision.month}
                className="rounded-lg border border-slate-100 p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium">{decision.label}</span>
                  <time
                    dateTime={`${decision.month}-01`}
                    className="text-sm text-muted"
                  >
                    {decision.month}
                  </time>
                </div>
                <div className="mt-2 space-y-2">
                  {[
                    {
                      label: "Approved",
                      value: decision.approved,
                      color: "bg-emerald-600",
                    },
                    {
                      label: "Disapproved",
                      value: decision.disapproved,
                      color: "bg-rose-600",
                    },
                  ].map((decisionValue) => (
                    <div
                      key={decisionValue.label}
                      className="grid grid-cols-[minmax(5rem,auto)_minmax(0,1fr)_3rem] items-center gap-2 text-sm"
                    >
                      <span>{decisionValue.label}</span>
                      <span
                        aria-hidden="true"
                        className="h-3 overflow-hidden rounded-full bg-slate-100"
                      >
                        <span
                          className={`block h-full rounded-full ${decisionValue.color}`}
                          style={{
                            width: percentage(
                              decisionValue.value,
                              monthlyMaximum,
                            ),
                          }}
                        />
                      </span>
                      <span className="text-right tabular-nums">
                        {decisionValue.value.toLocaleString()}
                        <span className="sr-only">
                          {" "}
                          {decisionValue.label.toLowerCase()}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div
            aria-label="Monthly decision legend"
            className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 rounded-sm bg-emerald-600"
              />
              Approved
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 rounded-sm bg-rose-600"
              />
              Disapproved
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Bar lengths are scaled to the highest count in this period.
          </p>
        </section>

        <section aria-labelledby="weekly-assignments-title" className="min-w-0">
          <h3
            id="weekly-assignments-title"
            className="text-base font-semibold"
          >
            Weekly assignments
          </h3>
          <ul
            aria-label="Assignments received each day this week"
            className="mt-4 space-y-3"
          >
            {!hasAssignments && (
              <li
                role="status"
                className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted"
              >
                No assignments were received this week.
              </li>
            )}
            {activity.weekly_assignments.map((assignment) => {
              return (
                <li
                  key={assignment.date}
                  className="grid grid-cols-[minmax(5rem,auto)_minmax(0,1fr)_3rem] items-center gap-3 rounded-lg border border-slate-100 p-3"
                >
                  <span>
                    <span className="block font-medium">
                      {weekdays[assignment.label]}
                    </span>
                    <time
                      dateTime={assignment.date}
                      className="text-sm text-muted"
                    >
                      {assignment.date}
                    </time>
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-3 overflow-hidden rounded-full bg-slate-100"
                  >
                    <span
                      className="block h-full rounded-full bg-blue-700"
                      style={{
                        width: percentage(assignment.total, weeklyMaximum),
                      }}
                    />
                  </span>
                  <span className="text-right tabular-nums">
                    {assignment.total.toLocaleString()}
                    <span className="sr-only"> assignments</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div
            aria-label="Weekly assignment legend"
            className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 rounded-sm bg-blue-700"
              />
              Total assignments
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Bar lengths are scaled to the highest count in this period.
          </p>
        </section>
      </div>
    </section>
  );
}
