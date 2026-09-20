import type { Route } from "./+types/notifications";

import {
  BellIcon,
  CheckCheckIcon,
  CheckIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, data, redirect, useFetcher } from "react-router";
import { toast } from "sonner";

import ConfirmDialog from "~/core/components/confirm-dialog";
import { Button } from "~/core/components/ui/button";
import {
  invalidateRouteDataCache,
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { assertSameOrigin } from "~/features/admin/validation";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "~/features/notifications/notifications.server";

export const meta: Route.MetaFunction = () => [
  { title: `알림 | ${import.meta.env.VITE_APP_NAME}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");
  return { notifications: await getNotifications(user.id) };
}

type NotificationsLoaderData = Awaited<ReturnType<typeof loader>>;
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadCachedRouteData<NotificationsLoaderData>(
    "notifications",
    async () => (await serverLoader()) as NotificationsLoaderData,
  );
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  try {
    if (intent === "mark-all-read") {
      await markAllNotificationsRead(user.id);
      return data({ success: true, error: null });
    }
    if (intent === "delete-all") {
      await deleteAllNotifications(user.id);
      return data({ success: true, error: null });
    }
    if (intent === "delete") {
      const id = Number(formData.get("notificationId"));
      if (!Number.isSafeInteger(id) || id <= 0)
        return data(
          { success: false, error: "삭제할 알림을 확인하지 못했어요." },
          { status: 400 },
        );
      await deleteNotification(user.id, id);
      return data({ success: true, error: null });
    }
    if (intent === "mark-read") {
      const id = Number(formData.get("notificationId"));
      if (!Number.isSafeInteger(id) || id <= 0)
        return data(
          { success: false, error: "알림 정보를 확인하지 못했어요." },
          { status: 400 },
        );
      await markNotificationRead(user.id, id);
      return data({ success: true, error: null });
    }
  } catch {
    return data(
      {
        success: false,
        error: intent.startsWith("delete")
          ? "알림을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."
          : "읽음 상태를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
  throw new Response("Invalid action", { status: 400 });
}

type NotificationItem = Awaited<ReturnType<typeof getNotifications>>[number];

function updateUnreadBadge(delta: number) {
  window.dispatchEvent(
    new CustomEvent("eokka:notification-unread-change", {
      detail: { delta },
    }),
  );
}

function NotificationRow({
  notification,
  onOptimisticRead,
  onRollback,
  onDeleteRequest,
}: {
  notification: NotificationItem;
  onOptimisticRead: (id: number) => void;
  onRollback: (id: number) => void;
  onDeleteRequest: (notification: NotificationItem) => void;
}) {
  const fetcher = useFetcher<typeof action>();
  const submittedRef = useRef(false);
  const requestStartedRef = useRef(false);
  const Icon = notificationIcon(notification.type);

  useEffect(() => {
    if (!submittedRef.current) return;
    if (fetcher.state !== "idle") {
      requestStartedRef.current = true;
      return;
    }
    if (!requestStartedRef.current) return;
    submittedRef.current = false;
    requestStartedRef.current = false;
    if (fetcher.data?.success === false) {
      onRollback(notification.id);
      updateUnreadBadge(1);
      toast.error(fetcher.data.error);
    }
  }, [fetcher.data, fetcher.state, notification.id, onRollback]);

  const content = (
    <div className="flex min-w-0 flex-1 items-start gap-4">
      <span
        className={cn(
          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
          notification.readAt
            ? "bg-muted text-muted-foreground"
            : "bg-emerald-500/12 text-emerald-500",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black">{notification.title}</p>
          {!notification.readAt && (
            <span
              className="size-2 rounded-full bg-emerald-500"
              aria-label="읽지 않은 알림"
            />
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm leading-6 break-words whitespace-pre-wrap">
          {notification.message}
        </p>
        <p className="text-muted-foreground mt-2 text-[11px]">
          {dateTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  return (
    <article
      className={cn(
        "flex items-start gap-3 px-5 py-5 transition-colors sm:px-6",
        !notification.readAt && "bg-emerald-500/[0.035]",
      )}
    >
      {notification.href ? (
        <Link
          to={notification.href}
          className="min-w-0 flex-1 transition-opacity hover:opacity-80"
        >
          {content}
        </Link>
      ) : (
        content
      )}
      <div className="flex shrink-0 items-center gap-1">
        {!notification.readAt && (
          <fetcher.Form
            method="post"
            onSubmit={() => {
              invalidateRouteDataCache("notifications");
              invalidateRouteDataCache("dashboard-layout");
              submittedRef.current = true;
              onOptimisticRead(notification.id);
              updateUnreadBadge(-1);
            }}
          >
            <input
              type="hidden"
              name="notificationId"
              value={notification.id}
            />
            <Button
              type="submit"
              name="intent"
              value="mark-read"
              size="icon"
              variant="ghost"
              title="읽음 처리"
              aria-label="읽음 처리"
            >
              <CheckIcon />
            </Button>
          </fetcher.Form>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="cursor-pointer text-red-500 hover:bg-red-500/10 hover:text-red-500"
          title="알림 삭제"
          aria-label="알림 삭제"
          onClick={() => onDeleteRequest(notification)}
        >
          <Trash2Icon />
        </Button>
      </div>
    </article>
  );
}

function notificationIcon(type: string) {
  if (type.startsWith("support_")) return MessageSquareIcon;
  if (type === "site_announcement") return MegaphoneIcon;
  if (type.includes("deleted")) return Trash2Icon;
  return RefreshCwIcon;
}

function dateTime(value: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Notifications({ loaderData }: Route.ComponentProps) {
  usePrimeRouteDataCache("notifications", loaderData);
  const [notifications, setNotifications] = useState(loaderData.notifications);
  const markAllFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const [deleteTarget, setDeleteTarget] = useState<
    NotificationItem | "all" | null
  >(null);
  const markAllSubmittedRef = useRef(false);
  const markAllRequestStartedRef = useRef(false);
  const previousNotificationsRef = useRef(loaderData.notifications);
  const deleteSubmittedRef = useRef(false);
  const deleteRequestStartedRef = useRef(false);
  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  useEffect(() => {
    setNotifications(loaderData.notifications);
  }, [loaderData.notifications]);

  useEffect(() => {
    if (!markAllSubmittedRef.current) return;
    if (markAllFetcher.state !== "idle") {
      markAllRequestStartedRef.current = true;
      return;
    }
    if (!markAllRequestStartedRef.current) return;
    markAllSubmittedRef.current = false;
    markAllRequestStartedRef.current = false;
    if (markAllFetcher.data?.success === false) {
      const restored = previousNotificationsRef.current;
      const restoredUnreadCount = restored.filter(
        (notification) => !notification.readAt,
      ).length;
      setNotifications(restored);
      updateUnreadBadge(restoredUnreadCount);
      toast.error(markAllFetcher.data.error);
    }
  }, [markAllFetcher.data, markAllFetcher.state]);

  useEffect(() => {
    if (!deleteSubmittedRef.current) return;
    if (deleteFetcher.state !== "idle") {
      deleteRequestStartedRef.current = true;
      return;
    }
    if (!deleteRequestStartedRef.current) return;
    deleteSubmittedRef.current = false;
    deleteRequestStartedRef.current = false;
    if (deleteFetcher.data?.success === false) {
      const restored = previousNotificationsRef.current;
      const currentUnread = notifications.filter(
        (notification) => !notification.readAt,
      ).length;
      const restoredUnread = restored.filter(
        (notification) => !notification.readAt,
      ).length;
      setNotifications(restored);
      updateUnreadBadge(restoredUnread - currentUnread);
      toast.error(deleteFetcher.data.error);
    }
  }, [deleteFetcher.data, deleteFetcher.state, notifications]);

  const markReadOptimistically = (id: number) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, readAt: new Date() }
          : notification,
      ),
    );
  };

  const rollbackRead = (id: number) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, readAt: null }
          : notification,
      ),
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    previousNotificationsRef.current = notifications;
    const removed =
      deleteTarget === "all"
        ? notifications
        : notifications.filter(
            (notification) => notification.id === deleteTarget.id,
          );
    const removedUnread = removed.filter(
      (notification) => !notification.readAt,
    ).length;
    setNotifications((current) =>
      deleteTarget === "all"
        ? []
        : current.filter((notification) => notification.id !== deleteTarget.id),
    );
    if (removedUnread) updateUnreadBadge(-removedUnread);
    deleteSubmittedRef.current = true;
    deleteRequestStartedRef.current = false;
    invalidateRouteDataCache("notifications");
    invalidateRouteDataCache("dashboard-layout");
    const form = new FormData();
    form.set("intent", deleteTarget === "all" ? "delete-all" : "delete");
    if (deleteTarget !== "all")
      form.set("notificationId", String(deleteTarget.id));
    void deleteFetcher.submit(form, { method: "post" });
    setDeleteTarget(null);
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-14 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-emerald-500">
              <BellIcon className="size-4" /> NOTIFICATIONS
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              알림
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              분석 갱신과 기록 변경처럼 놓치면 안 되는 소식을 모아 보여드려요.
            </p>
          </div>
          {(unreadCount > 0 || notifications.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {unreadCount > 0 && (
                <markAllFetcher.Form
                  method="post"
                  onSubmit={() => {
                    invalidateRouteDataCache("notifications");
                    invalidateRouteDataCache("dashboard-layout");
                    previousNotificationsRef.current = notifications;
                    markAllSubmittedRef.current = true;
                    updateUnreadBadge(-unreadCount);
                    setNotifications((current) =>
                      current.map((notification) => ({
                        ...notification,
                        readAt: notification.readAt ?? new Date(),
                      })),
                    );
                  }}
                >
                  <Button
                    name="intent"
                    value="mark-all-read"
                    variant="outline"
                    className="rounded-full"
                  >
                    <CheckCheckIcon /> 모두 읽음
                  </Button>
                </markAllFetcher.Form>
              )}
              {notifications.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-500"
                  onClick={() => setDeleteTarget("all")}
                >
                  <Trash2Icon /> 전체 삭제
                </Button>
              )}
            </div>
          )}
        </header>

        <section className="bg-card mt-7 overflow-hidden rounded-3xl border shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
            <p className="font-black">최근 알림</p>
            <span className="text-muted-foreground rounded-full border px-3 py-1 text-xs font-bold">
              읽지 않음 {unreadCount}개
            </span>
          </div>
          {notifications.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <BellIcon className="size-7" />
              </span>
              <h2 className="mt-5 text-lg font-black">
                아직 새로운 알림이 없어요
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                분석이나 기록에 중요한 변화가 생기면 이곳에서 알려드릴게요.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onOptimisticRead={markReadOptimistically}
                  onRollback={rollbackRead}
                  onDeleteRequest={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={
          deleteTarget === "all"
            ? "모든 알림을 삭제할까요?"
            : "알림을 삭제할까요?"
        }
        description={
          deleteTarget === "all"
            ? "저장된 모든 알림이 삭제되며 복구할 수 없어요."
            : "선택한 알림이 삭제되며 복구할 수 없어요."
        }
        confirmLabel={deleteTarget === "all" ? "전체 삭제" : "알림 삭제"}
        destructive
        busy={deleteFetcher.state !== "idle"}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
