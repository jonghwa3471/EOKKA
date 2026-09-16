import type { Route } from "./+types/admin";

import { eq } from "drizzle-orm";
import {
  MegaphoneIcon,
  MessagesSquareIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Textarea } from "~/core/components/ui/textarea";
import db from "~/core/db/drizzle-client.server";

import {
  getAdminOverview,
  getThread,
  publishAnnouncement,
  replyToTicket,
  requireAdmin,
} from "../admin.server";
import { supportTickets } from "../schema";
import SupportThread, { statusLabels } from "../support-thread";
import {
  announcementSchema,
  assertSameOrigin,
  categoryLabels,
  replySchema,
} from "../validation";

export const meta = () => [{ title: "운영 관리 | EOKKA" }];
export const headers = () => ({ "Cache-Control": "private, no-store" });
export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAdmin(request);
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").slice(0, 100);
  const rawPage = Number(url.searchParams.get("page") ?? 0);
  const page = Number.isSafeInteger(rawPage)
    ? Math.max(0, Math.min(rawPage, 100000))
    : 0;
  const ticket = url.searchParams.get("ticket");
  if (ticket && !z.string().uuid().safeParse(ticket).success)
    throw new Response("잘못된 문의 주소예요.", { status: 400 });
  return {
    ...(await getAdminOverview(search, page)),
    search,
    page,
    thread: ticket ? await getThread(ticket, user.id, true) : null,
    tab: url.searchParams.get("tab") ?? "inbox",
  };
}
export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const user = await requireAdmin(request);
  const form = Object.fromEntries(await request.formData());
  try {
    if (form.intent === "reply") {
      const parsed = replySchema.safeParse(form);
      if (!parsed.success)
        return data(
          { error: "답변은 1~5,000자로 입력해 주세요." },
          { status: 400 },
        );
      await replyToTicket(user.id, parsed.data.ticket, parsed.data.body, true);
      return redirect(`/dashboard/admin?ticket=${parsed.data.ticket}`);
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
      return redirect(`/dashboard/admin?ticket=${parsed.data.ticket}`);
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
  const formRef = useRef<HTMLFormElement>(null);
  const requestId = useRef<string | null>(null);
  const submit = useSubmit();
  const busy = useNavigation().state !== "idle";
  useEffect(() => {
    requestId.current = null;
    formRef.current?.reset();
  }, [d.announcements[0]?.id]);
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
            variant={d.tab === item.key ? "default" : "outline"}
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
      {d.tab === "inbox" && (
        <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <section className={`${panel} space-y-3`}>
            <h2 className="font-bold">최근 문의 100건</h2>
            {!d.tickets.length && (
              <p className="text-muted-foreground py-6 text-sm">
                접수된 문의가 없어요.
              </p>
            )}
            {d.tickets.map((t) => (
              <Link
                key={t.id}
                to={`/dashboard/admin?ticket=${t.id}`}
                className={`hover:bg-muted/50 block rounded-xl border p-3 ${d.thread?.ticket.id === t.id ? "border-emerald-500 bg-emerald-500/5" : ""}`}
              >
                <span className="text-xs text-emerald-500">
                  {statusLabels[t.status]} ·{" "}
                  {categoryLabels[t.category as keyof typeof categoryLabels]}
                </span>
                <p className="mt-1 text-sm font-bold break-words">{t.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t.name ?? "사용자"}
                </p>
              </Link>
            ))}
          </section>
          <div className="space-y-4">
            {d.thread ? (
              <>
                <SupportThread thread={d.thread} staff />
                <Form method="post" className="flex justify-end">
                  <input type="hidden" name="intent" value="status" />
                  <input
                    type="hidden"
                    name="ticket"
                    value={d.thread.ticket.id}
                  />
                  <input
                    type="hidden"
                    name="status"
                    value={
                      d.thread.ticket.status === "closed" ? "open" : "closed"
                    }
                  />
                  <Button disabled={busy} variant="outline">
                    {d.thread.ticket.status === "closed"
                      ? "문의 다시 열기"
                      : "문의 종료하기"}
                  </Button>
                </Form>
              </>
            ) : (
              <div
                className={`${panel} text-muted-foreground py-20 text-center`}
              >
                문의를 선택하면 대화와 답변 창이 열려요.
              </div>
            )}
          </div>
        </div>
      )}
      {d.tab === "users" && (
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
                      {u.name}
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
      {d.tab === "announcements" && (
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
