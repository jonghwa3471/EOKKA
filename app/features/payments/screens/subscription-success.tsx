import type { Route } from "./+types/subscription-success";

import { CheckCircle2Icon } from "lucide-react";
import { Link, redirect } from "react-router";
import { z } from "zod";

import { Button } from "~/core/components/ui/button";
import { requireAuthentication } from "~/core/lib/guards.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { recordAdminActivity } from "~/features/admin/activity.server";
import { startSubscription } from "~/features/payments/subscription.server";
import { createDeveloperPortfolioGiftNotification } from "~/features/users/developer-portfolio-gift.server";

const querySchema = z.object({
  authKey: z.string().min(1).max(300),
  customerKey: z.string().min(2).max(50),
});
const PRO_MONTHLY_PRICE = 990;

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  await requireAuthentication(client);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    throw redirect(
      "/payments/failure?message=결제+인증+정보가+올바르지+않아요.",
    );
  let result: Awaited<ReturnType<typeof startSubscription>>;
  try {
    result = await startSubscription({
      userId: user.id,
      authKey: parsed.data.authKey,
      customerKey: parsed.data.customerKey,
      customerEmail: user.email,
      customerName: String(user.user_metadata.name ?? "EOKKA 사용자"),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "구독을 시작하지 못했어요.";
    throw redirect(`/payments/failure?message=${encodeURIComponent(message)}`);
  }
  try {
    await Promise.all([
      createDeveloperPortfolioGiftNotification(user.id),
      recordAdminActivity({
        eventType: "payment_completed",
        userId: user.id,
        targetType: "subscription",
        targetId: result.payment.orderId,
      }),
    ]);
  } catch (error) {
    console.error("Post-payment side effect failed", error);
  }
  return { periodEnd: result.periodEnd.toISOString() };
}

export default function SubscriptionSuccess({
  loaderData,
}: Route.ComponentProps) {
  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-2xl items-center px-5">
      <section className="w-full rounded-[2rem] border border-emerald-500/25 bg-emerald-500/[0.06] p-8 text-center sm:p-12">
        <CheckCircle2Icon className="mx-auto size-14 text-emerald-500" />
        <p className="mt-5 text-xs font-black tracking-[0.18em] text-emerald-500">
          EOKKA PRO
        </p>
        <h1 className="mt-2 text-3xl font-black">구독을 시작했어요</h1>
        <p className="text-muted-foreground mt-4 leading-7 break-keep">
          {PRO_MONTHLY_PRICE.toLocaleString("ko-KR")}원 결제가 완료됐어요. 다음
          결제일은 {new Date(loaderData.periodEnd).toLocaleDateString("ko-KR")}
          이에요.
        </p>
        <Button asChild className="mt-7 rounded-full">
          <Link to="/dashboard/pro?gift=1">Pro 선물 확인하기</Link>
        </Button>
      </section>
    </main>
  );
}
