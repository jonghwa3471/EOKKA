import { render } from "npm:@react-email/render@^2.0.6";
import React from "npm:react@^19.0.0";
import { Resend } from "npm:resend@^6.0.0";
import { Webhook } from "npm:standardwebhooks@^1.0.0";

import AuthEmail from "./_templates/auth-email.tsx";

type EmailActionType = "signup" | "magiclink" | "recovery" | "email_change";

interface SendEmailHookPayload {
  user: {
    email: string;
    new_email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token_hash: string;
    token_hash_new?: string;
    redirect_to: string;
    email_action_type: EmailActionType;
  };
}

interface Delivery {
  to: string;
  tokenHash: string;
}

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const rawHookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
const sender =
  Deno.env.get("AUTH_EMAIL_FROM") ?? "EOKKA <eokka@mail.jjongstudio.co>";

if (!resendApiKey || !rawHookSecret) {
  throw new Error("Required email hook secrets are not configured.");
}

const resend = new Resend(resendApiKey);
const hookSecret = rawHookSecret.replace(/^v1,whsec_/, "");

const subjectByAction: Record<EmailActionType, string> = {
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

function confirmationUrl(
  redirectTo: string,
  action: EmailActionType,
  tokenHash: string,
) {
  const url = new URL("/auth/confirm", redirectTo);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", callbackType(action));
  url.searchParams.set("next", callbackNext(action));
  return url.toString();
}

function deliveriesFor(payload: SendEmailHookPayload): Delivery[] {
  const { user, email_data: data } = payload;

  if (data.email_action_type !== "email_change") {
    return [{ to: user.email, tokenHash: data.token_hash }];
  }

  // Supabase Secure Email Change sends one confirmation to each address.
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

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.text();
    const webhook = new Webhook(hookSecret);
    const payload = webhook.verify(
      body,
      Object.fromEntries(request.headers),
    ) as SendEmailHookPayload;
    const action = payload.email_data.email_action_type;

    if (!(action in subjectByAction)) {
      throw new Error(`Unsupported email action: ${action}`);
    }

    const name = payload.user.user_metadata?.name;
    const recipientName = typeof name === "string" ? name : undefined;

    for (const delivery of deliveriesFor(payload)) {
      const url = confirmationUrl(
        payload.email_data.redirect_to,
        action,
        delivery.tokenHash,
      );
      const html = await render(
        React.createElement(AuthEmail, {
          action,
          confirmationUrl: url,
          recipientName,
        }),
      );

      const { error } = await resend.emails.send({
        from: sender,
        to: [delivery.to],
        subject: subjectByAction[action],
        html,
      });

      if (error) throw new Error(error.message);
    }

    return Response.json({});
  } catch (error) {
    console.error("Send email hook failed", error);
    return Response.json(
      {
        error: {
          http_code: 401,
          message: "Authentication email could not be sent.",
        },
      },
      { status: 401 },
    );
  }
});
