import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFscFundamentals } from "./fsc-fundamentals.server";

test("금융위 요약재무제표를 버핏 원칙 분석용 지표로 변환한다", () => {
  const result = normalizeFscFundamentals([
    {
      bizYear: "2024",
      basDt: "20241231",
      fnclDcdNm: "연결요약재무제표",
      enpSaleAmt: "1000",
      enpBzopPft: "100",
      enpCrtmNpf: "80",
      enpTdbtAmt: "400",
      enpTcptAmt: "800",
    },
    {
      bizYear: "2025",
      basDt: "20251231",
      fnclDcdNm: "연결요약재무제표",
      enpSaleAmt: "1200",
      enpBzopPft: "150",
      enpCrtmNpf: "96",
      enpTdbtAmt: "480",
      enpTcptAmt: "960",
    },
  ]);

  assert.ok(result);
  assert.equal(result.periods, 2);
  assert.equal(result.revenueGrowthPercent, 20);
  assert.equal(result.operatingProfitGrowthPercent, 50);
  assert.equal(result.netIncomeGrowthPercent, 20);
  assert.equal(result.operatingMarginPercent, 12.5);
  assert.equal(result.debtRatioPercent, 50);
  assert.equal(result.returnOnEquityPercent, 10);
});

test("같은 사업연도에는 연결 재무제표를 우선한다", () => {
  const result = normalizeFscFundamentals([
    {
      bizYear: "2025",
      fnclDcdNm: "별도요약재무제표",
      enpSaleAmt: "500",
      enpBzopPft: "25",
    },
    {
      bizYear: "2025",
      fnclDcdNm: "연결요약재무제표",
      enpSaleAmt: "1000",
      enpBzopPft: "100",
    },
  ]);

  assert.equal(result?.operatingMarginPercent, 10);
});
