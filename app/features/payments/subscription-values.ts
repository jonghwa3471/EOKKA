import { type TossPayment } from "./toss-billing.server";

export const PRO_MONTHLY_PRICE = 990;

export const PRO_ORDER_NAME = "EOKKA Pro 베타 월 구독";

export function nextMonth(from: Date) {
  const next = new Date(from);
  const originalDate = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lastDateOfTargetMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(originalDate, lastDateOfTargetMonth));
  return next;
}

export function paymentValues(userId: string, payment: TossPayment) {
  return {
    payment_key: payment.paymentKey,
    order_id: payment.orderId,
    order_name: payment.orderName,
    total_amount: payment.totalAmount,
    metadata: payment.metadata ?? { plan: "pro_beta_monthly" },
    raw_data: payment,
    receipt_url: payment.receipt?.url ?? "",
    status: payment.status,
    user_id: userId,
    approved_at: new Date(payment.approvedAt),
    requested_at: new Date(payment.requestedAt),
  };
}
