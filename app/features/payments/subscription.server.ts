import { and, eq, lte } from "drizzle-orm";

import db from "~/core/db/drizzle-client.server";
import { recordAdminActivity } from "~/features/admin/activity.server";
import { createNotification } from "~/features/notifications/notifications.server";
import { profiles } from "~/features/users/schema";

import { decryptBillingKey, encryptBillingKey } from "./billing-crypto.server";
import { payments, subscriptions } from "./schema";
import {
  PRO_MONTHLY_PRICE,
  nextMonth,
  paymentValues,
} from "./subscription-values";
import {
  type TossBilling,
  type TossPayment,
  chargeBillingKey,
  tossRequest,
} from "./toss-billing.server";

export async function startSubscription({
  userId,
  authKey,
  customerKey,
  customerEmail,
  customerName,
}: {
  userId: string;
  authKey: string;
  customerKey: string;
  customerEmail?: string;
  customerName?: string;
}) {
  const expectedCustomerKey = `eokka_${userId.replaceAll("-", "")}`.slice(
    0,
    50,
  );
  if (customerKey !== expectedCustomerKey)
    throw new Error("결제 사용자 정보가 일치하지 않아요.");
  const billing = await tossRequest<TossBilling>(
    "https://api.tosspayments.com/v1/billing/authorizations/issue",
    {
      method: "POST",
      body: JSON.stringify({ authKey, customerKey }),
    },
  );
  let payment: TossPayment;
  try {
    payment = await chargeBillingKey({
      billingKey: billing.billingKey,
      customerKey,
      userId,
      customerEmail,
      customerName,
    });
  } catch (error) {
    try {
      await tossRequest(
        `https://api.tosspayments.com/v1/billing/${encodeURIComponent(billing.billingKey)}`,
        { method: "DELETE" },
      );
    } catch (cleanupError) {
      console.error("Unused billing key cleanup failed", cleanupError);
    }
    throw error;
  }
  if (payment.status !== "DONE" || payment.totalAmount !== PRO_MONTHLY_PRICE)
    throw new Error("첫 구독 결제를 확인하지 못했어요.");

  const now = new Date();
  const periodEnd = nextMonth(now);
  const encrypted = encryptBillingKey(billing.billingKey);
  await db.transaction(async (transaction) => {
    await transaction
      .insert(subscriptions)
      .values({
        user_id: userId,
        customer_key: customerKey,
        billing_key_ciphertext: encrypted.ciphertext,
        billing_key_iv: encrypted.iv,
        billing_key_tag: encrypted.tag,
        status: "active",
        cancel_at_period_end: false,
        current_period_end: periodEnd,
        last_charged_at: now,
        card_company: billing.card?.issuerCode ?? billing.cardCompany ?? null,
        card_number: billing.card?.number ?? billing.cardNumber ?? null,
      })
      .onConflictDoUpdate({
        target: subscriptions.user_id,
        set: {
          customer_key: customerKey,
          billing_key_ciphertext: encrypted.ciphertext,
          billing_key_iv: encrypted.iv,
          billing_key_tag: encrypted.tag,
          status: "active",
          cancel_at_period_end: false,
          current_period_end: periodEnd,
          last_charged_at: now,
          card_company: billing.card?.issuerCode ?? billing.cardCompany ?? null,
          card_number: billing.card?.number ?? billing.cardNumber ?? null,
          updated_at: now,
        },
      });
    await transaction
      .update(profiles)
      .set({ pro_expires_at: periodEnd, updated_at: now })
      .where(eq(profiles.profile_id, userId));
    await transaction.insert(payments).values(paymentValues(userId, payment));
  });
  try {
    await createNotification({
      userId,
      type: "payment_completed",
      title: "EOKKA Pro를 시작했어요",
      message: `${PRO_MONTHLY_PRICE.toLocaleString("ko-KR")}원 결제가 완료됐어요. 다음 결제일까지 Pro 기능을 이용할 수 있어요.`,
      href: "/dashboard/payments",
    });
  } catch (error) {
    console.error("Subscription notification failed", error);
  }
  return { payment, periodEnd };
}

export async function getSubscription(userId: string) {
  const [subscription] = await db
    .select({
      status: subscriptions.status,
      cancelAtPeriodEnd: subscriptions.cancel_at_period_end,
      currentPeriodEnd: subscriptions.current_period_end,
      cardCompany: subscriptions.card_company,
      cardNumber: subscriptions.card_number,
    })
    .from(subscriptions)
    .where(eq(subscriptions.user_id, userId))
    .limit(1);
  if (
    subscription?.status === "active" &&
    subscription.cancelAtPeriodEnd &&
    subscription.currentPeriodEnd <= new Date()
  ) {
    await db
      .update(subscriptions)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(subscriptions.user_id, userId));
    return { ...subscription, status: "cancelled" };
  }
  return subscription ?? null;
}

