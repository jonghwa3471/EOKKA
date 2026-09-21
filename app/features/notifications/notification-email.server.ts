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
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
}) {
  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message).replaceAll("\n", "<br />");
  const href = escapeHtml(absoluteUrl(input.href));
  const emailMeta: Partial<
    Record<NotificationType, { badge: string; button: string }>
  > = {
    support_reply: { badge: "문의 답변", button: "답변 확인하기" },
    payment_completed: { badge: "결제 완료", button: "결제 내역 확인하기" },
    subscription_renewal_upcoming: {
      badge: "구독 안내",
      button: "EOKKA Pro 확인하기",
    },
    site_announcement: { badge: "EOKKA 소식", button: "공지 확인하기" },
  };
  const meta = emailMeta[input.type] ?? {
    badge: "알림",
    button: "EOKKA에서 확인하기",
  };
  return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#090b0f;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${title}</div>
  <div style="padding:32px 12px">
    <div style="max-width:560px;margin:0 auto">
      <div style="height:5px;border-radius:18px 18px 0 0;background:#10b981;background:linear-gradient(90deg,#10b981,#22d3ee,#8b5cf6)"></div>
      <div style="border:1px solid #2b3038;border-top:0;border-radius:0 0 18px 18px;background:#15181d;padding:38px 36px 32px">
        <div style="margin:0 0 28px">
          <span style="display:inline-block;margin-right:10px;color:#34d399;font-size:18px;font-weight:800;letter-spacing:2px">EOKKA</span>
          <span style="display:inline-block;border:1px solid #4b5563;border-radius:999px;color:#9ca3af;font-size:10px;font-weight:700;letter-spacing:1px;padding:4px 8px">${escapeHtml(meta.badge)}</span>
        </div>
        <h1 style="margin:0 0 14px;color:#fff;font-size:26px;line-height:1.35">${title}</h1>
        <p style="margin:0 0 28px;color:#c4c9d1;font-size:15px;line-height:1.7">${message}</p>
        <a href="${href}" style="display:block;border-radius:10px;background:#f8fafc;color:#111827;padding:14px 20px;text-align:center;text-decoration:none;font-size:15px;font-weight:700">${escapeHtml(meta.button)}</a>
        <div style="margin:30px 0;border-top:1px solid #30353d"></div>
        <p style="margin:0;color:#8b93a1;font-size:12px;line-height:1.6">버튼이 작동하지 않으면 아래 주소를 브라우저에 복사해 주세요.</p>
        <p style="margin:12px 0 0;color:#67e8f9;font-size:11px;line-height:1.6;overflow-wrap:anywhere;word-break:break-all">${href}</p>
      </div>
      <p style="margin:18px 0 0;color:#626a76;font-size:11px;text-align:center">© ${new Date().getFullYear()} EOKKA</p>
    </div>
  </div>
</body>
</html>`;
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
      html: notificationEmailHtml({
        type: input.type,
        title: input.title,
        message: input.message,
        href: input.href,
      }),
    });
    if (error) console.error("Notification email send failed", error);
  } catch (error) {
    console.error("Notification email send failed", error);
  }
}
