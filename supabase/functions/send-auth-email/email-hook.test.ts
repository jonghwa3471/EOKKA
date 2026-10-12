import {
  confirmationUrl,
  deliveriesFor,
  type SendEmailHookPayload,
} from "./email-hook.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function payload(
  overrides: Partial<SendEmailHookPayload> = {},
): SendEmailHookPayload {
  return {
    user: { email: "current@example.com" },
    email_data: {
      token_hash: "regular-hash",
      redirect_to: "https://preview.qualius.co/from-auth",
      site_url: "https://fallback.qualius.co",
      email_action_type: "magiclink",
    },
    ...overrides,
  };
}

Deno.test("creates an app confirmation URL for a magic link", () => {
  const data = payload().email_data;
  const url = new URL(confirmationUrl(data, data.token_hash));

  assertEquals(url.origin, "https://preview.qualius.co");
  assertEquals(url.pathname, "/auth/confirm");
  assertEquals(url.searchParams.get("token_hash"), "regular-hash");
  assertEquals(url.searchParams.get("type"), "email");
  assertEquals(url.searchParams.get("next"), "/");
});

Deno.test("uses the site URL when redirect_to is empty", () => {
  const data = payload({
    email_data: {
      token_hash: "recovery-hash",
      redirect_to: "",
      site_url: "http://localhost:5173",
      email_action_type: "recovery",
    },
  }).email_data;
  const url = new URL(confirmationUrl(data, data.token_hash));

  assertEquals(url.origin, "http://localhost:5173");
  assertEquals(url.searchParams.get("type"), "recovery");
  assertEquals(url.searchParams.get("next"), "/auth/forgot-password/create");
});

Deno.test("pairs secure email change hashes with the correct addresses", () => {
  const input = payload({
    user: {
      email: "current@example.com",
      new_email: "new@example.com",
    },
    email_data: {
      token_hash: "new-address-hash",
      token_hash_new: "current-address-hash",
      redirect_to: "https://preview.qualius.co",
      email_action_type: "email_change",
    },
  });

  assertEquals(deliveriesFor(input), [
    { to: "current@example.com", tokenHash: "current-address-hash" },
    { to: "new@example.com", tokenHash: "new-address-hash" },
  ]);
});