export async function cancelSubscription(userId: string) {
  const [updated] = await db
    .update(subscriptions)
    .set({ cancel_at_period_end: true, updated_at: new Date() })
    .where(
      and(
        eq(subscriptions.user_id, userId),
        eq(subscriptions.status, "active"),
      ),
    )
    .returning({ periodEnd: subscriptions.current_period_end });
  if (!updated) throw new Error("해지할 활성 구독이 없어요.");
  await createNotification({
    userId,
    type: "subscription_cancelled",
    title: "구독 해지를 예약했어요",
    message: `${updated.periodEnd.toLocaleDateString("ko-KR")}까지 Pro를 이용할 수 있으며 다음 결제는 진행되지 않아요.`,
    href: "/dashboard/payments",
  });
  await recordAdminActivity({
    eventType: "subscription_cancelled",
    userId,
    targetType: "subscription",
  });
  return updated.periodEnd;
}

export async function resumeSubscription(userId: string) {
  const [updated] = await db
    .update(subscriptions)
    .set({
      cancel_at_period_end: false,
      status: "active",
      updated_at: new Date(),
    })
    .where(
      and(
        eq(subscriptions.user_id, userId),
        eq(subscriptions.status, "active"),
      ),
    )
    .returning({ periodEnd: subscriptions.current_period_end });
  if (!updated) throw new Error("다시 시작할 구독이 없어요.");
  return updated.periodEnd;
}

export async function renewDueSubscriptions() {
  const cancelledDue = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        eq(subscriptions.cancel_at_period_end, true),
        lte(subscriptions.current_period_end, new Date()),
      ),
    );
  for (const subscription of cancelledDue) {
    try {
      await tossRequest(
        `https://api.tosspayments.com/v1/billing/${encodeURIComponent(decryptBillingKey(subscription))}`,
        { method: "DELETE" },
      );
    } catch (error) {
      console.error("Cancelled billing key cleanup failed", error);
    }
    await db
      .update(subscriptions)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(subscriptions.subscription_id, subscription.subscription_id));
  }
  const due = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        eq(subscriptions.cancel_at_period_end, false),
        lte(subscriptions.current_period_end, new Date()),
      ),
    );
  const stats = {
    attempted: due.length,
    renewed: 0,
    failed: 0,
    cancelled: cancelledDue.length,
  };
  for (const subscription of due) {
    try {
      const [claimed] = await db
        .update(subscriptions)
        .set({ status: "renewing", updated_at: new Date() })
        .where(
          and(
            eq(subscriptions.subscription_id, subscription.subscription_id),
            eq(subscriptions.status, "active"),
            eq(
              subscriptions.current_period_end,
              subscription.current_period_end,
            ),
          ),
        )
        .returning({ id: subscriptions.subscription_id });
      if (!claimed) continue;
      const billingKey = decryptBillingKey(subscription);
      const payment = await chargeBillingKey({
        billingKey,
        customerKey: subscription.customer_key,
        userId: subscription.user_id,
      });
      if (
        payment.status !== "DONE" ||
        payment.totalAmount !== PRO_MONTHLY_PRICE
      )
        throw new Error("자동결제 승인 금액이나 상태가 올바르지 않습니다.");
      const now = new Date();
      const periodEnd = nextMonth(subscription.current_period_end);
      await db.transaction(async (transaction) => {
        await transaction
          .insert(payments)
          .values(paymentValues(subscription.user_id, payment));
        await transaction
          .update(subscriptions)
          .set({
            current_period_end: periodEnd,
            last_charged_at: now,
            status: "active",
            updated_at: now,
          })
          .where(
            eq(subscriptions.subscription_id, subscription.subscription_id),
          );
        await transaction
          .update(profiles)
          .set({ pro_expires_at: periodEnd, updated_at: now })
          .where(eq(profiles.profile_id, subscription.user_id));
      });
      await createNotification({
        userId: subscription.user_id,
        type: "payment_completed",
        title: "EOKKA Pro 구독이 갱신됐어요",
        message: `${PRO_MONTHLY_PRICE.toLocaleString("ko-KR")}원 자동결제가 완료됐어요.`,
        href: "/dashboard/payments",
      });
      stats.renewed += 1;
    } catch (error) {
      console.error("Subscription renewal failed", error);
      await db
        .update(subscriptions)
        .set({ status: "past_due", updated_at: new Date() })
        .where(eq(subscriptions.subscription_id, subscription.subscription_id));
      try {
        await createNotification({
          userId: subscription.user_id,
          type: "payment_failed",
          title: "EOKKA Pro 자동결제를 확인해 주세요",
          message:
            "이번 자동결제를 완료하지 못했어요. 결제 수단을 확인한 뒤 다시 구독해 주세요.",
          href: "/dashboard/payments",
        });
      } catch (notificationError) {
        console.error("Renewal failure notification failed", notificationError);
      }
      stats.failed += 1;
    }
  }
  return stats;
}

export { PRO_MONTHLY_PRICE } from "./subscription-values";

export { PRO_ORDER_NAME } from "./subscription-values";
