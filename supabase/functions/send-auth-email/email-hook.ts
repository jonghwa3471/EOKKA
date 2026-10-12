export type EmailActionType =
  | "signup"
  | "magiclink"
  | "recovery"
  | "email_change";

export interface SendEmailHookPayload {
  user: {
    email: string;
    new_email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token_hash: string;
    token_hash_new?: string;
    redirect_to: string;
    site_url?: string;
    email_action_type: EmailActionType;
  };
}

export interface Delivery {
  to: string;
  tokenHash: string;
}

export const subjectByAction: Record<EmailActionType, string> = {
  signup: "EOKKA 회원가입을 완료해 주세요",
  magiclink: "EOKKA 로그인 링크가 도착했어요",
  recovery: "EOKKA 계정 복구를 진행해 주세요",
  email_change: "EOKKA 이메일 변경을 확인해 주세요",
};

function callbackType(action: EmailActionType) {
  if (action === "recovery") return "recovery";
  if (action === "email_change") return "email_change";
  return "email";
}

function callbackNext(action: EmailActionType) {
  if (action === "recovery") return "/auth/forgot-password/create";
  if (action === "email_change") return "/auth/email-verified";
  return "/";
}

export function confirmationUrl(
  emailData: SendEmailHookPayload["email_data"],
  tokenHash: string,
) {
  const baseUrl = emailData.redirect_to || emailData.site_url;
  if (!baseUrl) throw new Error("Email confirmation redirect URL is missing.");

  const base = new URL(baseUrl);
  if (base.protocol !== "https:" && base.protocol !== "http:") {
    throw new Error("Email confirmation redirect URL is invalid.");
  }

  const url = new URL("/auth/confirm", base);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", callbackType(emailData.email_action_type));
  url.searchParams.set("next", callbackNext(emailData.email_action_type));
  return url.toString();
}

export function deliveriesFor(payload: SendEmailHookPayload): Delivery[] {
  const { user, email_data: data } = payload;

  if (data.email_action_type !== "email_change") {
    return [{ to: user.email, tokenHash: data.token_hash }];
  }

  // The `_new` hash belongs to the current address in Supabase Secure Email
  // Change. The regular hash belongs to the new address.
  if (user.new_email && data.token_hash_new) {
    return [
      { to: user.email, tokenHash: data.token_hash_new },
      { to: user.new_email, tokenHash: data.token_hash },
    ];
  }

  return [
    {
      to: user.new_email ?? user.email,
      tokenHash: data.token_hash,
    },
  ];
}
