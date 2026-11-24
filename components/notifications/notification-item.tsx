"use client";

import type { NotificationItem as NotificationItemType } from "@/lib/notifications";

function stableTimestamp(value: string | null): string {
  if (!value) return "Time unavailable";

  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );

  if (!match) return "Time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

export default function NotificationItem({
  item,
  markedRead,
  pending,
  onActivate,
}: {
  item: NotificationItemType;
  markedRead: boolean;
  pending: boolean;
  onActivate: (itemId: string) => void;
}) {
  const unread = item.read_at === null && !markedRead;

  return (
    <article>
      <button
        type="button"
        disabled={pending}
        aria-label={`${unread ? "Unread" : "Read"} notification: ${
          item.title?.trim() || "Notification"
        }`}
        onClick={() => onActivate(item.id)}
        className={`flex min-h-20 w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none ${
          unread
            ? "border-brand/30 bg-brand/5 hover:bg-brand/10"
            : "border-slate-100 bg-white hover:bg-slate-50"
        }`}
      >
        {unread ? (
          <span
            aria-hidden="true"
            className="mt-2 size-2.5 shrink-0 rounded-full bg-brand"
          />
        ) : (
          <span
            aria-hidden="true"
            className="mt-2 size-2.5 shrink-0 rounded-full border border-slate-400"
          />
        )}
        <span className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span className="min-w-0 wrap-anywhere text-sm font-semibold text-ink">
              {item.title?.trim() || "Notification"}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                unread
                  ? "bg-brand text-white"
                  : "border border-slate-200 text-muted"
              }`}
            >
              {unread ? "Unread" : "Read"}
            </span>
          </div>
          <span className="mt-1 block wrap-anywhere text-sm leading-5 text-muted">
            {item.message?.trim() || "You have a request update."}
          </span>
          {item.request_code?.trim() && (
            <span className="mt-2 block text-xs font-semibold text-brand">
              Request: {item.request_code}
            </span>
          )}
          {item.actor_name?.trim() && (
            <span className="mt-1 block wrap-anywhere text-xs text-muted">
              From {item.actor_name}
            </span>
          )}
          {item.created_at && (
            <time
              dateTime={item.created_at}
              className="mt-2 block text-xs text-muted"
            >
              {stableTimestamp(item.created_at)}
            </time>
          )}
        </span>
      </button>
    </article>
  );
}
