import { ApiError } from "@/lib/api";

export type DashboardRequestStatus =
  | "Pending"
  | "Ongoing"
  | "Completed"
  | "Disapproved"
  | "Canceled";

export type DashboardPersonalSummary = {
  total: number;
  pending: number;
  ongoing: number;
  completed: number;
  disapproved: number;
  canceled: number;
};

export type DashboardRecentRequest = {
  id: number;
  request_code: string;
  form_type: string;
  status: DashboardRequestStatus;
  branch: {
    branch_code: string;
    branch_name: string;
  };
  created_at: string | null;
};

export type DashboardApprovalSummary = {
  total_assigned: number;
  approved: number;
  awaiting_action: number;
  disapproved: number;
  closed_without_action: number;
};

export type DashboardMonthlyDecision = {
  month: string;
  label: string;
  approved: number;
  disapproved: number;
};

export type DashboardWeekdayLabel =
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Sun";

export type DashboardWeeklyAssignment = {
  date: string;
  label: DashboardWeekdayLabel;
  total: number;
};

export type DashboardApprovalData = {
  summary: DashboardApprovalSummary;
  activity: {
    monthly_decisions: DashboardMonthlyDecision[];
    weekly_assignments: DashboardWeeklyAssignment[];
  };
};

export type DashboardData = {
  personal: {
    summary: DashboardPersonalSummary;
    recent_requests: DashboardRecentRequest[];
  };
  approval: DashboardApprovalData | null;
};

const dashboardRequestStatuses: readonly DashboardRequestStatus[] = [
  "Pending",
  "Ongoing",
  "Completed",
  "Disapproved",
  "Canceled",
];

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const WEEKDAY_LABELS: readonly DashboardWeekdayLabel[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export type DashboardApprovalRequirement = "none" | "required";

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function isNullableString(
  value: unknown,
): value is string | null {
  return value === null || typeof value === "string";
}

function isNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1
  );
}

function isDashboardRequestStatus(
  value: unknown,
): value is DashboardRequestStatus {
  return (
    typeof value === "string" &&
    (dashboardRequestStatuses as readonly string[]).includes(
      value,
    )
  );
}

function isDashboardWeekdayLabel(
  value: unknown,
): value is DashboardWeekdayLabel {
  return (
    typeof value === "string" &&
    WEEKDAY_LABELS.some((label) => label === value)
  );
}

/** Validate an application month such as "2026-01". */
function isMonthString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    MONTH_PATTERN.test(value)
  );
}

/** Validate a calendar date such as "2026-11-16" without shifting it. */
function isCalendarDateString(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const match = DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // setUTCFullYear avoids Date.UTC()'s 1900 offset for years 0-99.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function calendarDateTimestamp(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  return date.getTime();
}

function isCompleteMonthlySeries(
  decisions: readonly DashboardMonthlyDecision[],
): boolean {
  if (decisions.length !== 12) {
    return false;
  }

  const year = decisions[0].month.slice(0, 4);

  return decisions.every(
    (decision, index) =>
      decision.month === `${year}-${String(index + 1).padStart(2, "0")}`,
  );
}

function isCompleteWeeklySeries(
  assignments: readonly DashboardWeeklyAssignment[],
): boolean {
  if (assignments.length !== 7) {
    return false;
  }

  const firstDate = calendarDateTimestamp(assignments[0].date);

  return (
    new Date(firstDate).getUTCDay() === 1 &&
    assignments.every((assignment, index) => {
      if (assignment.label !== WEEKDAY_LABELS[index]) {
        return false;
      }

      return (
        index === 0 ||
        calendarDateTimestamp(assignment.date) -
          calendarDateTimestamp(assignments[index - 1].date) ===
          24 * 60 * 60 * 1000
      );
    })
  );
}

function toDashboardPersonalSummary(
  value: unknown,
): DashboardPersonalSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isNonNegativeInteger(value.total) ||
    !isNonNegativeInteger(value.pending) ||
    !isNonNegativeInteger(value.ongoing) ||
    !isNonNegativeInteger(value.completed) ||
    !isNonNegativeInteger(value.disapproved) ||
    !isNonNegativeInteger(value.canceled)
  ) {
    return null;
  }

  return {
    total: value.total,
    pending: value.pending,
    ongoing: value.ongoing,
    completed: value.completed,
    disapproved: value.disapproved,
    canceled: value.canceled,
  };
}

function toDashboardRecentRequest(
  value: unknown,
): DashboardRecentRequest | null {
  if (!isRecord(value) || !isRecord(value.branch)) {
    return null;
  }

  if (
    !isPositiveInteger(value.id) ||
    typeof value.request_code !== "string" ||
    typeof value.form_type !== "string" ||
    !isDashboardRequestStatus(value.status) ||
    typeof value.branch.branch_code !== "string" ||
    typeof value.branch.branch_name !== "string" ||
    !isNullableString(value.created_at)
  ) {
    return null;
  }

  return {
    id: value.id,
    request_code: value.request_code,
    form_type: value.form_type,
    status: value.status,
    branch: {
      branch_code: value.branch.branch_code,
      branch_name: value.branch.branch_name,
    },
    created_at: value.created_at,
  };
}

