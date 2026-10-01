/**
 * Payment Success Page Component
 *
 * This file implements the payment success page that verifies and processes
 * successful payments from Toss Payments. It demonstrates a complete payment
 * verification flow with proper security checks and database recording.
 *
 * Key features:
 * - Authentication protection to prevent unauthorized access
 * - Payment verification with the Toss Payments API
 * - Validation of payment parameters and response data
 * - Security checks for payment amount verification
 * - Database recording of verified payments
 * - Detailed success page with payment information
 */
import type { Route } from "./+types/success";

import {
  CheckCircle2Icon,
  GiftIcon,
  PartyPopperIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Form, Link, redirect } from "react-router";
import { z } from "zod";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";
import { consumePendingAnalyticsEvent } from "~/core/lib/analytics.client";
import { requireAuthentication } from "~/core/lib/guards.server";
import adminClient from "~/core/lib/supa-admin-client.server";
import makeServerClient from "~/core/lib/supa-client.server";
import { recordAdminActivity } from "~/features/admin/activity.server";
import { createNotification } from "~/features/notifications/notifications.server";
import {
  activateProMembership,
  createDeveloperPortfolioGiftNotification,
} from "~/features/users/developer-portfolio-gift.server";

/**
 * Meta function for setting page metadata
 *
 * This function sets the page title for the payment success page,
 * indicating to the user that their payment has been completed successfully.
 *
 * @returns Array of metadata objects for the page
 */
export const meta: Route.MetaFunction = () => [
  {
    title: `Payment Complete | ${import.meta.env.VITE_APP_NAME}`,
  },
];

/**
 * Validation schema for URL parameters from Toss Payments redirect
 *
 * This schema defines the required parameters that Toss Payments includes
 * in the redirect URL after a successful payment:
 * - orderId: Unique identifier for the order
 * - paymentKey: Unique identifier for the payment transaction
 * - amount: Payment amount
 * - paymentType: Method of payment (card, transfer, etc.)
 */
const paramsSchema = z.object({
  orderId: z.string(),
  paymentKey: z.string(),
  amount: z.coerce.number(),
  paymentType: z.string(),
});

/**
 * Validation schema for Toss Payments API response
 *
 * This schema defines the expected structure of the response from the
 * Toss Payments confirmation API. It includes:
 * - Transaction identifiers (paymentKey, orderId)
 * - Order details (orderName)
 * - Payment status and timestamps
 * - Receipt information
 * - Payment amount and additional metadata
 */
const paymentResponseSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  orderName: z.string(),
  status: z.string(),
  requestedAt: z.string(),
  approvedAt: z.string(),
  receipt: z.object({
    url: z.string(),
  }),
  totalAmount: z.number(),
  metadata: z.record(z.string()),
});

/**
 * Loader function for payment verification and processing
 *
 * This function handles the complete payment verification flow:
 * 1. Authenticates the user to prevent unauthorized access
 * 2. Validates URL parameters from Toss Payments redirect
 * 3. Verifies the payment with Toss Payments API
 * 4. Validates the payment amount to prevent fraud
 * 5. Records the verified payment in the database
 *
 * Security considerations:
 * - Requires authentication to access the success page
 * - Validates all payment parameters with Zod schemas
 * - Verifies payment with Toss Payments API using secret key
 * - Validates payment amount to prevent tampering
 * - Uses admin client for secure database operations
 *
 * @param request - The incoming HTTP request with payment parameters
 * @returns Object with payment data for the success page
 */
