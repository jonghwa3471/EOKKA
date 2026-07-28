import type { Route } from "./+types/analyze";

import { data } from "react-router";

import { type AnalysisInput, analyzePortfolio } from "../analysis.server";

export async function action({ request }: Route.ActionArgs) {
  try {
    const input = (await request.json()) as AnalysisInput;
    return data(await analyzePortfolio(input));
  } catch (error) {
    return data(
      {
        error: error instanceof Error ? error.message : "분석에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
