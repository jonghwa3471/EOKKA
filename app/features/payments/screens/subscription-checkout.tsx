import type { Route } from "./+types/subscription-checkout";

import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { CheckIcon, CreditCardIcon, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { Link, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import { requireAuthentication } from "~/core/lib/guards.server";
import {
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";
import makeServerClient from "~/core/lib/supa-client.server";
import { getSubscription } from "~/features/payments/subscription.server";

const PRO_MONTHLY_PRICE = 990;

export const meta: Route.MetaFunction = () => [
  { title: `EOKKA Pro 구독 | ${import.meta.env.VITE_APP_NAME}` },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  await requireAuthentication(client);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");
  const subscription = await getSubscription(user.id);
  if (
    subscription?.status === "active" &&
    subscription.currentPeriodEnd > new Date()
  )
    throw redirect("/dashboard/payments");
  return {
    customerKey: `eokka_${user.id.replaceAll("-", "")}`.slice(0, 50),
    customerName: String(user.user_metadata.name ?? "EOKKA 사용자"),
    customerEmail: user.email ?? undefined,
  };
}

type SubscriptionCheckoutLoaderData = Awaited<ReturnType<typeof loader>>;

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadCachedRouteData<SubscriptionCheckoutLoaderData>(
    "subscription-checkout",
    async () => serverLoader() as Promise<SubscriptionCheckoutLoaderData>,
  );
}

export default function SubscriptionCheckout({
  loaderData,
}: Route.ComponentProps) {
  usePrimeRouteDataCache("subscription-checkout", loaderData);
  const [loading, setLoading] = useState(false);
  const subscribe = async () => {
    setLoading(true);
    try {
      const toss = await loadTossPayments(
        import.meta.env.VITE_TOSS_PAYMENTS_CLIENT_KEY,
      );
      await toss
        .payment({ customerKey: loaderData.customerKey })
        .requestBillingAuth({
          method: "CARD",
          successUrl: `${window.location.origin}/payments/success`,
          failUrl: `${window.location.origin}/payments/failure`,
          customerEmail: loaderData.customerEmail,
          customerName: loaderData.customerName,
        });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-20">
      <section className="overflow-hidden rounded-[2rem] border border-amber-500/25 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_40%)] shadow-xl">
        <div className="p-7 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1.5 text-xs font-black text-amber-600 dark:text-amber-300">
            <CreditCardIcon className="size-3.5" /> 월 자동결제
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
            EOKKA Pro 베타
          </h1>
          <div className="mt-3 flex items-end gap-1">
            <strong className="text-4xl font-black">
              {PRO_MONTHLY_PRICE.toLocaleString("ko-KR")}원
            </strong>
            <span className="text-muted-foreground pb-1 text-sm">/ 월</span>
          </div>
          <ul className="mt-7 grid gap-3 text-sm font-semibold sm:grid-cols-2">
            {[
              "분석 기록 제한 없이 보관",
              "목표 금액 최대 3개 저장",
              "거래일마다 모든 목표 자동 분석",
              "수동 분석 하루 15회",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-emerald-500" /> {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-muted/35 border-t p-6 sm:p-8">
          <p className="text-muted-foreground text-xs leading-5 break-keep">
            카드를 한 번 등록하면 매월 같은 날짜에 990원이 자동 결제됩니다.
            언제든 해지할 수 있으며, 해지 후에도 현재 결제 기간까지 Pro를 이용할
            수 있어요. 이미 결제된 이용 기간은 단순 변심으로 환불되지 않습니다.
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-5 w-full rounded-2xl bg-amber-500 font-black text-black hover:bg-amber-400"
            disabled={loading}
            onClick={subscribe}
          >
            {loading ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <CreditCardIcon />
            )}
            {loading ? "카드 등록창을 여는 중..." : "카드 등록하고 구독 시작"}
          </Button>
          <Button asChild variant="ghost" className="mt-2 w-full">
            <Link to="/dashboard/pro">돌아가기</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
