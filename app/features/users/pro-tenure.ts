export const PRO_TENURE_BADGES = [
  {
    months: 1,
    name: "Pro 스타터",
    description: "EOKKA Pro와 첫 달을 시작한 사용자에게 드려요.",
    image: "/images/pro-badges/tenure-01.png",
    tone: "emerald" as const,
  },
  {
    months: 3,
    name: "꾸준한 동행",
    description: "3개월 동안 투자 기록을 꾸준히 이어 온 사용자에게 드려요.",
    image: "/images/pro-badges/tenure-03.png",
    tone: "cyan" as const,
  },
  {
    months: 6,
    name: "복리 메이트",
    description: "반년 동안 작은 변화를 차곡차곡 기록한 사용자에게 드려요.",
    image: "/images/pro-badges/tenure-06.png",
    tone: "violet" as const,
  },
  {
    months: 12,
    name: "장기 투자자",
    description: "1년 동안 흔들림 없이 기록을 이어 온 사용자에게 드려요.",
    image: "/images/pro-badges/tenure-12.png",
    tone: "amber" as const,
  },
  {
    months: 24,
    name: "EOKKA 레전드",
    description: "2년 이상 EOKKA와 투자 여정을 함께한 사용자에게 드려요.",
    image: "/images/pro-badges/tenure-24.png",
    tone: "rose" as const,
  },
] as const;

export type ProTenureBadge = (typeof PRO_TENURE_BADGES)[number];

export function proTenureBadge(months: number) {
  return [...PRO_TENURE_BADGES]
    .reverse()
    .find((badge) => months >= badge.months);
}
