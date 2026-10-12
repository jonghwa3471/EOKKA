export function goalLabel(amount: number) {
  return `${(amount / 100_000_000).toLocaleString("ko-KR")}억`;
}

export function periodLabel(months: number) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return [
    years > 0 ? `${years}년` : "",
    remainingMonths > 0 ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