export async function loader({ request }: Route.LoaderArgs) {
  // Create a server-side Supabase client with the user's session
  const [client] = makeServerClient(request);

  // Verify the user is authenticated, redirects to login if not
  await requireAuthentication(client);

  // Get the authenticated user's information
  const {
    data: { user },
  } = await client.auth.getUser();

  // Redirect to checkout if user is not found
  if (!user) {
    throw redirect("/payments/checkout");
  }

  // Extract and validate payment parameters from URL
  const url = new URL(request.url);
  const result = paramsSchema.safeParse(Object.fromEntries(url.searchParams));

  // Redirect to failure page if parameters are invalid
  if (!result.success) {
    return redirect(`/payments/failure?`);
  }

  // Prepare authorization header for Toss Payments API
  const encryptedSecretKey =
    "Basic " +
    Buffer.from(process.env.TOSS_PAYMENTS_SECRET_KEY + ":").toString("base64");

  // Verify payment with Toss Payments API
  const response = await fetch(
    "https://api.tosspayments.com/v1/payments/confirm",
    {
      method: "POST",
      body: JSON.stringify({
        orderId: result.data.orderId,
        amount: result.data.amount,
        paymentKey: result.data.paymentKey,
      }),
      headers: {
        Authorization: encryptedSecretKey,
        "Content-Type": "application/json",
      },
    },
  );

  // Parse API response
  const data = await response.json();

  // Handle API errors by redirecting to failure page with error details
  if (response.status !== 200 && data.code && data.message) {
    throw redirect(
      `/payments/failure?code=${encodeURIComponent(data.code)}&message=${encodeURIComponent(data.message)}`,
    );
  }

  // Validate API response structure
  const paymentResponse = paymentResponseSchema.safeParse(data);
  if (!paymentResponse.success) {
    throw redirect(
      `/payments/failure?code=${encodeURIComponent("validation-error")}&message=${encodeURIComponent("Invalid response from Toss")}`,
    );
  }

  // CRITICAL SECURITY CHECK: Validate payment amount
  // This prevents attackers from manipulating the payment amount
  // 🚨⚠️ In a production app, you would compare against the expected amount from your database
  if (paymentResponse.data.totalAmount !== 990) {
    throw redirect(
      `/payments/failure?code=${encodeURIComponent("validation-error")}&message=${encodeURIComponent("Invalid amount")}`,
    );
  }

  // Record the verified payment in the database
  const { error: paymentInsertError } = await adminClient
    .from("payments")
    .insert({
      payment_key: paymentResponse.data.paymentKey,
      order_id: paymentResponse.data.orderId,
      order_name: paymentResponse.data.orderName,
      total_amount: paymentResponse.data.totalAmount,
      receipt_url: paymentResponse.data.receipt.url,
      status: paymentResponse.data.status,
      approved_at: paymentResponse.data.approvedAt,
      requested_at: paymentResponse.data.requestedAt,
      metadata: paymentResponse.data.metadata,
      raw_data: data,
      user_id: user!.id,
    });

  if (paymentInsertError) {
    const message =
      paymentInsertError.code === "23505"
        ? "이미 처리된 결제입니다."
        : "결제 기록을 저장하지 못했습니다.";
    throw redirect(
      `/payments/failure?code=${encodeURIComponent("payment-record-error")}&message=${encodeURIComponent(message)}`,
    );
  }

  await createNotification({
    userId: user!.id,
    type: "payment_completed",
    title: "결제가 완료됐어요",
    message: `${paymentResponse.data.orderName} ${paymentResponse.data.totalAmount.toLocaleString("ko-KR")}원 결제가 정상적으로 완료됐어요.`,
    href: "/dashboard/payments",
  });
  const proExpiresAt = await activateProMembership(user.id);
  await createDeveloperPortfolioGiftNotification(user.id);
  await recordAdminActivity({
    eventType: "payment_completed",
    userId: user.id,
    targetType: "subscription",
    targetId: paymentResponse.data.orderId,
  });

  // Return payment data for the success page
  return {
    payment: {
      orderName: paymentResponse.data.orderName,
      totalAmount: paymentResponse.data.totalAmount,
      approvedAt: paymentResponse.data.approvedAt,
      proExpiresAt: proExpiresAt.toISOString(),
    },
  };
}

