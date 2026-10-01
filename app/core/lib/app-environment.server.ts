export type AppEnvironment = "development" | "preview" | "production" | "test";

const supportedEnvironments = new Set<AppEnvironment>([
  "development",
  "preview",
  "production",
  "test",
]);

export function getAppEnvironment(): AppEnvironment {
  const configured = process.env.APP_ENV?.trim().toLowerCase();
  if (configured) {
    if (!supportedEnvironments.has(configured as AppEnvironment))
      throw new Error(
        "APP_ENV는 development, preview, production, test 중 하나여야 합니다.",
      );
    return configured as AppEnvironment;
  }
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  if (process.env.NODE_ENV === "test") return "test";
  // A local production build also sets NODE_ENV=production. APP_ENV is the
  // explicit deployment boundary; without it, a non-Vercel process is local.
  return "development";
}

export function isProductionEnvironment() {
  return getAppEnvironment() === "production";
}

export function isLocalDevelopmentEnvironment() {
  return getAppEnvironment() === "development" && !process.env.VERCEL_ENV;
}

export function validateEnvironmentConfiguration() {
  const appEnvironment = getAppEnvironment();
  const dataEnvironment = process.env.DATA_ENV?.trim().toLowerCase();

  if (appEnvironment === "production" && dataEnvironment !== "production")
    throw new Error("운영 환경에서는 DATA_ENV=production을 명시해야 합니다.");
  if (appEnvironment !== "production" && dataEnvironment === "production")
    throw new Error(
      "개발·미리보기 환경에서 운영 데이터베이스를 사용할 수 없습니다.",
    );
  if (
    appEnvironment === "production" &&
    process.env.STOCK_MARKET_MODE === "global-test"
  )
    throw new Error(
      "운영 환경에서는 global-test 주식 모드를 사용할 수 없습니다.",
    );
  if (
    appEnvironment === "production" &&
    (process.env.SITE_URL?.includes("localhost") ||
      process.env.SITE_URL?.includes("127.0.0.1"))
  )
    throw new Error("운영 환경의 SITE_URL에는 로컬 주소를 사용할 수 없습니다.");
}

export function isEmailDeliveryEnabled() {
  const configured = process.env.EMAIL_DELIVERY_ENABLED?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return isProductionEnvironment();
}

export function resolveEmailRecipient(recipient: string) {
  if (!isEmailDeliveryEnabled()) return null;
  if (isProductionEnvironment()) return recipient;
  return process.env.EMAIL_TEST_RECIPIENT?.trim() || null;
}

export function requireTossPaymentsSecretKey() {
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY?.trim();
  if (!secretKey)
    throw new Error("TOSS_PAYMENTS_SECRET_KEY가 설정되지 않았습니다.");
  if (isProductionEnvironment() && secretKey.startsWith("test_"))
    throw new Error("운영 환경에서는 Toss 테스트 비밀키를 사용할 수 없습니다.");
  if (!isProductionEnvironment() && secretKey.startsWith("live_"))
    throw new Error(
      "개발·미리보기 환경에서는 Toss 운영 비밀키를 사용할 수 없습니다.",
    );
  return secretKey;
}
