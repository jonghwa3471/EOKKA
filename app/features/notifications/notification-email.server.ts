import type { NotificationType } from "./notifications.server";

import resendClient from "~/core/lib/resend-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

const EMAIL_NOTIFICATION_TYPES = new Set<NotificationType>([
  "support_reply",
  "payment_completed",
  "subscription_renewal_upcoming",
  "site_announcement",
]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absoluteUrl(href?: string | null) {
  if (!href) return process.env.SITE_URL ?? "http://localhost:5173";
  try {
    return new URL(href, process.env.SITE_URL ?? "http://localhost:5173").href;
  } catch {
    return process.env.SITE_URL ?? "http://localhost:5173";
  }
}

function notificationEmailHtml(input: {
  title: string;
  message: string;
  href?: string | null;
}) {
  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message).replaceAll("\n", "<br />");
  const href = escapeHtml(absoluteUrl(input.href));
  return `<!doctype html>
<html lang="ko"><body style="margin:0;background:#f2f5f1;color:#1d2922;font-family:Pretendard,'Apple SD Gothic Neo',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">
    <div style="margin-bottom:18px;font-size:13px;font-weight:800;letter-spacing:.08em;color:#059669">EOKKA</div>
    <div style="border:1px solid #d8e0da;border-radius:24px;background:#fbfcfa;padding:32px">
      <h1 style="margin:0;font-size:24px;line-height:1.4">${title}</h1>
      <p style="margin:16px 0 0;color:#59655e;font-size:15px;line-height:1.8">${message}</p>
      <a href="${href}" style="display:inline-block;margin-top:26px;border-radius:999px;background:#111827;color:#fff;padding:13px 20px;text-decoration:none;font-size:14px;font-weight:800">EOKKA에서 확인하기</a>
    </div>
  </div>
</body></html>`;
}

export async function sendNotificationEmail(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
}) {
  if (!EMAIL_NOTIFICATION_TYPES.has(input.type)) return;
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "Notification email skipped: RESEND_API_KEY is not configured.",
    );
    return;
  }

  try {
    const { data, error: userError } = await adminClient.auth.admin.getUserById(
      input.userId,
    );
    if (userError || !data.user?.email) {
      console.error("Notification email recipient lookup failed", userError);
      return;
    }
    const { error } = await resendClient.emails.send({
      from:
        process.env.NOTIFICATION_EMAIL_FROM ??
        "EOKKA <notifications@mail.jjongstudio.co>",
      to: [data.user.email],
      subject: `[EOKKA] ${input.title}`,
      html: notificationEmailHtml(input),
    });
    if (error) console.error("Notification email send failed", error);
  } catch (error) {
    console.error("Notification email send failed", error);
  }
}
