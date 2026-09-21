import { Trash2Icon } from "lucide-react";
import { Form, useNavigation } from "react-router";

import { DestructiveConfirmDialog } from "~/core/components/destructive-confirm-dialog";
import { EokkaLogo } from "~/core/components/eokka-logo";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/core/components/ui/avatar";
import { Button } from "~/core/components/ui/button";
import { Textarea } from "~/core/components/ui/textarea";

export const statusLabels: Record<string, string> = {
  open: "답변 대기",
  answered: "답변 완료",
  closed: "종료",
};
export function statusBadgeClass(status: string) {
  if (status === "open")
    return "bg-amber-500/12 text-amber-700 dark:text-amber-300";
  if (status === "answered")
    return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  return "bg-slate-500/12 text-slate-600 dark:text-slate-300";
}
export default function SupportThread({
  thread,
  staff = false,
  canReply = false,
  canDeleteTicket = false,
  replyError,
  onAuthorClick,
}: {
  thread: {
    ticket: {
      id: string;
      title: string;
      status: string;
      created_at: string | Date;
      authorName?: string | null;
      authorAvatarUrl?: string | null;
    };
    messages: {
      id: string;
      is_staff: string;
      body: string;
      created_at: string | Date;
      canDelete?: boolean;
    }[];
  };
  staff?: boolean;
  canReply?: boolean;
  canDeleteTicket?: boolean;
  replyError?: string | null;
  onAuthorClick?: () => void;
}) {
  const busy = useNavigation().state !== "idle";
  return (
    <section className="bg-card min-w-0 rounded-3xl border p-5 sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 pr-8">
        <div className="min-w-0">
          <h2 className="text-lg font-bold break-words">
            {thread.ticket.title}
          </h2>
          <p className="text-muted-foreground mt-2 text-xs">
            {thread.ticket.authorName ?? "문의 작성자"} ·{" "}
            {new Date(thread.ticket.created_at).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex min-w-20 items-center justify-center rounded-full px-3 py-1 text-center text-xs font-semibold ${statusBadgeClass(thread.ticket.status)}`}
          >
            {statusLabels[thread.ticket.status]}
          </span>
          {canDeleteTicket && (
            <DestructiveConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer text-red-500 hover:bg-red-500/10 hover:text-red-500"
                  aria-label="문의글 삭제"
                  title="문의글 삭제"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              }
              title="문의글을 삭제할까요?"
              description="문의 내용과 모든 댓글이 함께 삭제되며 복구할 수 없어요."
              confirmLabel="문의글 삭제"
              fields={{ intent: "delete-ticket", ticket: thread.ticket.id }}
            />
          )}
        </div>
      </div>
      <div className="space-y-4">
        {thread.messages.map((message) => {
          const fromStaff = message.is_staff === "yes";
          const authorName = fromStaff
            ? "EOKKA 운영자"
            : (thread.ticket.authorName ?? "문의 작성자");
          return (
            <div key={message.id} className="flex items-start gap-3">
              {fromStaff ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <EokkaLogo className="size-7" />
                </span>
              ) : onAuthorClick ? (
                <button
                  type="button"
                  aria-label={`${authorName} 사용자 정보 보기`}
                  className="shrink-0 cursor-pointer rounded-full transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:outline-none"
                  onClick={onAuthorClick}
                >
                  <Avatar className="ring-border size-9 ring-1">
                    <AvatarImage
                      src={thread.ticket.authorAvatarUrl ?? undefined}
                      alt={`${authorName} 프로필`}
                    />
                    <AvatarFallback className="text-xs font-black">
                      {authorName.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              ) : (
                <Avatar className="ring-border size-9 ring-1">
                  <AvatarImage
                    src={thread.ticket.authorAvatarUrl ?? undefined}
                    alt={`${authorName} 프로필`}
                  />
                  <AvatarFallback className="text-xs font-black">
                    {authorName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`min-w-0 flex-1 rounded-2xl p-4 ${fromStaff ? "border border-emerald-500/20 bg-emerald-500/5" : "bg-muted/50"}`}
              >
                <div className="text-muted-foreground mb-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-foreground">{authorName}</strong>
                    <time>
                      {new Date(message.created_at).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </time>
                  </div>
                  {message.canDelete && (
                    <DestructiveConfirmDialog
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 cursor-pointer text-red-500 hover:bg-red-500/10 hover:text-red-500"
                          aria-label="댓글 삭제"
                          title="댓글 삭제"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      }
                      title="이 댓글을 삭제할까요?"
                      description="삭제한 댓글은 복구할 수 없어요."
                      confirmLabel="댓글 삭제"
                      fields={{
                        intent: "delete-message",
                        ticket: thread.ticket.id,
                        message: message.id,
                      }}
                    />
                  )}
                </div>
                <p className="text-sm leading-7 break-words whitespace-pre-wrap">
                  {message.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {(staff || canReply) && thread.ticket.status !== "closed" && (
        <Form
          key={`${thread.ticket.id}-${thread.messages.length}`}
          method="post"
          className="mt-6 space-y-3"
        >
          <input type="hidden" name="intent" value="reply" />
          <input type="hidden" name="ticket" value={thread.ticket.id} />
          <label htmlFor="reply" className="text-sm font-semibold">
            {staff ? "답변 보내기" : "추가 댓글 작성"}
          </label>
          {replyError && (
            <p
              role="alert"
              className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500"
            >
              {replyError}
            </p>
          )}
          <Textarea
            id="reply"
            name="body"
            required
            maxLength={5000}
            rows={5}
            placeholder={
              staff
                ? "답변을 남기면 사용자에게 알림이 전달돼요."
                : "문의에 덧붙일 내용을 작성해 주세요."
            }
          />
          <Button disabled={busy}>{busy ? "전송 중…" : "메시지 보내기"}</Button>
        </Form>
      )}
    </section>
  );
}
