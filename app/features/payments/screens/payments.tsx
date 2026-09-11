import type { Route } from "./+types/payments";

import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CircleDollarSignIcon,
  CrownIcon,
  HistoryIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Link, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";
import { cn } from "~/core/lib/utils";
import { getAutomaticAnalysisSettings } from "~/features/users/automatic-analysis-settings.server";

import { getPayments } from "../queries";

export const meta: Route.MetaFunction = () => [
  { title: `결제내역 | ${import.meta.env.VITE_APP_NAME}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");

  const [payments, settings] = await Promise.all([
    getPayments(client, { userId: user.id }),
    getAutomaticAnalysisSettings(user.id),
  ]);

  return {
    isPro: settings.isPro,
    payments: payments.map((payment) => ({
      id: payment.payment_id,
      orderName: payment.order_name,
      orderId: payment.order_id,
      amount: payment.total_amount,
      status: payment.status,
      approvedAt: payment.approved_at,
      receiptUrl: payment.receipt_url,
    })),
  };
}

function won(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusInfo(status: string) {
  if (["DONE", "PAID", "APPROVED"].includes(status))
    return {
      label: "결제 완료",
      className:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    };
  if (["CANCELED", "PARTIAL_CANCELED"].includes(status))
    return {
      label: status === "PARTIAL_CANCELED" ? "부분 취소" : "결제 취소",
      className:
        "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300",
    };
  if (["ABORTED", "EXPIRED"].includes(status))
    return {
      label: status === "EXPIRED" ? "결제 만료" : "결제 실패",
      className:
        "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    };
  return {
    label: "처리 중",
    className:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
}

export default function Payments({ loaderData }: Route.ComponentProps) {
  const completed = loaderData.payments.filter((payment) =>
    ["DONE", "PAID", "APPROVED"].includes(payment.status),
  );
  const totalPaid = completed.reduce((sum, payment) => sum + payment.amount, 0);
  const latestPayment = completed[0] ?? null;

  return (
    <main className="flex flex-1 flex-col px-5 pt-8 pb-12 md:px-8 md:pt-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-violet-500">
              <ReceiptTextIcon className="size-4" /> PAYMENT HISTORY
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              결제내역
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              이용 중인 요금제와 결제 기록, 영수증을 한곳에서 확인하세요.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/pro">
              <CrownIcon /> EOKKA Pro 보기
            </Link>
          </Button>
        </header>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <article className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.12] to-transparent p-5">
            <CrownIcon className="size-5 text-amber-500" />
            <p className="text-muted-foreground mt-4 text-xs font-bold">
              현재 요금제
            </p>
            <p className="mt-1 text-xl font-black">
              {loaderData.isPro ? "EOKKA Pro 베타" : "무료 플랜"}
            </p>
            <span
              className={cn(
                "mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black",
                loaderData.isPro
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "text-muted-foreground bg-background/60",
              )}
            >
              {loaderData.isPro ? "이용 중" : "무료 이용 중"}
            </span>
          </article>
          <article className="bg-card rounded-2xl border p-5">
            <CircleDollarSignIcon className="size-5 text-emerald-500" />
            <p className="text-muted-foreground mt-4 text-xs font-bold">
              누적 결제 금액
            </p>
            <p className="mt-1 text-xl font-black tabular-nums">
              {won(totalPaid)}
            </p>
            <p className="text-muted-foreground mt-3 text-[11px]">
              결제 완료 내역 {completed.length}건 기준
            </p>
          </article>
          <article className="bg-card rounded-2xl border p-5">
            <CalendarDaysIcon className="size-5 text-sky-500" />
            <p className="text-muted-foreground mt-4 text-xs font-bold">
              최근 결제일
            </p>
            <p className="mt-1 text-lg font-black">
              {latestPayment
                ? dateTime(latestPayment.approvedAt)
                : "아직 없어요"}
            </p>
            <p className="text-muted-foreground mt-3 text-[11px]">
              승인 완료된 결제만 표시해요.
            </p>
          </article>
        </section>

        <section className="bg-card mt-7 overflow-hidden rounded-3xl border shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b px-5 py-5 sm:px-6">
            <div>
              <h2 className="flex items-center gap-2 font-black">
                <HistoryIcon className="size-4 text-violet-500" /> 결제 기록
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                최근 결제부터 순서대로 표시해요.
              </p>
            </div>
            <span className="text-muted-foreground rounded-full border px-3 py-1 text-xs font-bold">
              총 {loaderData.payments.length}건
            </span>
          </div>

          {loaderData.payments.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-14 text-center sm:py-20">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                <ReceiptTextIcon className="size-7" />
              </div>
              <h3 className="mt-5 text-lg font-black">
                아직 결제 내역이 없어요
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6 break-keep">
                EOKKA Pro 자동결제가 시작되면 결제 금액과 승인일, 영수증을
                이곳에서 확인할 수 있어요.
              </p>
              <Button asChild className="mt-5 rounded-full">
                <Link to="/dashboard/pro">
                  Pro 베타 알아보기 <ArrowUpRightIcon />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {loaderData.payments.map((payment) => {
                const status = statusInfo(payment.status);
                return (
                  <article
                    key={payment.id}
                    className="hover:bg-muted/25 grid gap-4 px-5 py-5 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black break-keep">
                          {payment.orderName}
                        </p>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[10px] font-black",
                            status.className,
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs">
                        {dateTime(payment.approvedAt)}
                      </p>
                      <p className="text-muted-foreground mt-1 truncate text-[10px]">
                        주문번호 {payment.orderId}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-5 sm:justify-end">
                      <p className="text-lg font-black tabular-nums">
                        {won(payment.amount)}
                      </p>
                      {payment.receiptUrl ? (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            영수증 <ArrowUpRightIcon />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          영수증 없음
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="bg-muted/25 text-muted-foreground mt-5 flex items-start gap-3 rounded-2xl border p-4 text-xs leading-5">
          <RotateCcwIcon className="mt-0.5 size-4 shrink-0" />
          결제 취소와 구독 해지는 자동결제 기능이 정식으로 연결된 뒤 이
          페이지에서 제공할 예정이에요. 현재는 자동결제 준비 중이므로 새로
          청구되는 금액이 없습니다.
        </div>
      </div>
    </main>
  );
}
