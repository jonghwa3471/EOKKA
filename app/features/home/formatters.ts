import { type Holding } from "./quick-analysis-model";

export function formatKoreanMoney(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return "0원";

  const won = Math.floor(amount);
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  const remainder = won % 10_000;
  const parts = [
    eok > 0 ? `${eok.toLocaleString("ko-KR")}억` : "",
    man > 0 ? `${man.toLocaleString("ko-KR")}만` : "",
    remainder > 0 ? remainder.toLocaleString("ko-KR") : "",
  ].filter(Boolean);

  return `${parts.join(" ")}원`;
}

export function formatAveragePrice(
  amount: string,
  currency: Holding["currency"],
) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (currency === "KRW") return formatKoreanMoney(value);
  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}달러`;
}

export function formatGoalPeriod(months: number | null) {
  if (months === null) return "50년 안에는 예측하기 어려워요";
  if (months <= 0) return "이미 목표를 달성했어요";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return [
    years ? `${years}년` : "",
    remainingMonths ? `${remainingMonths}개월` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function koreanParticle(
  word: string,
  withBatchim: string,
  withoutBatchim: string,
) {
  const lastCharacter = word.trim().at(-1);
  if (!lastCharacter) return withoutBatchim;

  const code = lastCharacter.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim;
  }

  if (/\d/.test(lastCharacter)) {
    return ["0", "1", "3", "6", "7", "8"].includes(lastCharacter)
      ? withBatchim
      : withoutBatchim;
  }

  return withoutBatchim;
}
