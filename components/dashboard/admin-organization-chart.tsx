"use client";

import { useId } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type AdminOrganizationChartMetrics = {
  branches: number;
  positions: number;
  approvers: number;
  avpStaffAssignments: number;
  branchHeadAssignments: number;
};

type OrganizationSlice = {
  label: string;
  value: number;
  color: string;
};

type OrganizationTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: OrganizationSlice }>;
};

const numberFormatter = new Intl.NumberFormat("en-PH");

function OrganizationTooltip({
  active,
  payload,
}: OrganizationTooltipProps) {
  const slice = payload?.[0]?.payload;

  if (!active || !slice) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="min-w-44 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg"
    >
      <p className="font-medium text-slate-600">{slice.label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
        {numberFormatter.format(slice.value)}
      </p>
    </div>
  );
}

export default function AdminOrganizationChart({
  metrics,
}: {
  metrics: AdminOrganizationChartMetrics;
}) {
  const instructionsId = useId();
  const chartData: OrganizationSlice[] = [
    { label: "Branches", value: metrics.branches, color: "#2563eb" },
    { label: "Positions", value: metrics.positions, color: "#0891b2" },
    { label: "Approvers", value: metrics.approvers, color: "#059669" },
    {
      label: "AVP Staff assignments",
      value: metrics.avpStaffAssignments,
      color: "#7c3aed",
    },
    {
      label: "Branch Head assignments",
      value: metrics.branchHeadAssignments,
      color: "#d97706",
    },
  ];
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <p
        role="status"
        className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted"
      >
        No organization records are available yet.
      </p>
    );
  }

  return (
    <>
      <p id={instructionsId} className="sr-only">
        Donut chart showing the raw record count for branches, positions,
        approvers, AVP Staff assignments, and Branch Head assignments. Use the
        Left and Right Arrow keys to move between categories. A complete list
        follows the chart.
      </p>
      <div
        role="region"
        aria-label="Organization record mix chart"
        className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3 [&_svg:focus-visible]:outline-2 [&_svg:focus-visible]:outline-offset-[-2px] [&_svg:focus-visible]:outline-brand"
      >
        <div className="relative h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart
              aria-label="Organization record mix donut chart"
              aria-describedby={instructionsId}
              accessibilityLayer
            >
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {chartData.map((slice) => (
                  <Cell key={slice.label} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip
                content={<OrganizationTooltip />}
                isAnimationActive={false}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-content-center text-center"
          >
            <span className="text-2xl font-semibold text-ink tabular-nums">
              {numberFormatter.format(total)}
            </span>
            <span className="mt-1 text-xs text-muted">Tracked records</span>
          </div>
        </div>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        {chartData.map((slice) => (
          <div
            key={slice.label}
            className="flex items-center justify-between gap-3"
          >
            <dt className="flex min-w-0 items-center gap-2 text-muted">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="wrap-anywhere">{slice.label}</span>
            </dt>
            <dd className="shrink-0 font-semibold text-ink tabular-nums">
              {numberFormatter.format(slice.value)}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
