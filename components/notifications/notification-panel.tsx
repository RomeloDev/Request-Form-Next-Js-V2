"use client";

import {
  useEffect,
  useId,
  useRef,
  type RefObject,
} from "react";
import Icon from "@/components/ui/icon";
import NotificationItem from "@/components/notifications/notification-item";
import type { NotificationPage } from "@/lib/notifications";

export type NotificationPanelPosition = {
  top: number;
  left: number;
  width: number;
  height: number;
  pathname: string;
};

export default function NotificationPanel({
  id,
  page,
  unreadCount,
  markedReadIds,
  pendingMarkIds,
  markAllPending,
  hasPendingMark,
  refreshing,
  loadingMore,
  inlineError,
  completionMessage,
  position,
  trigger,
  onClose,
  onMarkAll,
  onMarkOne,
  onLoadMore,
  onRetry,
}: {
  id: string;
  page: NotificationPage;
  unreadCount: number;
  markedReadIds: ReadonlySet<string>;
  pendingMarkIds: ReadonlySet<string>;
  markAllPending: boolean;
  hasPendingMark: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  inlineError: string;
  completionMessage: string;
  position: NotificationPanelPosition;
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: (restoreFocus?: boolean) => void;
  onMarkAll: () => void;
  onMarkOne: (itemId: string) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();

    const outside = (event: PointerEvent) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(true);
      }
    };

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose, trigger]);

  return (
    <div
      ref={panel}
      id={id}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_#0f172a30]"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold text-ink"
            >
              Notifications
            </h2>
            <p className="mt-1 text-sm text-muted">
              {unreadCount === 0
                ? "No unread notifications"
                : `${unreadCount} unread ${
                    unreadCount === 1
                      ? "notification"
                      : "notifications"
                  }`}
            </p>
          </div>
          <button
            ref={closeButton}
            type="button"
            aria-label="Close notifications"
            onClick={() => onClose(true)}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-2">
          <button
            type="button"
            disabled={
              unreadCount === 0 ||
              markAllPending ||
              hasPendingMark
            }
            onClick={onMarkAll}
            className="min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/5 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markAllPending ? "Marking all as read…" : "Mark all as read"}
          </button>
        </div>

        {refreshing && (
          <p
            aria-live="polite"
            className="border-b border-slate-100 px-4 py-2 text-sm text-muted"
          >
            Refreshing notifications…
          </p>
        )}
        {inlineError && (
          <div
            role="alert"
            className="mx-3 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800"
          >
            <p>{inlineError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 min-h-11 rounded-xl border border-rose-300 px-3 py-2 font-semibold hover:bg-white focus-visible:outline-2 focus-visible:outline-brand"
            >
              Retry
            </button>
          </div>
        )}
        <p
          aria-live="polite"
          className="sr-only"
        >
          {completionMessage}
        </p>

        <div
          role="region"
          aria-label="Notifications list"
          className="min-h-0 flex-1 overflow-y-auto p-3"
        >
          {page.data.length === 0 ? (
            <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 px-4 text-center">
              <p className="text-sm text-muted">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {page.data.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  markedRead={markedReadIds.has(item.id)}
                  pending={
                    markAllPending || pendingMarkIds.has(item.id)
                  }
                  onActivate={onMarkOne}
                />
              ))}
              {page.meta.current_page < page.meta.last_page && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={onLoadMore}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-brand hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingMore
                    ? "Loading more notifications…"
                    : "Load more notifications"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
