import type { Route } from "./+types/support";

import {
  ChevronRightIcon,
  MessageSquareHeartIcon,
  PlusIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Form, Link, data, redirect, useNavigation } from "react-router";
import { z } from "zod";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { Input } from "~/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/core/components/ui/select";
import { Textarea } from "~/core/components/ui/textarea";
import makeServerClient from "~/core/lib/supa-client.server";
import {
  addTicket,
  deleteSupportMessage,
  deleteSupportTicket,
  getPublicSupportBoard,
  replyToTicket,
  requireUser,
} from "~/features/admin/admin.server";
import SupportThread, {
  statusBadgeClass,
  statusLabels,
} from "~/features/admin/support-thread";
import {
  assertSameOrigin,
  categoryLabels,
  deleteMessageSchema,
  deleteTicketSchema,
  replySchema,
  ticketSchema,
} from "~/features/admin/validation";

export const meta = () => [{ title: "문의하기 | EOKKA" }];
export const headers = () => ({ "Cache-Control": "private, no-store" });

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  const url = new URL(request.url);
  const initialTicketId = url.searchParams.get("ticket");
  const focusTicketId = url.searchParams.get("focus");
  const rawPage = Number(url.searchParams.get("page") ?? 1);
  const requestedPage =
    Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  if (initialTicketId && !z.string().uuid().safeParse(initialTicketId).success)
    throw new Response("잘못된 문의 주소예요.", { status: 400 });
  if (focusTicketId && !z.string().uuid().safeParse(focusTicketId).success)
    throw new Response("잘못된 문의 주소예요.", { status: 400 });
  const board = await getPublicSupportBoard(
    user?.id,
    requestedPage,
    focusTicketId ?? initialTicketId,
  );
  const { tickets } = board;
  if (
    initialTicketId &&
    !tickets.some((ticket) => ticket.id === initialTicketId)
  )
    throw new Response("문의를 찾을 수 없어요.", { status: 404 });
  if (focusTicketId && !tickets.some((ticket) => ticket.id === focusTicketId))
    throw new Response("문의를 찾을 수 없어요.", { status: 404 });
  return {
    signedIn: Boolean(user),
    ...board,
    initialTicketId,
    focusTicketId,
  };
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const user = await requireUser(request);
  const form = Object.fromEntries(await request.formData());
  try {
    if (form.intent === "delete-ticket") {
      const parsed = deleteTicketSchema.safeParse(form);
      if (!parsed.success)
        return data(
          {
            error: "삭제할 문의를 확인해 주세요.",
            intent: "delete" as const,
            ticket: "",
          },
          { status: 400 },
        );
      await deleteSupportTicket(user.id, parsed.data.ticket, false);
      return redirect("/contact");
    }
    if (form.intent === "delete-message") {
      const parsed = deleteMessageSchema.safeParse(form);
      if (!parsed.success)
        return data(
          {
            error: "삭제할 댓글을 확인해 주세요.",
            intent: "delete" as const,
            ticket: String(form.ticket ?? ""),
          },
          { status: 400 },
        );
      await deleteSupportMessage(
        user.id,
        parsed.data.ticket,
        parsed.data.message,
        false,
      );
      return redirect(`/contact?ticket=${parsed.data.ticket}`);
    }
    if (form.intent === "reply") {
      const parsed = replySchema.safeParse(form);
      if (!parsed.success)
        return data(
          {
            error: "댓글은 1~5,000자로 입력해 주세요.",
            intent: "reply" as const,
            ticket: String(form.ticket ?? ""),
          },
          { status: 400 },
        );
      await replyToTicket(user.id, parsed.data.ticket, parsed.data.body, false);
      return redirect(`/contact?ticket=${parsed.data.ticket}`);
    }
    const parsed = ticketSchema.safeParse(form);
    if (!parsed.success)
      return data(
        {
          error: "제목은 2~100자, 내용은 5~5,000자로 입력해 주세요.",
          intent: "create" as const,
          ticket: "",
        },
        { status: 400 },
      );
    const id = await addTicket(user.id, parsed.data);
    return redirect(`/contact?ticket=${id}`);
  } catch (error) {
    if (error instanceof Response) throw error;
    const expected =
      error instanceof Error &&
      /^(문의는|잠시 후|종료된 문의)/.test(error.message);
    if (!expected) console.error("Support submission failed", error);
    return data(
      {
        error: expected
          ? (error as Error).message
          : "문의 전송에 실패했어요. 잠시 후 다시 시도해 주세요.",
        intent:
          form.intent === "reply" ? ("reply" as const) : ("create" as const),
        ticket: String(form.ticket ?? ""),
      },
      { status: 400 },
    );
  }
}

