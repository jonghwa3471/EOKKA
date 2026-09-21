import type { Route } from "./+types/admin";

import {
  BellIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MailIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useFetcher,
  useLocation,
  useNavigation,
  useSubmit,
} from "react-router";
import { z } from "zod";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/core/components/ui/avatar";
import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Input } from "~/core/components/ui/input";
import { Textarea } from "~/core/components/ui/textarea";
import {
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";

import {
  deleteSupportMessage,
  deleteSupportTicket,
  getAdminOverview,
  publishAnnouncement,
  replyToTicket,
  requireAdmin,
  setSupportTicketStatus,
} from "../admin.server";
import SupportThread, {
  statusBadgeClass,
  statusLabels,
} from "../support-thread";
import {
  announcementSchema,
  assertSameOrigin,
  categoryLabels,
  deleteMessageSchema,
  deleteTicketSchema,
  replySchema,
} from "../validation";

export const meta = () => [{ title: "운영 관리 | EOKKA" }];
export const headers = () => ({ "Cache-Control": "private, no-store" });

const announcementTemplates = [
  {
    kind: "general",
    label: "일반 공지",
    title: "EOKKA에서 안내해 드려요",
    body: "[안내 내용]\n• 사용자에게 전달할 내용을 적어 주세요.\n\n[확인해 주세요]\n• 함께 확인해야 할 내용이나 유의사항을 적어 주세요.",
  },
  {
    kind: "update",
    label: "서비스 업데이트",
    title: "EOKKA 업데이트 소식을 알려드려요",
    body: "[무엇이 바뀌었나요?]\n• 변경된 기능을 적어 주세요.\n\n[언제 적용되나요?]\n• 적용 날짜와 시간을 적어 주세요.\n\n[확인해 주세요]\n• 사용자가 알아야 할 내용을 적어 주세요.",
  },
  {
    kind: "maintenance",
    label: "서비스 점검",
    title: "EOKKA 서비스 점검을 안내해 드려요",
    body: "[점검 일시]\n• 시작 시간과 종료 예정 시간을 적어 주세요.\n\n[점검 내용]\n• 점검하는 기능을 적어 주세요.\n\n[이용 안내]\n• 점검 중 이용할 수 없는 기능을 적어 주세요.",
  },
  {
    kind: "event",
    label: "이벤트 안내",
    title: "EOKKA 이벤트가 시작됐어요",
    body: "[이벤트 내용]\n• 혜택을 알기 쉽게 적어 주세요.\n\n[참여 기간]\n• 시작일과 종료일을 적어 주세요.\n\n[참여 방법]\n• 사용자가 따라 할 순서와 주의사항을 적어 주세요.",
  },
] as const;

const announcementKindMeta = {
  general: {
    label: "일반 공지",
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  },
  update: {
    label: "서비스 업데이트",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  maintenance: {
    label: "서비스 점검",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  event: {
    label: "이벤트 안내",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
} as const;

function getAnnouncementKindMeta(kind: string) {
  return announcementKindMeta[
    kind in announcementKindMeta
      ? (kind as keyof typeof announcementKindMeta)
      : "general"
  ];
}
export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").slice(0, 100);
  const rawPage = Number(url.searchParams.get("page") ?? 0);
  const page = Number.isSafeInteger(rawPage)
    ? Math.max(0, Math.min(rawPage, 100000))
    : 0;
  const ticket = url.searchParams.get("ticket");
  const statusFilter = z
    .enum(["all", "open", "answered", "closed"])
    .catch("all")
    .parse(url.searchParams.get("status") ?? "all");
  if (ticket && !z.string().uuid().safeParse(ticket).success)
    throw new Response("잘못된 문의 주소예요.", { status: 400 });
  const overview = await getAdminOverview(search, page);
  if (ticket && !overview.tickets.some((item) => item.id === ticket))
    throw new Response("문의를 찾을 수 없어요.", { status: 404 });
  return {
    ...overview,
    search,
    page,
    initialTicketId: ticket,
    statusFilter,
    tab: url.searchParams.get("tab") ?? "inbox",
  };
}

type AdminLoaderData = Awaited<ReturnType<typeof loader>>;
type AdminAnnouncementPage = {
  announcements: AdminLoaderData["announcements"];
  hasMore: boolean;
};
export async function clientLoader({
  request,
  serverLoader,
}: Route.ClientLoaderArgs) {
  return loadCachedRouteData<AdminLoaderData>(
    `admin:${new URL(request.url).search}`,
    async () => serverLoader() as Promise<AdminLoaderData>,
  );
}
export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const user = await requireAdmin(request);
  const form = Object.fromEntries(await request.formData());
  const requestedStatus = new URL(request.url).searchParams.get("status");
  const statusFilter = ["open", "answered", "closed"].includes(
    requestedStatus ?? "",
  )
    ? `&status=${requestedStatus}`
    : "";
  const inboxUrl = (ticket?: string) =>
    `/dashboard/admin?tab=inbox${statusFilter}${ticket ? `&ticket=${ticket}` : ""}`;
  try {
    if (form.intent === "delete-ticket") {
      const parsed = deleteTicketSchema.safeParse(form);
      if (!parsed.success)
        return data({ error: "삭제할 문의를 확인해 주세요." }, { status: 400 });
      await deleteSupportTicket(user.id, parsed.data.ticket, true);
      return redirect(inboxUrl());
    }
    if (form.intent === "delete-message") {
      const parsed = deleteMessageSchema.safeParse(form);
      if (!parsed.success)
        return data({ error: "삭제할 댓글을 확인해 주세요." }, { status: 400 });
      await deleteSupportMessage(
        user.id,
        parsed.data.ticket,
        parsed.data.message,
        true,
      );
      return redirect(inboxUrl(parsed.data.ticket));
    }
    if (form.intent === "reply") {
      const parsed = replySchema.safeParse(form);
      if (!parsed.success)
        return data(
          { error: "답변은 1~5,000자로 입력해 주세요." },
          { status: 400 },
        );
      await replyToTicket(user.id, parsed.data.ticket, parsed.data.body, true);
      return redirect(inboxUrl(parsed.data.ticket));
    }
    if (form.intent === "status") {
      const parsed = z
        .object({
          ticket: z.string().uuid(),
          status: z.enum(["open", "closed"]),
        })
        .safeParse(form);
      if (!parsed.success)
        return data({ error: "문의 상태를 확인해 주세요." }, { status: 400 });
      await setSupportTicketStatus(parsed.data.ticket, parsed.data.status);
      return redirect(inboxUrl(parsed.data.ticket));
    }
    if (form.intent === "announce") {
      const parsed = announcementSchema.safeParse(form);
      if (!parsed.success)
        return data(
          {
            error:
              parsed.error.issues[0]?.message ??
              "공지 대상과 내용을 확인해 주세요.",
          },
          { status: 400 },
        );
      await publishAnnouncement(user.id, parsed.data);
      return redirect("/dashboard/admin?tab=announcements");
    }
    return data({ error: "지원하지 않는 요청이에요." }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) throw error;
    const expected =
      error instanceof Error && /^(잠시 후|종료된 문의)/.test(error.message);
    if (!expected) console.error("Admin action failed", error);
    return data(
      {
        error: expected
          ? (error as Error).message
          : "처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
      },
      { status: 400 },
    );
  }
}
export default function Admin({
  loaderData: d,
  actionData,
}: Route.ComponentProps) {
  const location = useLocation();
  usePrimeRouteDataCache(`admin:${location.search}`, d);
  const [confirm, setConfirm] = useState(false);
  const [announcementAudience, setAnnouncementAudience] = useState<
    "all" | "user"
  >("all");
  const [announcementRecipientIds, setAnnouncementRecipientIds] = useState<
    string[]
  >([]);
  const [announcementRecipientSearch, setAnnouncementRecipientSearch] =
    useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [selectedAnnouncementTemplate, setSelectedAnnouncementTemplate] =
    useState<string | null>(null);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<
    string | null
  >(null);
  const [displayedAnnouncements, setDisplayedAnnouncements] = useState(
    d.announcements,
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    d.initialTicketId,
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const requestId = useRef<string | null>(null);
  const submit = useSubmit();
  const announcementFetcher = useFetcher<AdminAnnouncementPage>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const hasMoreAnnouncements =
    announcementFetcher.data?.hasMore ?? d.hasMoreAnnouncements;
  const pendingTab =
    navigation.location?.pathname === "/dashboard/admin"
      ? (new URLSearchParams(navigation.location.search).get("tab") ?? "inbox")
      : null;
  const activeTab = pendingTab ?? d.tab;
  const selectedTicket = useMemo(
    () => d.tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [d.tickets, selectedTicketId],
  );
  const selectedAnnouncement = useMemo(
    () =>
      displayedAnnouncements.find(
        (announcement) => announcement.id === selectedAnnouncementId,
      ) ?? null,
    [displayedAnnouncements, selectedAnnouncementId],
  );
  useEffect(() => {
    setDisplayedAnnouncements(d.announcements);
  }, [d.announcements]);
  useEffect(() => {
    const page = announcementFetcher.data;
    if (!page) return;
    setDisplayedAnnouncements((current) => {
      const ids = new Set(current.map((announcement) => announcement.id));
      return [
        ...current,
        ...page.announcements.filter(
          (announcement) => !ids.has(announcement.id),
        ),
      ];
    });
  }, [announcementFetcher.data]);
  const filteredTickets = useMemo(
    () =>
      d.statusFilter === "all"
        ? d.tickets
        : d.tickets.filter((ticket) => ticket.status === d.statusFilter),
    [d.statusFilter, d.tickets],
  );
  const selectedUser = useMemo(() => {
    const user = d.users.find((item) => item.id === selectedUserId);
    if (user)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        admin: user.admin,
        pro: user.pro,
        ticket_count: user.ticket_count,
        last_active_on: user.last_active_on,
        joined_at: user.created_at,
      };
    const ticket = d.tickets.find((item) => item.user_id === selectedUserId);
    return ticket
      ? {
          id: ticket.user_id,
          name: ticket.name,
          email: ticket.email,
          avatar_url: ticket.avatar_url,
          admin: ticket.admin,
          pro: ticket.pro,
          ticket_count: ticket.ticket_count,
          last_active_on: ticket.last_active_on,
          joined_at: ticket.joined_at,
        }
      : null;
  }, [d.tickets, d.users, selectedUserId]);
  const selectedAnnouncementRecipients = d.announcementRecipients.filter(
    (user) => announcementRecipientIds.includes(user.id),
  );
  const filteredAnnouncementRecipients = useMemo(() => {
    const query = announcementRecipientSearch.trim().toLocaleLowerCase("ko");
    return d.announcementRecipients
      .filter(
        (user) =>
          !announcementRecipientIds.includes(user.id) &&
          (!query ||
            user.name.toLocaleLowerCase("ko").includes(query) ||
            user.email.toLocaleLowerCase("ko").includes(query)),
      )
      .slice(0, 6);
  }, [
    announcementRecipientIds,
    announcementRecipientSearch,
    d.announcementRecipients,
  ]);
  useEffect(() => {
    requestId.current = null;
    formRef.current?.reset();
    setAnnouncementAudience("all");
    setAnnouncementRecipientIds([]);
    setAnnouncementRecipientSearch("");
    setAnnouncementTitle("");
    setAnnouncementBody("");
    setSelectedAnnouncementTemplate(null);
  }, [d.announcements[0]?.id]);
  useEffect(() => {
    setSelectedTicketId(d.initialTicketId);
  }, [d.initialTicketId]);
  const panel = "rounded-3xl border bg-card p-5 sm:p-7";
  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 p-5 sm:p-8">
      <header>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-500">
          <ShieldCheckIcon className="size-5" />
          ADMIN ONLY
        </div>
        <h1 className="text-3xl font-black">EOKKA 운영 관리</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          사용자의 목소리를 듣고, 달라진 EOKKA를 알려 주세요.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-4">
        <div className={panel}>
          <p className="text-muted-foreground text-sm">전체 사용자</p>
          <strong className="mt-2 block text-3xl">
            {d.counts?.users ?? 0}
            <span className="ml-1 text-sm">명</span>
          </strong>
        </div>
        <div className={panel}>
          <p className="text-muted-foreground text-sm">답변을 기다리는 문의</p>
          <strong className="mt-2 block text-3xl text-emerald-500">
            {d.counts?.open ?? 0}
            <span className="ml-1 text-sm">건</span>
          </strong>
        </div>
      </div>
      <nav aria-label="관리자 메뉴" className="flex flex-wrap gap-2">
        {[
          { key: "inbox", label: "문의함", icon: MessagesSquareIcon },
          { key: "users", label: "사용자", icon: UsersIcon },
          { key: "announcements", label: "전체 공지", icon: MegaphoneIcon },
        ].map((item) => (
          <Button
            key={item.key}
            asChild
            variant={activeTab === item.key ? "default" : "outline"}
          >
            <Link to={`/dashboard/admin?tab=${item.key}`}>
              <item.icon className="size-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      {actionData?.error && (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500"
        >
          {actionData.error}
        </p>
      )}
      {activeTab === "inbox" && (
        <>
          <section className="bg-card overflow-hidden rounded-3xl border">
            <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <h2 className="font-bold">문의함</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  필터 결과 {filteredTickets.length}건 · 최신 작성순
                </p>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="문의 상태 필터">
                {[
                  ["all", "전체"],
                  ["open", "답변 대기"],
                  ["answered", "답변 완료"],
                  ["closed", "종료"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    asChild
                    size="sm"
                    variant={d.statusFilter === value ? "default" : "outline"}
                  >
                    <Link
                      to={`/dashboard/admin?tab=inbox${value === "all" ? "" : `&status=${value}`}`}
                      preventScrollReset
                    >
                      {label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
            {!filteredTickets.length ? (
              <p className="text-muted-foreground px-6 py-20 text-center text-sm">
                해당 상태의 문의가 없어요.
              </p>
            ) : (
              <ul className="divide-y">
                {filteredTickets.map((ticket) => (
                  <li key={ticket.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      className="hover:bg-muted/50 focus-visible:ring-ring grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset sm:grid-cols-[100px_minmax(0,1fr)_88px_110px_100px_16px] sm:px-7"
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.currentTarget === event.target &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          setSelectedTicketId(ticket.id);
                        }
                      }}
                    >
                      <span className="hidden text-xs font-bold text-emerald-500 sm:block">
                        {
                          categoryLabels[
                            ticket.category as keyof typeof categoryLabels
                          ]
                        }
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">
                          {ticket.title}
                        </span>
                        <span className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs sm:hidden">
                          <button
                            type="button"
                            className="hover:text-foreground max-w-28 cursor-pointer truncate underline decoration-dotted underline-offset-4"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedUserId(ticket.user_id);
                            }}
                          >
                            {ticket.name}
                          </button>
                          <time className="shrink-0 whitespace-nowrap">
                            {new Date(ticket.created_at).toLocaleDateString(
                              "ko-KR",
                            )}
                          </time>
                        </span>
                      </span>
                      <span
                        className={`inline-flex min-w-20 items-center justify-center justify-self-stretch rounded-full px-2.5 py-1 text-center text-xs font-semibold ${statusBadgeClass(ticket.status)}`}
                      >
                        {statusLabels[ticket.status]}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground hidden cursor-pointer truncate text-left text-xs underline decoration-dotted underline-offset-4 sm:block"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedUserId(ticket.user_id);
                        }}
                      >
                        {ticket.name}
                      </button>
                      <time className="text-muted-foreground hidden text-xs whitespace-nowrap sm:block">
                        {new Date(ticket.created_at).toLocaleDateString(
                          "ko-KR",
                        )}
                      </time>
                      <ChevronRightIcon className="text-muted-foreground hidden size-4 sm:block" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Dialog
            open={Boolean(selectedTicket)}
            onOpenChange={(open) => {
              if (open) return;
              setSelectedTicketId(null);
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl p-0 sm:max-w-2xl">
              <DialogTitle className="sr-only">문의 관리</DialogTitle>
              <DialogDescription className="sr-only">
                문의 내용을 확인하고 답변하거나 문의를 종료할 수 있어요.
              </DialogDescription>
              {selectedTicket && (
                <>
                  <SupportThread
                    thread={{
                      ticket: {
                        ...selectedTicket,
                        authorName: selectedTicket.name,
                        authorAvatarUrl: selectedTicket.avatar_url,
                      },
                      messages: selectedTicket.messages.map(
                        (message, index) => ({
                          ...message,
                          canDelete: index > 0,
                        }),
                      ),
                    }}
                    staff
                    canDeleteTicket
                    onAuthorClick={() =>
                      setSelectedUserId(selectedTicket.user_id)
                    }
                  />
                  <div className="flex flex-col-reverse gap-3 px-7 pb-7 sm:flex-row sm:items-center sm:justify-between">
                    <Button asChild variant="ghost">
                      <Link
                        to={`/contact?focus=${selectedTicket.id}#inquiry-${selectedTicket.id}`}
                      >
                        문의하기 페이지에서 보기
                        <ExternalLinkIcon className="size-4" />
                      </Link>
                    </Button>
                    <Form method="post">
                      <input type="hidden" name="intent" value="status" />
                      <input
                        type="hidden"
                        name="ticket"
                        value={selectedTicket.id}
                      />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          selectedTicket.status === "closed" ? "open" : "closed"
                        }
                      />
                      <Button disabled={busy} variant="outline">
                        {selectedTicket.status === "closed"
                          ? "문의 다시 열기"
                          : "문의 종료하기"}
                      </Button>
                    </Form>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
      {activeTab === "users" && (
        <section className={panel}>
          <h2 className="mb-2 text-lg font-bold">사용자 현황</h2>
          <p className="text-muted-foreground mb-5 text-sm">
            가입·활동·구독 상태를 확인해요. 관리자 권한은 이 화면에서 변경할 수
            없어요.
          </p>
          <Form method="get" className="mb-5 flex gap-2">
            <input type="hidden" name="tab" value="users" />
            <Input
              aria-label="사용자 검색"
              name="q"
              defaultValue={d.search}
              placeholder="이름 또는 이메일 검색"
              maxLength={100}
            />
            <Button>검색</Button>
          </Form>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground border-b">
                <tr>
                  {["사용자", "이메일", "상태", "최근 활동", "가입일"].map(
                    (s) => (
                      <th key={s} className="p-3 whitespace-nowrap">
                        {s}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {d.users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-3 font-bold whitespace-nowrap">
                      <button
                        type="button"
                        className="group flex cursor-pointer items-center gap-2.5 text-left hover:text-emerald-500"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        <Avatar className="ring-border size-8 shrink-0 ring-1 transition-transform group-hover:scale-105">
                          <AvatarImage
                            src={u.avatar_url ?? undefined}
                            alt={`${u.name} 프로필`}
                          />
                          <AvatarFallback className="text-xs font-black">
                            {u.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="underline decoration-dotted underline-offset-4">
                          {u.name}
                        </span>
                      </button>
                    </td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3 whitespace-nowrap">
                      {u.admin ? "관리자 · " : ""}
                      {u.pro ? "Pro" : "무료"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {String(u.last_active_on).slice(0, 10)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!d.users.length && (
            <p className="text-muted-foreground py-8 text-center">
              검색 결과가 없어요.
            </p>
          )}
          <div className="mt-5 flex items-center justify-end gap-3">
            {d.page > 0 && (
              <Link
                to={`?tab=users&q=${encodeURIComponent(d.search)}&page=${d.page - 1}`}
              >
                이전
              </Link>
            )}
            <span>{d.page + 1}페이지</span>
            {d.hasMore && (
              <Link
                to={`?tab=users&q=${encodeURIComponent(d.search)}&page=${d.page + 1}`}
              >
                다음
              </Link>
            )}
          </div>
        </section>
      )}
      {activeTab === "announcements" && (
        <div className="flex flex-col gap-6">
          <Form
            ref={formRef}
            method="post"
            className={`${panel} order-2 space-y-4`}
            onSubmit={(event) => {
              event.preventDefault();
              setConfirm(true);
            }}
          >
            <h2 className="text-lg font-bold">사용자에게 공지 보내기</h2>
            <p className="text-muted-foreground text-sm">
              전체 사용자에게 보내거나 여러 명을 선택해 개별 공지를 보낼 수
              있어요. 공지는 앱 알림과 가입 이메일로 함께 전달돼요.
            </p>
            <input type="hidden" name="intent" value="announce" />
            <input type="hidden" name="audience" value={announcementAudience} />
            <input
              type="hidden"
              name="kind"
              value={
                announcementTemplates.find(
                  (template) => template.label === selectedAnnouncementTemplate,
                )?.kind ?? "general"
              }
            />
            <input
              type="hidden"
              name="recipientIds"
              value={announcementRecipientIds.join(",")}
            />
            <div>
              <p className="mb-2 text-sm font-semibold">발송 대상</p>
              <div className="bg-muted/45 grid grid-cols-2 gap-2 rounded-2xl p-1.5">
                {[
                  ["all", "전체 사용자"],
                  ["user", "특정 사용자"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setAnnouncementAudience(value as "all" | "user")
                    }
                    className={
                      "rounded-xl px-4 py-2.5 text-sm font-bold transition " +
                      (announcementAudience === value
                        ? "bg-card text-foreground shadow-sm ring-1 ring-emerald-500/20"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {announcementAudience === "user" && (
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold"
                  htmlFor="notice-recipient"
                >
                  공지받을 사용자
                </label>
                <Input
                  id="notice-recipient"
                  value={announcementRecipientSearch}
                  onChange={(event) =>
                    setAnnouncementRecipientSearch(event.target.value)
                  }
                  placeholder="이름 또는 이메일로 검색"
                />
                {selectedAnnouncementRecipients.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-2">
                    <p className="px-2 pt-1 text-xs font-black text-emerald-600 dark:text-emerald-300">
                      선택한 사용자 {selectedAnnouncementRecipients.length}명
                    </p>
                    {selectedAnnouncementRecipients.map((user) => (
                      <div
                        key={user.id}
                        className="bg-card/75 flex items-center gap-3 rounded-xl p-2"
                      >
                        <Avatar className="size-8">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs font-black">
                            {user.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">
                            {user.name}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {user.email}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setAnnouncementRecipientIds((current) =>
                              current.filter((id) => id !== user.id),
                            )
                          }
                        >
                          제외
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="max-h-56 overflow-y-auto rounded-2xl border p-1.5">
                  {filteredAnnouncementRecipients.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="hover:bg-muted flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition"
                      onClick={() => {
                        setAnnouncementRecipientIds((current) =>
                          current.includes(user.id)
                            ? current
                            : [...current, user.id],
                        );
                        setAnnouncementRecipientSearch("");
                      }}
                    >
                      <Avatar className="size-8">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs font-black">
                          {user.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {user.name}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {user.email}
                        </span>
                      </span>
                    </button>
                  ))}
                  {!filteredAnnouncementRecipients.length && (
                    <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                      일치하는 사용자가 없어요.
                    </p>
                  )}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-semibold">작성 틀 불러오기</p>
              <div className="flex flex-wrap gap-2">
                {announcementTemplates.map((template) => (
                  <Button
                    key={template.label}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedAnnouncementTemplate(template.label);
                      setAnnouncementTitle(template.title);
                      setAnnouncementBody(template.body);
                    }}
                    aria-pressed={
                      selectedAnnouncementTemplate === template.label
                    }
                    className={
                      selectedAnnouncementTemplate === template.label
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 ring-2 ring-emerald-500/15 hover:bg-emerald-500/15 dark:text-emerald-300"
                        : undefined
                    }
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
              <p className="text-muted-foreground mt-2 text-xs leading-5">
                용도에 맞는 틀을 불러온 뒤 예시 문장을 실제 안내 내용으로 바꿔
                주세요.
              </p>
            </div>
            <label
              className="block text-sm font-semibold"
              htmlFor="notice-title"
            >
              공지 제목
            </label>
            <Input
              id="notice-title"
              name="title"
              value={announcementTitle}
              onChange={(event) => setAnnouncementTitle(event.target.value)}
              required
              minLength={2}
              maxLength={100}
              placeholder="EOKKA 업데이트 소식을 알려드려요"
            />
            <label
              className="block text-sm font-semibold"
              htmlFor="notice-body"
            >
              공지 내용
            </label>
            <Textarea
              id="notice-body"
              name="body"
              value={announcementBody}
              onChange={(event) => setAnnouncementBody(event.target.value)}
              required
              minLength={5}
              maxLength={5000}
              rows={10}
              placeholder="어떤 점이 달라졌는지 알기 쉽게 적어 주세요."
            />
            <Button
              disabled={
                busy ||
                (announcementAudience === "user" &&
                  announcementRecipientIds.length === 0)
              }
            >
              {announcementAudience === "all"
                ? "전체 공지 보내기"
                : "개별 공지 보내기"}
            </Button>
          </Form>
          <section className={`${panel} order-1`}>
            <h2 className="text-lg font-bold">발송한 공지 · 최근 20건</h2>
            {!displayedAnnouncements.length && (
              <p className="text-muted-foreground mt-5 text-sm">
                아직 발송한 공지가 없어요.
              </p>
            )}
            <div className="mt-4 max-h-[32rem] divide-y overflow-y-auto pr-1">
              {displayedAnnouncements.map((a) => {
                const kind = getAnnouncementKindMeta(a.kind);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAnnouncementId(a.id)}
                    className="hover:bg-muted/45 grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2 py-3.5 text-left transition-colors first:rounded-t-xl last:rounded-b-xl sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                  >
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black whitespace-nowrap ${kind.className}`}
                    >
                      {kind.label}
                    </span>
                    <span className="min-w-0 truncate text-sm font-bold">
                      {a.title}
                    </span>
                    <span className="text-muted-foreground hidden text-xs whitespace-nowrap sm:block">
                      {a.recipient_user_ids.length
                        ? a.recipient_user_ids.length === 1
                          ? (d.announcementRecipients.find(
                              (user) => user.id === a.recipient_user_ids[0],
                            )?.name ?? "특정 사용자")
                          : `특정 사용자 ${a.recipient_user_ids.length}명`
                        : "전체 사용자"}
                    </span>
                    <time className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(a.created_at).toLocaleDateString("ko-KR", {
                        timeZone: "Asia/Seoul",
                        month: "numeric",
                        day: "numeric",
                      })}
                    </time>
                  </button>
                );
              })}
            </div>
            {hasMoreAnnouncements && (
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full"
                disabled={announcementFetcher.state !== "idle"}
                onClick={() =>
                  announcementFetcher.load(
                    `/api/admin/announcements?offset=${displayedAnnouncements.length}`,
                  )
                }
              >
                {announcementFetcher.state === "loading"
                  ? "불러오는 중..."
                  : "공지 20건 더 불러오기"}
              </Button>
            )}
          </section>
        </div>
      )}
      <Dialog
        open={Boolean(selectedUser)}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader className="pr-8 text-left">
            <div className="flex items-center gap-4">
              <Avatar className="size-14 ring-2 ring-emerald-500/20">
                <AvatarImage
                  src={selectedUser?.avatar_url ?? undefined}
                  alt={`${selectedUser?.name ?? "사용자"} 프로필`}
                />
                <AvatarFallback className="text-lg font-black">
                  {(selectedUser?.name ?? "사용자").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DialogTitle className="truncate text-xl font-black">
                  {selectedUser?.name ?? "사용자"}
                </DialogTitle>
                <DialogDescription className="mt-1 break-all">
                  {selectedUser?.email}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedUser && (
            <dl className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-2xl p-4">
                <dt className="text-muted-foreground text-xs">이용 상태</dt>
                <dd className="mt-1 font-bold">
                  {selectedUser.admin ? "관리자 · " : ""}
                  {selectedUser.pro ? "EOKKA Pro" : "무료"}
                </dd>
              </div>
              <div className="bg-muted/50 rounded-2xl p-4">
                <dt className="text-muted-foreground text-xs">작성 문의</dt>
                <dd className="mt-1 font-bold">
                  {selectedUser.ticket_count}건
                </dd>
              </div>
              <div className="bg-muted/50 rounded-2xl p-4">
                <dt className="text-muted-foreground text-xs">최근 활동</dt>
                <dd className="mt-1 text-sm font-bold">
                  {String(selectedUser.last_active_on).slice(0, 10)}
                </dd>
              </div>
              <div className="bg-muted/50 rounded-2xl p-4">
                <dt className="text-muted-foreground text-xs">가입일</dt>
                <dd className="mt-1 text-sm font-bold">
                  {new Date(selectedUser.joined_at).toLocaleDateString("ko-KR")}
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(selectedAnnouncement)}
        onOpenChange={(open) => !open && setSelectedAnnouncementId(null)}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-3xl sm:max-w-xl">
          {selectedAnnouncement && (
            <>
              <DialogHeader className="pr-8 text-left">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getAnnouncementKindMeta(selectedAnnouncement.kind).className}`}
                  >
                    {getAnnouncementKindMeta(selectedAnnouncement.kind).label}
                  </span>
                  <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-black">
                    {selectedAnnouncement.recipient_user_ids.length
                      ? selectedAnnouncement.recipient_user_ids.length === 1
                        ? (d.announcementRecipients.find(
                            (user) =>
                              user.id ===
                              selectedAnnouncement.recipient_user_ids[0],
                          )?.name ?? "특정 사용자")
                        : `특정 사용자 ${selectedAnnouncement.recipient_user_ids.length}명`
                      : "전체 사용자"}
                  </span>
                </div>
                <DialogTitle className="text-xl leading-snug font-black break-words">
                  {selectedAnnouncement.title}
                </DialogTitle>
                <DialogDescription>
                  {new Date(selectedAnnouncement.created_at).toLocaleString(
                    "ko-KR",
                    { timeZone: "Asia/Seoul" },
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted/35 rounded-2xl border p-5 text-sm leading-7 break-words whitespace-pre-wrap">
                {selectedAnnouncement.body}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-5 text-left sm:px-8">
            <DialogTitle className="text-xl font-black">
              공지 발송 전 미리보기
            </DialogTitle>
            <DialogDescription>
              {announcementAudience === "all"
                ? (d.counts?.users ?? 0) + "명의 사용자에게 전달돼요."
                : "선택한 " +
                  selectedAnnouncementRecipients.length +
                  "명에게만 전달돼요."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 p-6 lg:grid-cols-2 lg:p-8">
            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-black">
                <BellIcon className="size-4 text-emerald-500" />앱 알림 미리보기
              </div>
              <div className="bg-card rounded-3xl border p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                    <MegaphoneIcon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black break-words">
                      {announcementTitle}
                    </p>
                    <p className="text-muted-foreground mt-2 line-clamp-5 text-sm leading-6 whitespace-pre-wrap">
                      {announcementBody}
                    </p>
                    <p className="text-muted-foreground mt-3 text-xs">
                      방금 전
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                알림 목록에서는 긴 내용이 일부만 보이고, 알림을 열면 전체 내용을
                확인할 수 있어요.
              </p>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-black">
                <MailIcon className="size-4 text-violet-500" />
                이메일 미리보기
              </div>
              <div className="overflow-hidden rounded-3xl border border-[#20242b] bg-[#090b0f] p-4 text-[#f8fafc] shadow-sm sm:p-6">
                <div className="mx-auto max-w-[560px]">
                  <div className="h-[5px] rounded-t-[18px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500" />
                  <div className="rounded-b-[18px] border border-t-0 border-[#2b3038] bg-[#15181d] px-6 py-7 sm:px-8">
                    <div className="mb-7 flex items-center gap-2.5">
                      <span className="text-base font-extrabold tracking-[0.12em] text-emerald-400">
                        EOKKA
                      </span>
                      <span className="rounded-full border border-[#4b5563] px-2 py-1 text-[10px] font-bold tracking-wider text-[#9ca3af]">
                        EOKKA 소식
                      </span>
                    </div>
                    <h3 className="text-[22px] leading-snug font-black break-words text-white">
                      {announcementTitle}
                    </h3>
                    <p className="mt-3.5 text-sm leading-7 whitespace-pre-wrap text-[#c4c9d1]">
                      {announcementBody}
                    </p>
                    <span className="mt-7 flex w-full items-center justify-center rounded-[10px] bg-[#f8fafc] px-5 py-3.5 text-sm font-bold text-[#111827]">
                      공지 확인하기
                    </span>
                    <div className="my-7 border-t border-[#30353d]" />
                    <p className="text-xs leading-5 text-[#8b93a1]">
                      버튼이 작동하지 않으면 아래 주소를 브라우저에 복사해
                      주세요.
                    </p>
                    <p className="mt-3 text-[11px] leading-5 break-all text-[#67e8f9]">
                      발송 시 사용자의 EOKKA 알림 페이지 주소가 표시돼요.
                    </p>
                  </div>
                  <p className="mt-4 text-center text-[11px] text-[#626a76]">
                    © {new Date().getFullYear()} EOKKA
                  </p>
                </div>
              </div>
            </section>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              다시 수정하기
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!formRef.current) return;
                const form = new FormData(formRef.current);
                requestId.current ??= crypto.randomUUID();
                form.set("id", requestId.current);
                submit(form, { method: "post" });
                setConfirm(false);
              }}
            >
              {announcementAudience === "all"
                ? "모든 사용자에게 발송하기"
                : selectedAnnouncementRecipients.length + "명에게 발송하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