/**
 * Success component for displaying payment confirmation
 *
 * This component displays a confirmation page after a successful payment.
 * It shows:
 * 1. A product image (in this case, an NFT)
 * 2. A success message confirming payment verification
 * 3. The raw payment data received from Toss Payments API
 *
 * In a production application, this page would typically show more user-friendly
 * information such as order details, shipping information, and next steps.
 *
 * @param loaderData - Data from the loader containing payment information
 * @returns JSX element representing the payment success page
 */
export default function Success({ loaderData }: Route.ComponentProps) {
  const [giftOpen, setGiftOpen] = useState(true);
  useEffect(() => {
    consumePendingAnalyticsEvent("purchase");
  }, []);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center">
      <section className="w-full rounded-[2rem] border border-emerald-500/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_42%)] p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <CheckCircle2Icon className="size-7" />
        </span>
        <p className="mt-5 text-xs font-black tracking-[0.18em] text-emerald-500">
          EOKKA PRO
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
          결제가 완료됐어요
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6 font-medium">
          {loaderData.payment.orderName} 결제가 정상적으로 확인됐어요.
          <br />
          이제 EOKKA Pro의 모든 기능을 이용할 수 있어요.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button
            onClick={() => setGiftOpen(true)}
            className="rounded-full bg-emerald-500 font-black text-white hover:bg-emerald-600"
          >
            <GiftIcon className="size-4" /> 감사 선물 열어보기
          </Button>
          <Button asChild variant="outline" className="rounded-full font-black">
            <Link to="/dashboard">대시보드로 이동</Link>
          </Button>
        </div>
      </section>

      <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
        <DialogContent className="overflow-hidden rounded-[2rem] border-amber-500/25 p-0 sm:max-w-lg">
          <div className="relative bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.25),transparent_48%),linear-gradient(145deg,rgba(16,185,129,0.1),transparent)] px-7 pt-9 pb-7 text-center">
            <SparklesIcon className="absolute top-7 left-7 size-5 text-amber-400" />
            <PartyPopperIcon className="absolute top-8 right-7 size-6 text-violet-400" />
            <span className="mx-auto flex size-16 items-center justify-center rounded-[1.4rem] border border-amber-400/30 bg-amber-400/15 text-amber-500 shadow-[0_15px_45px_-20px_rgba(245,158,11,0.8)]">
              <GiftIcon className="size-8" />
            </span>
            <DialogHeader className="mt-5 text-center sm:text-center">
              <p className="text-xs font-black tracking-[0.18em] text-amber-600 dark:text-amber-300">
                A GIFT FOR YOU
              </p>
              <DialogTitle className="mt-2 text-2xl font-black tracking-[-0.035em]">
                결제해 주셔서 감사합니다!
              </DialogTitle>
              <DialogDescription className="mt-3 text-sm leading-6 font-medium">
                감사의 마음을 담아 작은 선물을 준비했어요. 개발자가 실제로
                투자하고 있는 주식 포트폴리오와 편안하게 장기 투자하는 이야기를
                Pro 회원님께만 공개할게요.
              </DialogDescription>
            </DialogHeader>
            <Form
              method="post"
              action="/api/users/developer-portfolio-gift"
              className="mt-6"
            >
              <Button
                type="submit"
                className="h-auto w-full rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 px-5 py-4 text-left font-black text-white shadow-[0_15px_35px_-18px_rgba(16,185,129,0.9)] hover:from-amber-400 hover:to-emerald-400"
              >
                <GiftIcon className="size-5 shrink-0" />
                <span className="flex-1">
                  <span className="block">선물 받고 구경하러 가기</span>
                  <span className="mt-1 block text-xs font-semibold text-white/75">
                    개발자의 실제 주식 포트폴리오가 열려요
                  </span>
                </span>
              </Button>
            </Form>
            <p className="text-muted-foreground mt-4 text-xs font-medium">
              선물을 열면 대시보드 사이드 메뉴에 새로운 메뉴가 나타나요.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
