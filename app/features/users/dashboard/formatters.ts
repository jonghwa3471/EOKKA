export const won = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatWon(value: number) {
  return `${won.format(value)}원`;
}

export function formatGoalAmount(value: number) {
  if (value >= 100_000_000 && value % 100_000_000 === 0) {
    return `${(value / 100_000_000).toLocaleString("ko-KR")}억`;
  }
  return formatWon(value);
}

export function formatRate(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatMonths(months: number | null) {
  if (months === null) return "50년 이상";
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years}년 ${rest}개월` : `${years}년`;
}

export function recordDate(value: string) {
  return value.slice(5).replace("-", ".");
}
