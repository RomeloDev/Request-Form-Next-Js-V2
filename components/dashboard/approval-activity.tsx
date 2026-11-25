import {
  MonthlyDecisionsChart,
  WeeklyAssignmentsChart,
} from "@/components/dashboard/approval-activity-charts";
import type {
  DashboardApprovalData,
  DashboardMonthlyDecision,
  DashboardWeekdayLabel,
  DashboardWeeklyAssignment,
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

function MonthlyDecisionsTable({
  decisions,
}: {
  decisions: DashboardMonthlyDecision[];
}) {
  return (
    <table className="sr-only">
      <caption>
        Complete monthly approval decision data for the current year: each
        month with its approved and disapproved totals
      </caption>
      <thead>
        <tr>
          <th scope="col">Month</th>
          <th scope="col">Approved</th>
          <th scope="col">Disapproved</th>
        </tr>
      </thead>
      <tbody>
        {decisions.map((decision) => (
          <tr key={decision.month}>
            <th scope="row">
              {decision.label} ({decision.month})
            </th>
            <td>{decision.approved}</td>
            <td>{decision.disapproved}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WeeklyAssignmentsTable({
  assignments,
}: {
  assignments: DashboardWeeklyAssignment[];
}) {
  return (
    <table className="sr-only">
      <caption>
        Complete daily assignment data for this week: each weekday with its
        date and assignment total
      </caption>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Date</th>
          <th scope="col">Assignments</th>
        </tr>
      </thead>
      <tbody>
        {assignments.map((assignment) => (
          <tr key={assignment.date}>
            <th scope="row">{weekdays[assignment.label]}</th>
            <td>{assignment.date}</td>
            <td>{assignment.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
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
          className="text-lg font-semibold"
        >
          Approval Activity
        </h2>
        <p
          role="status"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          Approval activity is currently unavailable. Use the refresh button to
          try again.
        </p>
      </section>
    );
  }

  const hasDecisions = activity.monthly_decisions.some(
    (decision) => decision.approved > 0 || decision.disapproved > 0,
  );
  const hasAssignments = activity.weekly_assignments.some(
    (assignment) => assignment.total > 0,
  );

  return (
    <section
      aria-labelledby="approval-activity-title"
      className="rounded-2xl border border-line/60 bg-white p-6"
    >
      <h2
        id="approval-activity-title"
        className="text-lg font-semibold"
      >
        Approval Activity
      </h2>
      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="monthly-decisions-title" className="min-w-0">
          <h3
            id="monthly-decisions-title"
            className="text-sm font-semibold"
          >
            Monthly decisions
          </h3>
          {!hasDecisions && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted"
            >
              No decisions have been recorded this year.
            </p>
          )}
          {hasDecisions && (
            <MonthlyDecisionsChart
              monthlyDecisions={activity.monthly_decisions}
            />
          )}
          <MonthlyDecisionsTable decisions={activity.monthly_decisions} />
        </section>

        <section aria-labelledby="weekly-assignments-title" className="min-w-0">
          <h3
            id="weekly-assignments-title"
            className="text-sm font-semibold"
          >
            Weekly assignments
          </h3>
          {!hasAssignments && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted"
            >
              No assignments were received this week.
            </p>
          )}
          {hasAssignments && (
            <WeeklyAssignmentsChart
              weeklyAssignments={activity.weekly_assignments}
            />
          )}
          <WeeklyAssignmentsTable assignments={activity.weekly_assignments} />
        </section>
      </div>
    </section>
  );
}
