import type { Route } from "./+types/support";

import { desc, eq } from "drizzle-orm";
import { MessageSquareHeartIcon } from "lucide-react";
import { Form, Link, data, redirect, useNavigation } from "react-router";
import { z } from "zod";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Textarea } from "~/core/components/ui/textarea";
import db from "~/core/db/drizzle-client.server";
import makeServerClient from "~/core/lib/supa-client.server";
import {
  addTicket,
  getThread,
  replyToTicket,
  requireUser,
} from "~/features/admin/admin.server";
import { supportTickets } from "~/features/admin/schema";
import SupportThread, { statusLabels } from "~/features/admin/support-thread";
import {
  assertSameOrigin,
  categoryLabels,
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
  if (!user) return { signedIn: false, tickets: [], thread: null };
  const id = new URL(request.url).searchParams.get("ticket");
  if (id && !z.string().uuid().safeParse(id).success)
    throw new Response("잘못된 문의 주소예요.", { status: 400 });
  const [tickets, thread] = await Promise.all([
    db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.user_id, user.id))
      .orderBy(desc(supportTickets.updated_at))
      .limit(100),
    id ? getThread(id, user.id) : null,
  ]);
  return { signedIn: true, tickets, thread };
}
export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const user = await requireUser(request);
  const form = Object.fromEntries(await request.formData());
  try {
    if (form.intent === "reply") {
      const parsed = replySchema.safeParse(form);
      if (!parsed.success)
        return data(
          { error: "메시지는 1~5,000자로 입력해 주세요." },
          { status: 400 },
        );
      await replyToTicket(user.id, parsed.data.ticket, parsed.data.body, false);
      return redirect(`/contact?ticket=${parsed.data.ticket}`);
    }
    const parsed = ticketSchema.safeParse(form);
    if (!parsed.success)
      return data(
        { error: "제목은 2~100자, 내용은 5~5,000자로 입력해 주세요." },
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
      },
      { status: 400 },
    );
  }
}
export default function Support({
  loaderData: d,
  actionData,
}: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-5 py-16">
      <header className="mb-8">
        <MessageSquareHeartIcon className="mb-4 size-9 text-emerald-500" />
        <h1 className="text-3xl font-black">함께 만드는 EOKKA</h1>
        <p className="text-muted-foreground mt-3">
          불편했던 점이나 바라는 기능을 알려 주세요. 답변은 사이트 알림과 내
          문의에서 확인할 수 있어요.
        </p>
      </header>
      {!d.signedIn ? (
        <section className="bg-card rounded-3xl border p-8">
          <p className="mb-5">
            로그인하면 문의를 남기고 답변을 받아볼 수 있어요.
          </p>
          <Button asChild>
            <Link to="/login">로그인하고 문의하기</Link>
          </Button>
        </section>
      ) : (
        <>
          {actionData?.error && (
            <p
              role="alert"
              className="mb-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-500"
            >
              {actionData.error}
            </p>
          )}
          <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-3">
              <Button asChild variant="outline" className="w-full">
                <Link to="/contact">새 문의 작성</Link>
              </Button>
              <h2 className="pt-3 text-sm font-bold">내 문의 · 최근 100건</h2>
              {!d.tickets.length && (
                <p className="text-muted-foreground text-sm">
                  아직 남긴 문의가 없어요.
                </p>
              )}
              {d.tickets.map((t) => (
                <Link
                  key={t.id}
                  to={`/contact?ticket=${t.id}`}
                  className={`hover:bg-muted/50 block rounded-2xl border p-4 ${d.thread?.ticket.id === t.id ? "border-emerald-500 bg-emerald-500/5" : ""}`}
                >
                  <span className="text-xs text-emerald-500">
                    {statusLabels[t.status]}
                  </span>
                  <p className="mt-1 text-sm font-semibold break-words">
                    {t.title}
                  </p>
                </Link>
              ))}
            </aside>
            {d.thread ? (
              <SupportThread thread={d.thread} />
            ) : (
              <Form
                method="post"
                className="bg-card space-y-5 rounded-3xl border p-6"
              >
                <div>
                  <label
                    htmlFor="category"
                    className="mb-2 block text-sm font-bold"
                  >
                    문의 유형
                  </label>
                  <select
                    id="category"
                    name="category"
                    className="bg-background h-11 w-full cursor-pointer rounded-xl border px-3"
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="title"
                    className="mb-2 block text-sm font-bold"
                  >
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
                  <label
                    htmlFor="body"
                    className="mb-2 block text-sm font-bold"
                  >
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
                  24시간 동안 최대 5건까지 접수할 수 있어요. 이메일이 아닌
                  사이트 내 알림으로 답변을 드려요.
                </p>
                <Button disabled={busy}>
                  {busy ? "접수 중…" : "문의 접수하기"}
                </Button>
              </Form>
            )}
          </div>
        </>
      )}
    </main>
  );
}
