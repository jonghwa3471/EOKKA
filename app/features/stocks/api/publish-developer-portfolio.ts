import type { Route } from "./+types/publish-developer-portfolio";

import { timingSafeEqual } from "node:crypto";
import { data } from "react-router";

import { isProductionEnvironment } from "~/core/lib/app-environment.server";
import { storeDeveloperPortfolioSnapshot } from "~/features/stocks/developer-portfolio/developer-portfolio.server";
import { publicDeveloperPortfolioSnapshotSchema } from "~/features/stocks/developer-portfolio/developer-portfolio.types";

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function action({ request }: Route.ActionArgs) {
  if (!isProductionEnvironment())
    throw new Response("Not Found", { status: 404 });

  const configuredSecret =
    process.env.DEVELOPER_PORTFOLIO_PUBLISH_SECRET?.trim();
  if (!configuredSecret)
    return data(
      { error: "게시 비밀키가 설정되지 않았습니다." },
      { status: 503 },
    );

  const authorization = request.headers.get("Authorization") ?? "";
  const receivedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!secretsMatch(receivedSecret, configuredSecret))
    return data({ error: "Unauthorized" }, { status: 401 });

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > 256_000)
    return data({ error: "Payload Too Large" }, { status: 413 });

  const body = await request.json().catch(() => null);
  const parsed = publicDeveloperPortfolioSnapshotSchema.safeParse(body);
  if (!parsed.success)
    return data(
      { error: "공개 스냅샷 형식이 올바르지 않습니다." },
      { status: 400 },
    );

  await storeDeveloperPortfolioSnapshot(parsed.data, null);
  return data({ ok: true, asOf: parsed.data.asOf });
}
