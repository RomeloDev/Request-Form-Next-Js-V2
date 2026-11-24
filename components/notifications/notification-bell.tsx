"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/ui/icon";
import NotificationPanel, {
  type NotificationPanelPosition,
} from "@/components/notifications/notification-panel";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationRouteForItem,
  type NotificationPage,
} from "@/lib/notifications";
import { ApiError } from "@/lib/api";

export default function NotificationBell({
  initialNotificationPage,
  initialUnreadNotificationCount,
}: {
  initialNotificationPage: NotificationPage;
  initialUnreadNotificationCount: number;
}) {
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const [position, setPosition] =
    useState<NotificationPanelPosition | null>(null);
  const [page, setPage] = useState(initialNotificationPage);
  const [unreadCount, setUnreadCount] = useState(
    initialUnreadNotificationCount,
  );
  const [markedReadIds, setMarkedReadIds] =
    useState<Set<string>>(() => new Set());
  const [pendingMarkIds, setPendingMarkIds] =
    useState<Set<string>>(() => new Set());
  const [markAllPending, setMarkAllPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const refreshController = useRef<AbortController | null>(null);
  const loadController = useRef<AbortController | null>(null);
  const markControllers = useRef<Map<string, AbortController>>(
    new Map(),
  );
  const markAllController = useRef<AbortController | null>(null);
  const refreshSequence = useRef(0);
  const loadSequence = useRef(0);
  const refreshGeneration = useRef(0);
  const stateEpoch = useRef(0);
  const locallyReadIds = useRef<Set<string>>(new Set());
  const locallyReadTimestamps = useRef<Map<string, string>>(new Map());
  const pendingMarkIdsRef = useRef<Set<string>>(new Set());

  const close = useCallback((restoreFocus = false) => {
    setPosition(null);
    if (restoreFocus) {
      trigger.current?.focus();
    }
  }, []);

  const handleAuthenticationError = useCallback((
    error: ApiError,
  ) => {
    if (error.status === 401 || error.status === 419) {
      close();
      router.replace("/login");
      return true;
    }
    return false;
  }, [close, router]);

  const refreshNotifications =
    useCallback(async (): Promise<void> => {
      refreshController.current?.abort();
      const controller = new AbortController();
      refreshController.current = controller;
      const sequence = ++refreshSequence.current;
      const generation = ++refreshGeneration.current;
      const epoch = stateEpoch.current;
      loadSequence.current++;
      loadController.current?.abort();
      setLoadingMore(false);
      setRefreshing(true);
      setInlineError("");

      try {
        const [nextPage, count] = await Promise.all([
          getNotifications(
            { page: 1, perPage: 10, unreadOnly: false },
            controller.signal,
          ),
          getUnreadNotificationCount(controller.signal),
        ]);

        if (
          controller.signal.aborted ||
          sequence !== refreshSequence.current ||
          generation !== refreshGeneration.current ||
          epoch !== stateEpoch.current
        ) {
          return;
        }

        const mergedPage: NotificationPage = {
          ...nextPage,
          data: nextPage.data.map((item) => {
            if (!locallyReadIds.current.has(item.id)) {
              return item;
            }

            const readAt =
              locallyReadTimestamps.current.get(item.id);
            return {
              ...item,
              read_at: readAt ?? item.read_at,
            };
          }),
        };

        setPage(mergedPage);
        setUnreadCount(count.unread_count);
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException &&
            error.name === "AbortError")
        ) {
          return;
        }

        if (error instanceof ApiError) {
          if (handleAuthenticationError(error)) return;
          setInlineError(
            error.status === 403
              ? "You do not have permission to view notifications."
              : "Notifications could not be refreshed.",
          );
        } else {
          setInlineError("Notifications could not be refreshed.");
        }
      } finally {
        if (
          sequence === refreshSequence.current &&
          !controller.signal.aborted
        ) {
          setRefreshing(false);
        }
      }
    }, [handleAuthenticationError]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (loadingMore) return;
    if (
      page.meta.current_page >= page.meta.last_page
    ) {
      return;
    }

    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const sequence = ++loadSequence.current;
    const generation = refreshGeneration.current;
    const epoch = stateEpoch.current;
    setLoadingMore(true);
    setInlineError("");

    try {
      const nextPage = await getNotifications(
        {
          page: page.meta.current_page + 1,
          perPage: 10,
          unreadOnly: false,
        },
        controller.signal,
      );

      if (
        controller.signal.aborted ||
        sequence !== loadSequence.current ||
        generation !== refreshGeneration.current ||
        epoch !== stateEpoch.current
      ) {
        return;
      }

      setPage((current) => {
        const knownIds = new Set(
          current.data.map((item) => item.id),
        );
        const appended = nextPage.data.filter(
          (item) => !knownIds.has(item.id),
        );

        return {
          ...nextPage,
          data: [...current.data, ...appended],
        };
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException &&
          error.name === "AbortError")
      ) {
        return;
      }

      if (error instanceof ApiError) {
        if (handleAuthenticationError(error)) return;
        setInlineError(
          error.status === 403
            ? "You do not have permission to view notifications."
            : "More notifications could not be loaded.",
        );
      } else {
        setInlineError("More notifications could not be loaded.");
      }
    } finally {
      if (sequence === loadSequence.current) {
        setLoadingMore(false);
      }
    }
  }, [
    handleAuthenticationError,
    loadingMore,
    page.meta.current_page,
    page.meta.last_page,
  ]);

  const open = () => {
    const bounds = trigger.current?.getBoundingClientRect();
    if (!bounds) return;

    const width = Math.min(400, window.innerWidth - 32);
    const height = Math.min(560, window.innerHeight - 32);
    const left = Math.max(
      16,
      Math.min(
        bounds.right - width,
        window.innerWidth - width - 16,
      ),
    );
    const below = bounds.bottom + 10;
    const top =
      below + height <= window.innerHeight - 16
        ? below
        : Math.max(16, bounds.top - height - 10);

    setPosition({
      top,
      left,
      width,
      height,
      pathname,
    });
    void refreshNotifications();
  };

  useEffect(() => {
    if (!position || position.pathname !== pathname) return;

    const resize = () => close();
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, [close, pathname, position]);

  useEffect(() => {
    const activeMarkControllers = markControllers.current;

    const refreshWhenActive = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    };
    const visibilityChanged = () => refreshWhenActive();
    const interval = window.setInterval(() => {
      refreshWhenActive();
    }, 60_000);

    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("notifications-changed", refreshWhenActive);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("notifications-changed", refreshWhenActive);
      refreshController.current?.abort();
      loadController.current?.abort();
      for (const controller of activeMarkControllers.values()) {
        controller.abort();
      }
      activeMarkControllers.clear();
      markAllController.current?.abort();
    };
  }, [refreshNotifications]);

  async function handleMarkAll() {
    if (
      markAllPending ||
      pendingMarkIdsRef.current.size > 0 ||
      unreadCount === 0
    ) {
      return;
    }

    setMarkAllPending(true);
    setInlineError("");
    setCompletionMessage("");
    markAllController.current?.abort();
    const controller = new AbortController();
    markAllController.current = controller;

    try {
      await markAllNotificationsRead(controller.signal);
      if (controller.signal.aborted) return;

      stateEpoch.current++;
      refreshController.current?.abort();
      loadController.current?.abort();
      setUnreadCount(0);
      const allIds = new Set(page.data.map((item) => item.id));
      locallyReadIds.current = allIds;
      setMarkedReadIds(allIds);
      setCompletionMessage("All notifications marked as read.");
      await refreshNotifications();
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException &&
          error.name === "AbortError")
      ) {
        return;
      }
      if (error instanceof ApiError) {
        if (handleAuthenticationError(error)) return;
        setInlineError(
          error.status === 403
            ? "You do not have permission to update notifications."
            : "Notifications could not be marked as read.",
        );
      } else {
        setInlineError("Notifications could not be marked as read.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setMarkAllPending(false);
      }
    }
  }

  async function handleMarkOne(
    itemId: string,
  ): Promise<void> {
    const item = page.data.find(
      (candidate) => candidate.id === itemId,
    );
    if (!item || markAllPending) return;

    const route = notificationRouteForItem(item);
    if (item.read_at !== null || markedReadIds.has(item.id)) {
      close();
      if (route) router.push(route);
      return;
    }

    if (pendingMarkIdsRef.current.has(item.id)) return;

    pendingMarkIdsRef.current = new Set(
      pendingMarkIdsRef.current,
    ).add(item.id);
    setPendingMarkIds(new Set(pendingMarkIdsRef.current));
    setInlineError("");
    setCompletionMessage("");
    refreshController.current?.abort();
    refreshSequence.current++;
    setRefreshing(false);
    const controller = new AbortController();
    markControllers.current.set(item.id, controller);

    try {
      const updated = await markNotificationRead(
        item.id,
        controller.signal,
      );
      if (controller.signal.aborted) return;

      stateEpoch.current++;
      locallyReadIds.current =
        new Set(locallyReadIds.current).add(item.id);
      if (updated.read_at) {
        locallyReadTimestamps.current.set(
          item.id,
          updated.read_at,
        );
      }
      setMarkedReadIds(new Set(locallyReadIds.current));
      setPage((current) => ({
        ...current,
        data: current.data.map((candidate) =>
          candidate.id === item.id
            ? updated
            : candidate,
        ),
      }));
      setUnreadCount((current) =>
        item.read_at === null
          ? Math.max(0, current - 1)
          : current,
      );
      setCompletionMessage("Notification marked as read.");
      close();
      if (route) router.push(route);
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException &&
          error.name === "AbortError")
      ) {
        return;
      }
      if (error instanceof ApiError) {
        if (handleAuthenticationError(error)) return;
        setInlineError(
          error.status === 403
            ? "You do not have permission to update this notification."
            : "This notification could not be marked as read.",
        );
      } else {
        setInlineError(
          "This notification could not be marked as read.",
        );
      }
    } finally {
      if (markControllers.current.get(item.id) === controller) {
        markControllers.current.delete(item.id);
      }
      const nextPending = new Set(pendingMarkIdsRef.current);
      nextPending.delete(item.id);
      pendingMarkIdsRef.current = nextPending;
      setPendingMarkIds(new Set(nextPending));
    }
  }

  const badge =
    unreadCount === 0
      ? null
      : unreadCount > 99
        ? "99+"
        : String(unreadCount);
  const isOpen =
    position !== null &&
    position.pathname === pathname;

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        onClick={() => isOpen ? close() : open()}
        className="relative grid size-12 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-ink shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Icon name="bell" className="size-5" />
        {badge && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 inline-flex min-w-5 min-h-5 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[10px] font-bold leading-none text-white"
          >
            {badge}
          </span>
        )}
      </button>
      {isOpen && position && (
        <NotificationPanel
          id={id}
          page={page}
          unreadCount={unreadCount}
          markedReadIds={markedReadIds}
          pendingMarkIds={pendingMarkIds}
          markAllPending={markAllPending}
          hasPendingMark={pendingMarkIds.size > 0}
          refreshing={refreshing}
          loadingMore={loadingMore}
          inlineError={inlineError}
          completionMessage={completionMessage}
          position={position}
          trigger={trigger}
          onClose={close}
          onMarkAll={handleMarkAll}
          onMarkOne={handleMarkOne}
          onLoadMore={loadMore}
          onRetry={() => {
            void refreshNotifications();
          }}
        />
      )}
    </div>
  );
}