function toDashboardApprovalSummary(
  value: unknown,
): DashboardApprovalSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isNonNegativeInteger(value.total_assigned) ||
    !isNonNegativeInteger(value.approved) ||
    !isNonNegativeInteger(value.awaiting_action) ||
    !isNonNegativeInteger(value.disapproved) ||
    !isNonNegativeInteger(value.closed_without_action)
  ) {
    return null;
  }

  return {
    total_assigned: value.total_assigned,
    approved: value.approved,
    awaiting_action: value.awaiting_action,
    disapproved: value.disapproved,
    closed_without_action: value.closed_without_action,
  };
}

function toDashboardMonthlyDecision(
  value: unknown,
): DashboardMonthlyDecision | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isMonthString(value.month) ||
    typeof value.label !== "string" ||
    !isNonNegativeInteger(value.approved) ||
    !isNonNegativeInteger(value.disapproved)
  ) {
    return null;
  }

  return {
    month: value.month,
    label: value.label,
    approved: value.approved,
    disapproved: value.disapproved,
  };
}

function toDashboardWeeklyAssignment(
  value: unknown,
): DashboardWeeklyAssignment | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isCalendarDateString(value.date) ||
    !isDashboardWeekdayLabel(value.label) ||
    !isNonNegativeInteger(value.total)
  ) {
    return null;
  }

  return {
    date: value.date,
    label: value.label,
    total: value.total,
  };
}

function toDashboardApprovalData(
  value: unknown,
): DashboardApprovalData | null {
  if (!isRecord(value) || !isRecord(value.activity)) {
    return null;
  }

  const summary = toDashboardApprovalSummary(value.summary);

  if (!summary) {
    return null;
  }

  if (
    !Array.isArray(value.activity.monthly_decisions) ||
    !Array.isArray(value.activity.weekly_assignments) ||
    value.activity.monthly_decisions.length !== 12 ||
    value.activity.weekly_assignments.length !== 7
  ) {
    return null;
  }

  const monthlyDecisions: DashboardMonthlyDecision[] = [];

  for (const entry of value.activity.monthly_decisions) {
    const decision = toDashboardMonthlyDecision(entry);

    if (!decision) {
      return null;
    }

    monthlyDecisions.push(decision);
  }

  const weeklyAssignments: DashboardWeeklyAssignment[] = [];

  for (const entry of value.activity.weekly_assignments) {
    const assignment = toDashboardWeeklyAssignment(entry);

    if (!assignment) {
      return null;
    }

    weeklyAssignments.push(assignment);
  }

  if (
    !isCompleteMonthlySeries(monthlyDecisions) ||
    !isCompleteWeeklySeries(weeklyAssignments)
  ) {
    return null;
  }

  return {
    summary,
    activity: {
      monthly_decisions: monthlyDecisions,
      weekly_assignments: weeklyAssignments,
    },
  };
}

/**
 * Validate the untrusted dashboard response and rebuild only the fields the
 * UI is allowed to render. Unknown extra fields are dropped, never returned.
 */
export function parseDashboardResponse(
  value: unknown,
  approvalRequirement: DashboardApprovalRequirement,
): DashboardData {
  const unexpectedResponse = () =>
    new ApiError(
      502,
      "The service returned an unexpected dashboard response.",
    );

  if (
    !isRecord(value) ||
    typeof value.message !== "string" ||
    !isRecord(value.data) ||
    !isRecord(value.data.personal)
  ) {
    throw unexpectedResponse();
  }

  const summary = toDashboardPersonalSummary(
    value.data.personal.summary,
  );

  if (
    !summary ||
    !Array.isArray(value.data.personal.recent_requests) ||
    value.data.personal.recent_requests.length > 5
  ) {
    throw unexpectedResponse();
  }

  const recentRequests: DashboardRecentRequest[] = [];

  for (const entry of value.data.personal.recent_requests) {
    const request = toDashboardRecentRequest(entry);

    if (!request) {
      throw unexpectedResponse();
    }

    recentRequests.push(request);
  }

  let approval: DashboardApprovalData | null = null;

  if (approvalRequirement === "none") {
    if (value.data.approval !== null) {
      throw unexpectedResponse();
    }
  } else {
    approval = toDashboardApprovalData(value.data.approval);

    if (!approval) {
      throw unexpectedResponse();
    }
  }

  return {
    personal: {
      summary,
      recent_requests: recentRequests,
    },
    approval,
  };
}
