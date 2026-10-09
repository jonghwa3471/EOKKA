import type { Route } from "./+types/analyze-portfolios";

import { data } from "react-router";

import { isAutomaticAnalysisEnabled } from "~/core/lib/app-environment.server";
import { runAutomaticPortfolioAnalysis } from "~/features/stocks/history/automatic-analysis.server";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function loader({ request }: Route.LoaderArgs) {
  if (!process.env.CRON_SECRET)
    return data(
      { error: "CRON_SECRET이 설정되지 않았습니다." },
      { status: 503 },
    );
  if (!isAuthorized(request))
    return data({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  if (!isAutomaticAnalysisEnabled())
    return data(
      { error: "베타 기간에는 자동 분석을 제공하지 않습니다." },
      { status: 503 },
    );

  const stats = await runAutomaticPortfolioAnalysis();
  return data({ ok: true, ...stats });
}
