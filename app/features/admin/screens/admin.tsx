import type { Route } from "./+types/admin";

import { eq } from "drizzle-orm";
import {
  ChevronRightIcon,
  ExternalLinkIcon,
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
  useNavigation,
  useSubmit,
} from "react-router";
import { z } from "zod";

import ConfirmDialog from "~/core/components/confirm-dialog";
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
import db from "~/core/db/drizzle-client.server";

import {
  deleteSupportMessage,
  deleteSupportTicket,
  getAdminOverview,
  publishAnnouncement,
  replyToTicket,
  requireAdmin,
} from "../admin.server";
import { supportTickets } from "../schema";
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
      await db
        .update(supportTickets)
        .set({ status: parsed.data.status, updated_at: new Date() })
        .where(eq(supportTickets.id, parsed.data.ticket));
      return redirect(inboxUrl(parsed.data.ticket));
    }
    if (form.intent === "announce") {
      const parsed = announcementSchema.safeParse(form);
      if (!parsed.success)
        return data(
          { error: "제목은 2~100자, 내용은 5~5,000자로 입력해 주세요." },
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
  const [confirm, setConfirm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    d.initialTicketId,
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const requestId = useRef<string | null>(null);
  const submit = useSubmit();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const pendingTab =
    navigation.location?.pathname === "/dashboard/admin"
      ? (new URLSearchParams(navigation.location.search).get("tab") ?? "inbox")
      : null;
  const activeTab = pendingTab ?? d.tab;
  const selectedTicket = useMemo(
    () => d.tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [d.tickets, selectedTicketId],
  );
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
  useEffect(() => {
    requestId.current = null;
    formRef.current?.reset();
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
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Form
            ref={formRef}
            method="post"
            className={`${panel} space-y-4`}
            onSubmit={(event) => {
              event.preventDefault();
              setConfirm(true);
            }}
          >
            <h2 className="text-lg font-bold">전체 사용자에게 공지</h2>
            <p className="text-muted-foreground text-sm">
              패치 내용과 서비스 안내를 모든 기존 사용자의 알림함에 보내요.
              이메일은 발송하지 않아요.
            </p>
            <input type="hidden" name="intent" value="announce" />
            <label
              className="block text-sm font-semibold"
              htmlFor="notice-title"
            >
              공지 제목
            </label>
            <Input
              id="notice-title"
              name="title"
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
              required
              minLength={5}
              maxLength={5000}
              rows={8}
              placeholder="어떤 점이 달라졌는지 알기 쉽게 적어 주세요."
            />
            <Button disabled={busy}>전체 공지 보내기</Button>
          </Form>
          <section className={`${panel} space-y-5`}>
            <h2 className="text-lg font-bold">발송한 공지 · 최근 20건</h2>
            {!d.announcements.length && (
              <p className="text-muted-foreground text-sm">
                아직 발송한 공지가 없어요.
              </p>
            )}
            {d.announcements.map((a) => (
              <article key={a.id} className="border-b pb-5 last:border-0">
                <h3 className="font-bold break-words">{a.title}</h3>
                <p className="text-muted-foreground my-2 text-xs">
                  {new Date(a.created_at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </p>
                <p className="text-sm leading-7 break-words whitespace-pre-wrap">
                  {a.body}
                </p>
              </article>
            ))}
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
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="전체 공지를 발송할까요?"
        description={
          <>
            <strong>{d.counts?.users ?? 0}명의 사용자</strong>에게 사이트 알림이
            전달돼요. 발송한 알림은 회수할 수 없으니 내용을 확인해 주세요.
          </>
        }
        confirmLabel="모든 사용자에게 보내기"
        busy={busy}
        onConfirm={() => {
          if (!formRef.current) return;
          const form = new FormData(formRef.current);
          requestId.current ??= crypto.randomUUID();
          form.set("id", requestId.current);
          submit(form, { method: "post" });
          setConfirm(false);
        }}
      />
    </main>
  );
}
