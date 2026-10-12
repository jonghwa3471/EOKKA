type MarketComparisonResult = {
  message: string;
  tone: string;
  period?: string;
  direction?: "빠르게" | "느리게";
};

export function marketComparison(
  baseMonth: number | null,
  marketMonth: number | null,
  marketLabel: string,
): MarketComparisonResult {
  if (baseMonth === null && marketMonth === null)
    return {
      message: `내 평균 시나리오와 ${marketLabel} 기준 모두 30년 안에 목표 도달이 어려워요.`,
      tone: "text-muted-foreground",
    };
  if (baseMonth !== null && marketMonth === null)
    return {
      message: `내 평균 시나리오는 목표에 도달하지만 ${marketLabel} 기준은 30년 안에 도달하지 못해요.`,
      tone: "text-emerald-600 dark:text-emerald-400",
    };
  if (baseMonth === null && marketMonth !== null)
    return {
      message: `${marketLabel} 기준은 목표에 도달하지만 내 평균 시나리오는 30년 안에 도달하지 못해요.`,
      tone: "text-amber-600 dark:text-amber-400",
    };

  const difference = marketMonth! - baseMonth!;
  if (Math.abs(difference) <= 1)
    return {
      message: `내 평균 시나리오와 ${marketLabel} 기준의 목표 도달 속도가 비슷해요.`,
      tone: "text-muted-foreground",
    };

  const months = Math.abs(difference);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const period = [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return difference > 0
    ? {
        message: `내 평균 시나리오가 ${marketLabel} 기준보다 약 ${period} 빠르게 목표에 도착해요.`,
        tone: "text-emerald-600 dark:text-emerald-400",
        period,
        direction: "빠르게",
      }
    : {
        message: `내 평균 시나리오가 ${marketLabel} 기준보다 약 ${period} 늦게 목표에 도착해요.`,
        tone: "text-amber-600 dark:text-amber-400",
        period,
        direction: "느리게",
      };
}
