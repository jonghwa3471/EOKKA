export const won = (value: number) =>
  `${Math.round(value).toLocaleString("ko-KR")}원`;

export const price = (value: number, currency: "KRW" | "USD") =>
  currency === "USD"
    ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : won(value);

export const compactWon = (value: number) => {
  const rounded = Math.round(value);
  const eok = Math.floor(rounded / 100_000_000);
  const man = Math.floor((rounded % 100_000_000) / 10_000);
  if (eok > 0)
    return man > 0
      ? `${eok.toLocaleString("ko-KR")}억 ${man.toLocaleString("ko-KR")}만원`
      : `${eok.toLocaleString("ko-KR")}억원`;
  if (man > 0) return `${man.toLocaleString("ko-KR")}만원`;
  return won(rounded);
};

export const percent = (value: number | null) =>
  value === null ? "데이터 부족" : `${value.toFixed(1)}%`;

export const projectionAnnualRate = (
  futureValue: number,
  currentValue: number,
  years: number,
) =>
  currentValue > 0 && futureValue > 0
    ? ((futureValue / currentValue) ** (1 / years) - 1) * 100
    : -100;

export const goalLabel = (value: number) =>
  `${(value / 100_000_000).toLocaleString("ko-KR")}억`;

export function remainingPeriodLabel(month: number | null) {
  if (month === null) return "30년 내 도달이 어려워요";
  if (month === 0) return "목표를 달성했어요!";
  const years = Math.floor(month / 12);
  const remainingMonths = month % 12;
  const period = [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${period} 남았어요`;
}

export function goalDurationLabel(month: number | null) {
  if (month === null) return "30년 내 미도달";
  if (month === 0) return "현재 목표 달성";
  const years = Math.floor(month / 12);
  const remainingMonths = month % 12;
  const period = [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `약 ${period}`;
}

export function periodOnlyLabel(months: number) {
  if (months <= 0) return "변화 없음";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function compoundValueLabel(value: number) {
  if (!Number.isFinite(value)) return "계산 범위를 넘는 금액";
  if (value >= 1_000_000_000_000_000) {
    return `약 ${value.toExponential(2)}원`;
  }
  return compactWon(value);
}
