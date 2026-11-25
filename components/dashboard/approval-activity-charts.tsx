"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DashboardMonthlyDecision,
  DashboardWeekdayLabel,
  DashboardWeeklyAssignment,
} from "@/lib/dashboard";

export type ApprovalActivityChartsProps = {
  monthlyDecisions: DashboardMonthlyDecision[];
  weeklyAssignments: DashboardWeeklyAssignment[];
};

const axisTick = { fill: "#475569", fontSize: 12 };
const approvedColor = "#059669";
const disapprovedColor = "#e11d48";
const weeklyColor = "#1d4ed8";

const weekdayNames: Record<DashboardWeekdayLabel, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

type MonthlyDecisionsTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: DashboardMonthlyDecision }>;
};

function MonthlyDecisionsTooltip({
  active,
  payload,
}: MonthlyDecisionsTooltipProps) {
  const decision = payload?.[0]?.payload;

  if (!active || !decision) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="min-w-44 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg"
    >
      <p className="font-semibold text-slate-900">
        {decision.label}{" "}
        <span className="font-normal text-slate-500">
          ({decision.month})
        </span>
      </p>
      <dl className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2 text-slate-600">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: approvedColor }}
            />
            Approved total
          </dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {decision.approved}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2 text-slate-600">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: disapprovedColor }}
            />
            Disapproved total
          </dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {decision.disapproved}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function MonthlyDecisionsChart({
  monthlyDecisions,
}: Pick<ApprovalActivityChartsProps, "monthlyDecisions">) {
  const instructionsId = useId();
  // The server validator guarantees twelve consecutive months in order.
  // Sorting defensively keeps the axis chronological if that contract changes.
  const chartData = [...monthlyDecisions].sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  return (
    <>
      <p id={instructionsId} className="sr-only">
        Monthly approval decisions visualization. Use the Left and Right Arrow
        keys to move between months. The tooltip announces the month and the
        approved and disapproved totals. A complete data table follows this
        chart.
      </p>
      <div
        role="region"
        aria-label="Monthly approval decisions chart, scrollable area"
        tabIndex={0}
        className="mt-4 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-100 p-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand [&_svg:focus-visible]:outline-2 [&_svg:focus-visible]:outline-offset-[-2px] [&_svg:focus-visible]:outline-brand"
      >
        <div className="h-80 min-w-[42rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              aria-label="Monthly approval decisions chart"
              aria-describedby={instructionsId}
              data={chartData}
              accessibilityLayer
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid
                stroke="#e2e8f0"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                interval={0}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                width={40}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                content={<MonthlyDecisionsTooltip />}
                isAnimationActive={false}
              />
              <Legend wrapperStyle={{ fontSize: "0.875rem" }} />
              <Bar
                dataKey="approved"
                name="Approved"
                fill={approvedColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              />
              <Bar
                dataKey="disapproved"
                name="Disapproved"
                fill={disapprovedColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

type WeeklyAssignmentsTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: DashboardWeeklyAssignment }>;
};

function WeeklyAssignmentsTooltip({
  active,
  payload,
}: WeeklyAssignmentsTooltipProps) {
  const assignment = payload?.[0]?.payload;

  if (!active || !assignment) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="min-w-44 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg"
    >
      <p className="font-semibold text-slate-900">
        {weekdayNames[assignment.label]}{" "}
        <span className="font-normal text-slate-500">
          ({assignment.label})
        </span>
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{assignment.date}</p>
      <dl className="mt-2 flex items-center justify-between gap-4">
        <dt className="flex items-center gap-2 text-slate-600">
          <span
            aria-hidden="true"
            className="size-2 rounded-full"
            style={{ backgroundColor: weeklyColor }}
          />
          Assignment total
        </dt>
        <dd className="font-semibold tabular-nums text-slate-900">
          {assignment.total}
        </dd>
      </dl>
    </div>
  );
}

export function WeeklyAssignmentsChart({
  weeklyAssignments,
}: Pick<ApprovalActivityChartsProps, "weeklyAssignments">) {
  const instructionsId = useId();
  // The server validator guarantees Monday through Sunday in order.
  // Sorting by date defensively keeps the week chronological.
  const chartData = [...weeklyAssignments].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return (
    <>
      <p id={instructionsId} className="sr-only">
        Weekly assignments visualization. Use the Left and Right Arrow keys to
        move between days. The tooltip announces the weekday, date, and
        assignment total. A complete data table follows this chart.
      </p>
      <div
        role="region"
        aria-label="Weekly assignments chart, scrollable area"
        tabIndex={0}
        className="mt-4 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-100 p-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand [&_svg:focus-visible]:outline-2 [&_svg:focus-visible]:outline-offset-[-2px] [&_svg:focus-visible]:outline-brand"
      >
        <div className="h-64 min-w-[28rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              aria-label="Weekly assignments chart"
              aria-describedby={instructionsId}
              data={chartData}
              accessibilityLayer
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid
                stroke="#e2e8f0"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                interval={0}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                width={40}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                content={<WeeklyAssignmentsTooltip />}
                isAnimationActive={false}
              />
              <Legend wrapperStyle={{ fontSize: "0.875rem" }} />
              <Bar
                dataKey="total"
                name="Assignments"
                fill={weeklyColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
