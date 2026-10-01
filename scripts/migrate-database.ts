import { config } from "dotenv";
import { spawnSync } from "node:child_process";

config({ path: [".env.development.local", ".env.local", ".env"] });

const dataEnvironment = process.env.DATA_ENV?.trim().toLowerCase();
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) throw new Error("DATABASE_URL이 설정되지 않았습니다.");
if (!dataEnvironment)
  throw new Error("DATA_ENV를 development, preview 또는 production으로 설정해 주세요.");

if (
  dataEnvironment === "production" &&
  process.env.ALLOW_PRODUCTION_DATABASE_COMMANDS !== "true"
)
  throw new Error(
    "운영 DB 마이그레이션에는 ALLOW_PRODUCTION_DATABASE_COMMANDS=true 확인값이 필요합니다.",
  );

console.log(`${dataEnvironment} 데이터베이스에 마이그레이션을 적용합니다.`);

const result = spawnSync(
  process.execPath,
  ["./node_modules/drizzle-kit/bin.cjs", "migrate"],
  { stdio: "inherit", env: process.env },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
