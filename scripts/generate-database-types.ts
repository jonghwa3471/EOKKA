import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: [".env.development.local", ".env.local", ".env"] });

if (
  process.env.DATA_ENV === "production" &&
  process.env.ALLOW_PRODUCTION_DATABASE_COMMANDS !== "true"
)
  throw new Error(
    "운영 DB 타입 생성에는 ALLOW_PRODUCTION_DATABASE_COMMANDS=true 확인값이 필요합니다.",
  );

function projectIdFromUrl() {
  const value = process.env.SUPABASE_URL?.trim();
  if (!value) return null;
  try {
    return new URL(value).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

const projectId = process.env.SUPABASE_PROJECT_ID?.trim() || projectIdFromUrl();
if (!projectId)
  throw new Error(
    "SUPABASE_PROJECT_ID가 필요합니다. 개발 또는 운영 프로젝트를 명시해 주세요.",
  );

const generated = execFileSync(
  "supabase",
  ["gen", "types", "typescript", "--project-id", projectId],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);

if (!generated.trim())
  throw new Error(
    "Supabase 타입 생성 결과가 비어 있어 기존 파일을 유지합니다.",
  );

writeFileSync(resolve("database.types.ts"), generated);
console.log(`Supabase 타입을 ${projectId} 프로젝트 기준으로 생성했습니다.`);