function date(value: string | Date) {
  return new Date(value).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
}

export default function Support({
  loaderData: d,
  actionData,
}: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    d.initialTicketId,
  );
  const [writeOpen, setWriteOpen] = useState(
    Boolean(actionData?.error && actionData.intent === "create"),
  );
  const selectedTicket = useMemo(
    () => d.tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [d.tickets, selectedTicketId],
  );

  useEffect(() => {
    if (actionData?.error && actionData.intent === "create") setWriteOpen(true);
  }, [actionData?.error]);
  useEffect(() => {
    if (!d.focusTicketId) return;
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`inquiry-${d.focusTicketId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [d.focusTicketId]);

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-5 py-16">
      <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <MessageSquareHeartIcon className="mb-4 size-9 text-emerald-500" />
          <h1 className="text-3xl font-black">함께 만드는 EOKKA</h1>
          <p className="text-muted-foreground mt-3">
            불편했던 점이나 바라는 기능을 함께 나눠 주세요. 문의와 운영팀의
            답변은 모든 사용자가 볼 수 있어요.
          </p>
        </div>
        {d.signedIn ? (
          <Button className="shrink-0" onClick={() => setWriteOpen(true)}>
            <PlusIcon className="size-4" />새 문의 작성
          </Button>
        ) : (
          <Button asChild className="shrink-0">
            <Link to="/login">로그인하고 문의하기</Link>
          </Button>
        )}
      </header>

      <section className="bg-card overflow-hidden rounded-3xl border">
        <div className="border-b px-5 py-4 sm:px-7">
          <h2 className="font-bold">전체 문의</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            전체 문의 {d.total}건 · 최신 작성순
          </p>
        </div>
        {!d.tickets.length ? (
          <div className="px-6 py-20 text-center">
            <MessageSquareHeartIcon className="text-muted-foreground/40 mx-auto mb-4 size-10" />
            <p className="font-semibold">아직 작성된 문의가 없어요.</p>
            <p className="text-muted-foreground mt-2 text-sm">
              EOKKA에 바라는 첫 번째 이야기를 남겨 주세요.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {d.tickets.map((ticket) => (
              <li
                key={ticket.id}
                id={`inquiry-${ticket.id}`}
                className={
                  d.focusTicketId === ticket.id
                    ? "bg-emerald-500/[0.07] ring-2 ring-emerald-500/40 ring-inset"
                    : undefined
                }
              >
                <button
                  type="button"
                  className="hover:bg-muted/50 focus-visible:ring-ring grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset sm:grid-cols-[100px_minmax(0,1fr)_88px_100px_100px_16px] sm:px-7"
                  onClick={() => setSelectedTicketId(ticket.id)}
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
                    <span className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-2 text-xs sm:hidden">
                      <span className="truncate">{ticket.authorName}</span>
                      <time className="shrink-0 whitespace-nowrap">
                        {date(ticket.created_at)}
                      </time>
                    </span>
                  </span>
                  <span
                    className={`inline-flex min-w-20 items-center justify-center justify-self-stretch rounded-full px-2.5 py-1 text-center text-xs font-semibold ${statusBadgeClass(ticket.status)}`}
                  >
                    {statusLabels[ticket.status]}
                  </span>
                  <span className="text-muted-foreground hidden text-xs sm:block">
                    {ticket.authorName}
                  </span>
                  <time className="text-muted-foreground hidden text-xs whitespace-nowrap sm:block">
                    {date(ticket.created_at)}
                  </time>
                  <ChevronRightIcon className="text-muted-foreground hidden size-4 sm:block" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {d.totalPages > 1 && (
          <nav
            aria-label="문의 목록 페이지"
            className="flex flex-wrap items-center justify-center gap-2 border-t px-5 py-5"
          >
            <Button asChild size="sm" variant="outline" disabled={d.page <= 1}>
              <Link
                to={`/contact?page=${Math.max(1, d.page - 1)}`}
                aria-disabled={d.page <= 1}
                preventScrollReset
              >
                이전
              </Link>
            </Button>
            {Array.from({ length: d.totalPages }, (_, index) => index + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === d.totalPages ||
                  Math.abs(page - d.page) <= 2,
              )
              .map((page, index, pages) => (
                <span key={page} className="contents">
                  {index > 0 && page - pages[index - 1] > 1 && (
                    <span className="text-muted-foreground px-1">…</span>
                  )}
                  <Button
                    asChild
                    size="icon"
                    variant={d.page === page ? "default" : "ghost"}
                    className="size-9"
                  >
                    <Link
                      to={`/contact?page=${page}`}
                      aria-current={d.page === page ? "page" : undefined}
                      preventScrollReset
                    >
                      {page}
                    </Link>
                  </Button>
                </span>
              ))}
            <Button
              asChild
              size="sm"
              variant="outline"
              disabled={d.page >= d.totalPages}
            >
              <Link
                to={`/contact?page=${Math.min(d.totalPages, d.page + 1)}`}
                aria-disabled={d.page >= d.totalPages}
                preventScrollReset
              >
                다음
              </Link>
            </Button>
          </nav>
        )}
      </section>

      <Dialog
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => !open && setSelectedTicketId(null)}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-3xl p-0 sm:max-w-2xl">
          <DialogTitle className="sr-only">문의 상세</DialogTitle>
          <DialogDescription className="sr-only">
            선택한 문의와 EOKKA 운영팀의 답변입니다.
          </DialogDescription>
          {selectedTicket && (
            <SupportThread
              thread={{
                ticket: selectedTicket,
                messages: selectedTicket.messages,
              }}
              canReply={selectedTicket.isOwner}
              canDeleteTicket={selectedTicket.isOwner}
              replyError={
                actionData?.intent === "reply" &&
                actionData.ticket === selectedTicket.id
                  ? actionData.error
                  : null
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              새 문의 작성
            </DialogTitle>
            <DialogDescription className="leading-6">
              작성한 내용과 운영팀 답변은 모든 사용자에게 공개돼요.
            </DialogDescription>
          </DialogHeader>
          {actionData?.error && actionData.intent === "create" && (
            <p
              role="alert"
              className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500"
            >
              {actionData.error}
            </p>
          )}
          {d.signedIn ? (
            <Form method="post" className="space-y-5">
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-bold"
                >
                  문의 유형
                </label>
                <Select name="category" defaultValue="bug">
                  <SelectTrigger id="category" className="h-11 w-full">
                    <SelectValue placeholder="문의 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-bold">
                  제목
                </label>
                <Input
                  id="title"
                  name="title"
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="어떤 점을 도와드릴까요?"
                />
              </div>
              <div>
                <label htmlFor="body" className="mb-2 block text-sm font-bold">
                  내용
                </label>
                <Textarea
                  id="body"
                  name="body"
                  required
                  minLength={5}
                  maxLength={5000}
                  rows={8}
                  placeholder="버그라면 발생 화면과 재현 방법을 알려 주세요. 비밀번호나 결제 정보는 적지 마세요."
                />
              </div>
              <p className="text-muted-foreground text-xs">
                개인정보나 계좌·결제 정보는 적지 마세요. 24시간 동안 최대
                5건까지 접수할 수 있어요.
              </p>
              <Button disabled={busy}>
                {busy ? "접수 중…" : "문의 접수하기"}
              </Button>
            </Form>
          ) : (
            <div className="py-6">
              <p className="text-muted-foreground mb-5 text-sm leading-6">
                로그인하면 문의를 작성하고 관리자 답변 알림을 받을 수 있어요.
              </p>
              <Button asChild>
                <Link to="/login">로그인하고 문의하기</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
