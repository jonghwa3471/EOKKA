import { Form, useNavigation } from "react-router";

import { Button } from "~/core/components/ui/button";
import { Textarea } from "~/core/components/ui/textarea";

export const statusLabels: Record<string, string> = {
  open: "답변 대기",
  answered: "답변 완료",
  closed: "종료",
};
export default function SupportThread({
  thread,
  staff = false,
}: {
  thread: {
    ticket: { id: string; title: string; status: string };
    messages: {
      id: string;
      is_staff: string;
      body: string;
      created_at: string | Date;
    }[];
  };
  staff?: boolean;
}) {
  const busy = useNavigation().state !== "idle";
  return (
    <section className="bg-card min-w-0 rounded-3xl border p-5 sm:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold break-words">{thread.ticket.title}</h2>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {statusLabels[thread.ticket.status]}
        </span>
      </div>
      <div className="space-y-4">
        {thread.messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl p-4 ${message.is_staff === "yes" ? "border border-emerald-500/20 bg-emerald-500/5" : "bg-muted/50"}`}
          >
            <div className="text-muted-foreground mb-2 flex flex-wrap items-center gap-2 text-xs">
              <strong className="text-foreground">
                {message.is_staff === "yes" ? "EOKKA 운영팀" : "문의 작성자"}
              </strong>
              <time>
                {new Date(message.created_at).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}
              </time>
            </div>
            <p className="text-sm leading-7 break-words whitespace-pre-wrap">
              {message.body}
            </p>
          </div>
        ))}
      </div>
      {thread.ticket.status !== "closed" && (
        <Form
          key={`${thread.ticket.id}-${thread.messages.length}`}
          method="post"
          className="mt-6 space-y-3"
        >
          <input type="hidden" name="intent" value="reply" />
          <input type="hidden" name="ticket" value={thread.ticket.id} />
          <label htmlFor="reply" className="text-sm font-semibold">
            {staff ? "답변 보내기" : "추가 메시지"}
          </label>
          <Textarea
            id="reply"
            name="body"
            required
            maxLength={5000}
            rows={5}
            placeholder={
              staff
                ? "답변을 남기면 사용자에게 알림이 전달돼요."
                : "추가로 알려 주실 내용을 적어 주세요."
            }
          />
          <Button disabled={busy}>{busy ? "전송 중…" : "메시지 보내기"}</Button>
        </Form>
      )}
    </section>
  );
}
