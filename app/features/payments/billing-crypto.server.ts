import type { subscriptions } from "./schema";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function encryptionKey() {
  const value = process.env.BILLING_ENCRYPTION_KEY?.trim();
  if (!value) throw new Error("BILLING_ENCRYPTION_KEY가 설정되지 않았습니다.");
  return createHash("sha256").update(value).digest();
}

export function encryptBillingKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptBillingKey(
  subscription: typeof subscriptions.$inferSelect,
) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(subscription.billing_key_iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(subscription.billing_key_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(subscription.billing_key_ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
