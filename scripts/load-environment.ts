import { config } from "dotenv";

// The first file wins because dotenv does not overwrite values by default.
// This keeps local development isolated from the future production .env.
config({ path: [".env.development.local", ".env.local", ".env"] });

export function assertSafeDatabaseCommand(commandName: string) {
  const dataEnvironment = process.env.DATA_ENV?.trim().toLowerCase();
  if (!dataEnvironment)
    throw new Error(
      `${commandName}: DATA_ENV를 development, preview 또는 production으로 설정해 주세요.`,
    );
  if (
    dataEnvironment === "production" &&
    process.env.ALLOW_PRODUCTION_DATABASE_COMMANDS !== "true"
  )
    throw new Error(
      `${commandName}: 운영 DB 작업에는 ALLOW_PRODUCTION_DATABASE_COMMANDS=true 확인값이 필요합니다.`,
    );
}
