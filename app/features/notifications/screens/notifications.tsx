import type { Route } from "./+types/notifications";

import {
  BellIcon,
  CheckCheckIcon,
  CheckIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { Form, Link, data, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import {
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

export async function action({ request }: Route.ActionArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  if (intent === "mark-all-read") {
    await markAllNotificationsRead(user.id);
    return data({ success: true });
  }
  if (intent === "mark-read") {
    const id = Number(formData.get("notificationId"));
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new Response("Invalid notification", { status: 400 });
    await markNotificationRead(user.id, id);
    return data({ success: true });
  }
  throw new Response("Invalid action", { status: 400 });
}

function notificationIcon(type: string) {
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
  const unreadCount = loaderData.notifications.filter(
    (notification) => !notification.readAt,
  ).length;

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
          {unreadCount > 0 && (
            <Form method="post">
              <Button
                name="intent"
                value="mark-all-read"
                variant="outline"
                className="rounded-full"
              >
                <CheckCheckIcon /> 모두 읽음
              </Button>
            </Form>
          )}
        </header>

        <section className="bg-card mt-7 overflow-hidden rounded-3xl border shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
            <p className="font-black">최근 알림</p>
            <span className="text-muted-foreground rounded-full border px-3 py-1 text-xs font-bold">
              읽지 않음 {unreadCount}개
            </span>
          </div>
          {loaderData.notifications.length === 0 ? (
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
              {loaderData.notifications.map((notification) => {
                const Icon = notificationIcon(notification.type);
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
                      <p className="text-muted-foreground mt-1 text-sm leading-6">
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
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 px-5 py-5 sm:px-6",
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
                    {!notification.readAt && (
                      <Form method="post" className="shrink-0">
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
                      </Form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
