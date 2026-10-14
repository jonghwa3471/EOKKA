import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve(".env.development.local");
const targetPath = resolve(".env.preview.local");
const previewUrl = process.argv[2]?.trim();

function parseEnvironment(source: string) {
  const values = new Map<string, string>();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

function secret() {
  return `"${randomBytes(48).toString("base64")}"`;
}

const source = parseEnvironment(await readFile(sourcePath, "utf8"));
const existing = await readFile(targetPath, "utf8")
  .then(parseEnvironment)
  .catch(() => new Map<string, string>());
const stableSecret = (key: string) => existing.get(key) || secret();
const requiredFromDevelopment = [
  "SUPABASE_PROJECT_ID",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "DATABASE_URL",
  "VITE_APP_NAME",
  "OPENAI_API_KEY",
  "FSC_STOCK_API_KEY",
] as const;

const missing = requiredFromDevelopment.filter((key) => !source.get(key));
if (missing.length > 0)
  throw new Error(
    `.env.development.local에 필수 값이 없습니다: ${missing.join(", ")}`,
  );

const output = new Map<string, string>([
  ["APP_ENV", "preview"],
  ["DATA_ENV", "preview"],
  ["SITE_URL", previewUrl || "https://REPLACE_WITH_PREVIEW_URL.vercel.app"],
  ["SUPABASE_PROJECT_ID", source.get("SUPABASE_PROJECT_ID")!],
  ["SUPABASE_URL", source.get("SUPABASE_URL")!],
  ["SUPABASE_PUBLISHABLE_KEY", source.get("SUPABASE_PUBLISHABLE_KEY")!],
  ["SUPABASE_SECRET_KEY", source.get("SUPABASE_SECRET_KEY")!],
  ["DATABASE_URL", source.get("DATABASE_URL")!],
  ["ALLOW_PRODUCTION_DATABASE_COMMANDS", "false"],
  ["VITE_APP_NAME", source.get("VITE_APP_NAME")!],
  ["OPENAI_API_KEY", source.get("OPENAI_API_KEY")!],
  ["OPENAI_MODEL", source.get("OPENAI_MODEL") || "gpt-5.4-mini"],
  ["FSC_STOCK_API_KEY", source.get("FSC_STOCK_API_KEY")!],
  ["STOCK_MARKET_MODE", "domestic"],
  ["COOKIE_SECRET", stableSecret("COOKIE_SECRET")],
  ["RATE_LIMIT_HASH_SECRET", stableSecret("RATE_LIMIT_HASH_SECRET")],
  ["CRON_SECRET", stableSecret("CRON_SECRET")],
  ["RATE_LIMIT_IP_HEADER", "x-forwarded-for"],
  ["AUTOMATIC_ANALYSIS_ENABLED", "false"],
  ["PAYMENTS_ENABLED", "false"],
  ["EMAIL_DELIVERY_ENABLED", "true"],
]);

for (const key of [
  "FSC_FINANCIAL_API_KEY",
  "EMAIL_TEST_RECIPIENT",
  "RESEND_API_KEY",
  "NOTIFICATION_EMAIL_FROM",
  "SENTRY_DSN",
  "VITE_SENTRY_DSN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_AUTH_TOKEN",
  "VITE_CHANNEL_PLUGIN_KEY",
] as const) {
  const value = source.get(key);
  if (value) output.set(key, value);
}

const header = [
  "# Generated from .env.development.local for Vercel Preview.",
  "# Do not commit this file. Replace SITE_URL after the first Preview URL is known.",
  "",
].join("\n");
const body = [...output].map(([key, value]) => `${key}=${value}`).join("\n");

await writeFile(targetPath, `${header}${body}\n`, { mode: 0o600 });

console.log(
  previewUrl
    ? ".env.preview.local을 생성했습니다. Vercel Preview 환경변수에 가져오세요."
    : ".env.preview.local을 생성했습니다. SITE_URL을 실제 Preview URL로 바꾼 뒤 가져오세요.",
);
