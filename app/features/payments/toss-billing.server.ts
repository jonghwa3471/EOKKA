import { randomUUID } from "node:crypto";

import { requireTossPaymentsSecretKey } from "~/core/lib/app-environment.server";

import { PRO_MONTHLY_PRICE, PRO_ORDER_NAME } from "./subscription-values";

function tossAuthorization() {
  return `Basic ${Buffer.from(`${requireTossPaymentsSecretKey()}:`).toString("base64")}`;
}

export async function tossRequest<T>(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: tossAuthorization(),
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(65_000),
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = body as { message?: string } | null;
    throw new Error(error?.message ?? "토스페이먼츠 요청을 처리하지 못했어요.");
  }
  return body as T;
}

export type TossBilling = {
  billingKey: string;
  card?: { issuerCode?: string; number?: string };
  cardCompany?: string;
  cardNumber?: string;
};

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  requestedAt: string;
  approvedAt: string;
  totalAmount: number;
  receipt?: { url?: string };
  metadata?: Record<string, string>;
  card?: unknown;
};

export async function chargeBillingKey({
  billingKey,
  customerKey,
  userId,
  customerEmail,
  customerName,
}: {
  billingKey: string;
  customerKey: string;
  userId: string;
  customerEmail?: string;
  customerName?: string;
}) {
  return tossRequest<TossPayment>(
    `https://api.tosspayments.com/v1/billing/${encodeURIComponent(billingKey)}`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: PRO_MONTHLY_PRICE,
        customerKey,
        orderId: `eokka_${randomUUID()}`,
        orderName: PRO_ORDER_NAME,
        customerEmail,
        customerName,
        metadata: { plan: "pro_beta_monthly" },
      }),
    },
  );
}
