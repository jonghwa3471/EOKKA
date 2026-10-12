import { render } from "@react-email/render";
import React from "react";
import { Resend } from "resend";
import { Webhook } from "standardwebhooks";

import AuthEmail from "./_templates/auth-email.tsx";
import {
  confirmationUrl,
  deliveriesFor,
  type SendEmailHookPayload,
  subjectByAction,
} from "./email-hook.ts";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const rawHookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
const sender = Deno.env.get("AUTH_EMAIL_FROM") ??
  "EOKKA <eokka@mail.qualius.co>";

if (!resendApiKey || !rawHookSecret) {
  throw new Error("Required email hook secrets are not configured.");
}

const resend = new Resend(resendApiKey);
const hookSecret = rawHookSecret.replace(/^v1,whsec_/, "");

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
      const url = confirmationUrl(payload.email_data, delivery.tokenHash);
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
