import type { AnalysisResult } from "~/features/stocks/analysis.types";

export type AchievementTone =
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "cyan"
  | "blue";
export type AchievementCategory =
  | "분석 기록"
  | "정밀 분석"
  | "포트폴리오"
  | "투자 성과"
  | "버핏 지수"
  | "목표 달성"
  | "투자 습관"
  | "자산 성장";

export interface AchievementDefinition {
  id: string;
  name: string;
  emoji: string;
  mission: string;
  description: string;
  tone: AchievementTone;
  category: AchievementCategory;
  difficultyTier?: AchievementDifficultyTier;
}

export type AchievementDifficultyTier =
  | "starter"
  | "easy"
  | "normal"
  | "hard"
  | "legendary";

export const ACHIEVEMENT_DIFFICULTY_STYLES: Record<
  AchievementDifficultyTier,
  { label: string; badge: string; card: string; glow: string; text: string }
> = {
  starter: {
    label: "입문",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    card: "border-emerald-500/35",
    glow: "from-emerald-500/16",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  easy: {
    label: "초급",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    card: "border-blue-500/35",
    glow: "from-blue-500/16",
    text: "text-blue-600 dark:text-blue-300",
  },
  normal: {
    label: "중급",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    card: "border-violet-500/35",
    glow: "from-violet-500/16",
    text: "text-violet-600 dark:text-violet-300",
  },
  hard: {
    label: "고급",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    card: "border-amber-500/35",
    glow: "from-amber-500/16",
    text: "text-amber-700 dark:text-amber-300",
  },
  legendary: {
    label: "최상급",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    card: "border-rose-500/35",
    glow: "from-rose-500/16",
    text: "text-rose-600 dark:text-rose-300",
  },
};

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  "분석 기록",
  "정밀 분석",
  "포트폴리오",
  "투자 성과",
  "버핏 지수",
  "목표 달성",
  "투자 습관",
  "자산 성장",
];

export const ACHIEVEMENT_CATEGORY_DESCRIPTIONS: Record<
  AchievementCategory,
  string
> = {
  "분석 기록": "분석한 날을 차곡차곡 쌓으며 투자 흐름을 관찰해 보세요.",
  "정밀 분석": "실제 매매일지를 바탕으로 더 정확한 기록 습관을 만들어 보세요.",
  포트폴리오: "보유 종목을 구성하고 위험을 나누는 경험을 쌓아 보세요.",
  "투자 성과": "포트폴리오의 수익률이 성장하며 열리는 성과를 확인해 보세요.",
  "버핏 지수": "1년 이상의 기록으로 장기 수익률의 높은 벽에 도전해 보세요.",
  "목표 달성": "정한 목표 금액에 한 걸음씩 가까워지는 과정을 확인해 보세요.",
  "투자 습관": "꾸준한 투자금과 긴 투자 기간으로 좋은 습관을 만들어 보세요.",
  "자산 성장": "평가금액과 수익이 커질수록 달라지는 성장 단계를 만나 보세요.",
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-analysis",
    name: "첫 발자국",
    emoji: "👣",
    mission: "첫 포트폴리오 분석을 완료해요.",
    description: "투자 여정을 숫자로 확인하기 시작했어요.",
    tone: "emerald",
    category: "분석 기록",
  },
  {
    id: "three-record-days",
    name: "삼일의 발견",
    emoji: "🔎",
    mission: "서로 다른 날짜의 분석 기록을 3일 쌓아요.",
    description: "하루의 숫자가 아닌 작은 흐름이 보이기 시작해요.",
    tone: "blue",
    category: "분석 기록",
  },
  {
    id: "seven-record-days",
    name: "일주일 관찰자",
    emoji: "📅",
    mission: "서로 다른 날짜의 분석 기록을 7일 쌓아요.",
    description: "일주일 동안 포트폴리오의 표정을 관찰했어요.",
    tone: "cyan",
    category: "분석 기록",
  },
  {
    id: "record-collector",
    name: "기록 수집가",
    emoji: "📚",
    mission: "서로 다른 날짜의 분석 기록을 10일 쌓아요.",
    description: "짧은 등락보다 흐름을 볼 수 있는 기록이 모였어요.",
    tone: "violet",
    category: "분석 기록",
  },
  {
    id: "thirty-day-witness",
    name: "시장의 한 달",
    emoji: "🗓️",
    mission: "서로 다른 날짜의 분석 기록을 30일 쌓아요.",
    description: "시장의 여러 표정을 한 달 동안 지켜봤어요.",
    tone: "cyan",
    category: "분석 기록",
  },
  {
    id: "fifty-record-days",
    name: "기록 항해사",
    emoji: "🧭",
    mission: "서로 다른 날짜의 분석 기록을 50일 쌓아요.",
    description: "흔들리는 날에도 기록을 놓지 않았어요.",
    tone: "blue",
    category: "분석 기록",
  },
  {
    id: "hundred-record-days",
    name: "백일의 투자일기",
    emoji: "💯",
    mission: "서로 다른 날짜의 분석 기록을 100일 쌓아요.",
    description: "100일의 시장을 내 기록으로 남겼어요.",
    tone: "amber",
    category: "분석 기록",
  },
  {
    id: "first-managed-analysis",
    name: "정밀한 첫걸음",
    emoji: "🧭",
    mission: "매매일지를 바탕으로 첫 정밀 분석을 완료해요.",
    description: "실제 매수 기록을 바탕으로 더 정확한 투자 기록을 시작했어요.",
    tone: "emerald",
    category: "정밀 분석",
  },
  {
    id: "three-managed-days",
    name: "꼼꼼한 관찰자",
    emoji: "🔬",
    mission: "서로 다른 날짜의 정밀 분석 기록을 3일 쌓아요.",
    description: "정밀한 기준으로 포트폴리오의 변화를 관찰하기 시작했어요.",
    tone: "blue",
    category: "정밀 분석",
  },
  {
    id: "seven-managed-days",
    name: "정밀 기록 루틴",
    emoji: "📝",
    mission: "서로 다른 날짜의 정밀 분석 기록을 7일 쌓아요.",
    description: "일주일의 변화를 실제 매매 기록과 함께 차곡차곡 남겼어요.",
    tone: "violet",
    category: "정밀 분석",
  },
  {
    id: "thirty-managed-days",
    name: "정밀 분석가",
    emoji: "🎯",
    mission: "서로 다른 날짜의 정밀 분석 기록을 30일 쌓아요.",
    description: "한 달의 투자 흐름을 정밀한 기록으로 완성했어요.",
    tone: "amber",
    category: "정밀 분석",
  },
  {
    id: "three-holdings",
    name: "세 갈래 바구니",
    emoji: "🧺",
    mission: "한 포트폴리오에 3개 이상의 종목을 보유해요.",
    description: "한 종목에만 기대지 않는 첫 구성을 만들었어요.",
    tone: "cyan",
    category: "포트폴리오",
  },
  {
    id: "diversified-investor",
    name: "분산투자가",
    emoji: "🌈",
    mission: "한 포트폴리오에 5개 이상의 종목을 보유해요.",
    description: "위험을 여러 바구니에 나누기 시작했어요.",
    tone: "emerald",
    category: "포트폴리오",
  },
  {
    id: "ten-holdings",
    name: "포트폴리오 팀",
    emoji: "🏀",
    mission: "한 포트폴리오에 10개 이상의 종목을 보유해요.",
    description: "다양한 선수가 뛰는 투자 팀을 만들었어요.",
    tone: "blue",
    category: "포트폴리오",
  },
  {
    id: "fifteen-holdings",
    name: "분산 설계자",
    emoji: "🧩",
    mission: "한 포트폴리오에 15개 이상의 종목을 보유해요.",
    description: "여러 조각으로 포트폴리오를 설계했어요.",
    tone: "violet",
    category: "포트폴리오",
  },
  {
    id: "twenty-holdings",
    name: "스무 개의 방패",
    emoji: "🛡️",
    mission: "한 포트폴리오에 20개 종목을 보유해요.",
    description: "EOKKA가 지원하는 가장 넓은 종목 구성을 완성했어요.",
    tone: "amber",
    category: "포트폴리오",
  },
  {
    id: "all-holdings-profitable",
    name: "올 그린",
    emoji: "🟢",
    mission: "3개 이상의 모든 보유 종목을 수익권으로 만들어요.",
    description: "포트폴리오의 모든 종목에 초록불이 켜졌어요.",
    tone: "emerald",
    category: "포트폴리오",
  },
  {
    id: "one-buffett",
    name: "1버핏",
    emoji: "🦬",
    mission: "1년 이상 투자하고 연평균 수익률 20% 이상을 기록해요.",
    description:
      "1년 이상의 기록으로 버핏의 장기 연평균 수익률로 알려진 20% 선을 넘었어요.",
    tone: "amber",
    category: "버핏 지수",
    difficultyTier: "hard",
  },
  {
    id: "annual-return-40",
    name: "2버핏",
    emoji: "🦬🦬",
    mission: "1년 이상 투자하고 연평균 수익률 40% 이상을 기록해요.",
    description:
      "1년 이상의 기록으로 버핏의 장기 연평균 수익률로 알려진 속도의 두 배에 도달했어요.",
    tone: "rose",
    category: "버핏 지수",
    difficultyTier: "legendary",
  },
  {
    id: "annual-return-60",
    name: "3버핏",
    emoji: "🦬🦬🦬",
    mission: "1년 이상 투자하고 연평균 수익률 60% 이상을 기록해요.",
    description:
      "1년 이상의 기록으로 버핏의 장기 연평균 수익률로 알려진 속도의 세 배에 도달했어요.",
    tone: "rose",
    category: "버핏 지수",
    difficultyTier: "legendary",
  },
  {
    id: "profit-zone",
    name: "초록 불빛",
    emoji: "🌱",
    mission: "포트폴리오 전체 수익률을 0%보다 높게 만들어요.",
    description: "평가손익이 수익 구간에 들어왔어요.",
    tone: "emerald",
    category: "투자 성과",
  },
  {
    id: "return-10",
    name: "십 퍼센트 계단",
    emoji: "🪜",
    mission: "포트폴리오 전체 수익률 10%를 달성해요.",
    description: "첫 두 자릿수 수익률 계단에 올랐어요.",
    tone: "blue",
    category: "투자 성과",
  },
  {
    id: "return-25",
    name: "한 뼘 성장",
    emoji: "🌿",
    mission: "포트폴리오 전체 수익률 25%를 달성해요.",
    description: "원금 위에 의미 있는 성장을 쌓았어요.",
    tone: "cyan",
    category: "투자 성과",
  },
  {
    id: "return-50",
    name: "반쪽만큼 더",
    emoji: "🌟",
    mission: "포트폴리오 전체 수익률 50%를 달성해요.",
    description: "원금의 절반만큼 평가이익이 늘었어요.",
    tone: "amber",
    category: "투자 성과",
  },
  {
    id: "double-up",
    name: "두 배의 마법",
    emoji: "✨",
    mission: "포트폴리오 전체 수익률 100%를 달성해요.",
    description: "투자 원금만큼의 평가이익을 쌓았어요.",
    tone: "violet",
    category: "투자 성과",
  },
  {
    id: "return-200",
    name: "세 배의 풍경",
    emoji: "🏔️",
    mission: "포트폴리오 전체 수익률 200%를 달성해요.",
    description: "평가금액이 원금의 세 배 구간에 도달했어요.",
    tone: "rose",
    category: "투자 성과",
  },
  {
    id: "return-300",
    name: "네 배의 전설",
    emoji: "🐉",
    mission: "포트폴리오 전체 수익률 300%를 달성해요.",
    description: "오랜 성장의 흔적이 선명한 구간이에요.",
    tone: "amber",
    category: "투자 성과",
  },
  {
    id: "goal-progress-10",
    name: "목표 시동",
    emoji: "🔟",
    mission: "설정한 목표 금액의 10%에 도달해요.",
    description: "목표를 향한 첫 구간을 통과했어요.",
    tone: "blue",
    category: "목표 달성",
  },
  {
    id: "goal-progress-25",
    name: "사분의 일",
    emoji: "🥉",
    mission: "설정한 목표 금액의 25%에 도달해요.",
    description: "목표까지 가는 길의 4분의 1을 채웠어요.",
    tone: "cyan",
    category: "목표 달성",
  },
  {
    id: "halfway-there",
    name: "목표의 반환점",
    emoji: "🏁",
    mission: "설정한 목표 금액의 50%에 도달해요.",
    description: "목표까지 가는 길의 절반을 통과했어요.",
    tone: "violet",
    category: "목표 달성",
  },
  {
    id: "goal-progress-75",
    name: "마지막 코너",
    emoji: "🏃",
    mission: "설정한 목표 금액의 75%에 도달해요.",
    description: "결승선 전 마지막 큰 구간에 들어왔어요.",
    tone: "rose",
    category: "목표 달성",
  },
  {
    id: "goal-complete",
    name: "목표 도착",
    emoji: "🏆",
    mission: "설정한 목표 금액의 100%에 도달해요.",
    description: "정했던 목표 금액에 마침내 도착했어요.",
    tone: "amber",
    category: "목표 달성",
  },
  {
    id: "monthly-routine",
    name: "월급날 루틴",
    emoji: "🪙",
    mission: "월 투자금을 1원 이상 설정하고 분석해요.",
    description: "한 번의 승부보다 꾸준히 쌓는 계획을 세웠어요.",
    tone: "blue",
    category: "투자 습관",
  },
  {
    id: "monthly-100k",
    name: "십만 원 씨앗",
    emoji: "🌰",
    mission: "월 투자금을 10만 원 이상으로 설정해요.",
    description: "매달 심을 작은 투자 씨앗을 준비했어요.",
    tone: "emerald",
    category: "투자 습관",
  },
  {
    id: "monthly-300k",
    name: "꾸준한 적립가",
    emoji: "🐿️",
    mission: "월 투자금을 30만 원 이상으로 설정해요.",
    description: "계획적인 적립 습관을 시나리오에 담았어요.",
    tone: "cyan",
    category: "투자 습관",
  },
  {
    id: "monthly-500k",
    name: "월간 빌더",
    emoji: "🧱",
    mission: "월 투자금을 50만 원 이상으로 설정해요.",
    description: "매달 자산의 벽돌을 한 장씩 쌓는 계획이에요.",
    tone: "violet",
    category: "투자 습관",
  },
  {
    id: "monthly-1m",
    name: "백만 원 루틴",
    emoji: "💼",
    mission: "월 투자금을 100만 원 이상으로 설정해요.",
    description: "강한 현금흐름을 꾸준한 투자 계획으로 연결했어요.",
    tone: "amber",
    category: "투자 습관",
  },
  {
    id: "investment-1y",
    name: "첫 해의 인내",
    emoji: "🕰️",
    mission: "투자 기간 1년 이상으로 분석해요.",
    description: "계절이 한 바퀴 도는 동안 시장을 경험했어요.",
    tone: "blue",
    category: "투자 습관",
  },
  {
    id: "investment-3y",
    name: "세 번의 봄",
    emoji: "🌸",
    mission: "투자 기간 3년 이상으로 분석해요.",
    description: "짧은 유행보다 긴 흐름을 경험하고 있어요.",
    tone: "cyan",
    category: "투자 습관",
  },
  {
    id: "long-term-investor",
    name: "시간의 편",
    emoji: "🌳",
    mission: "투자 기간 5년 이상으로 분석해요.",
    description: "복리가 일할 수 있는 충분한 시간을 바라보고 있어요.",
    tone: "emerald",
    category: "투자 습관",
  },
  {
    id: "investment-10y",
    name: "십 년 나이테",
    emoji: "🪵",
    mission: "투자 기간 10년 이상으로 분석해요.",
    description: "한 번의 경기 순환을 넘어 긴 시간을 투자했어요.",
    tone: "violet",
    category: "투자 습관",
  },
  {
    id: "investment-20y",
    name: "복리의 동반자",
    emoji: "⏳",
    mission: "투자 기간 20년 이상으로 분석해요.",
    description: "시간을 가장 든든한 투자 동료로 만들었어요.",
    tone: "amber",
    category: "투자 습관",
  },
  {
    id: "asset-10m",
    name: "천만 원 베이스캠프",
    emoji: "⛺",
    mission: "현재 평가금액 1천만 원을 달성해요.",
    description: "더 큰 목표로 향할 든든한 베이스캠프를 만들었어요.",
    tone: "blue",
    category: "자산 성장",
  },
  {
    id: "asset-50m",
    name: "오천만 원 능선",
    emoji: "⛰️",
    mission: "현재 평가금액 5천만 원을 달성해요.",
    description: "1억을 바라보는 중요한 능선에 올랐어요.",
    tone: "cyan",
    category: "자산 성장",
  },
  {
    id: "asset-100m",
    name: "첫 번째 억",
    emoji: "💚",
    mission: "현재 평가금액 1억 원을 달성해요.",
    description: "EOKKA의 이름과 닿는 첫 번째 억을 만들었어요.",
    tone: "emerald",
    category: "자산 성장",
  },
  {
    id: "asset-500m",
    name: "다섯 억의 궤도",
    emoji: "🪐",
    mission: "현재 평가금액 5억 원을 달성해요.",
    description: "자산이 더 큰 복리 궤도에 올라섰어요.",
    tone: "violet",
    category: "자산 성장",
  },
  {
    id: "profit-1m",
    name: "백만 원의 결실",
    emoji: "🍎",
    mission: "현재 평가손익 100만 원을 달성해요.",
    description: "수익이 생활 속에서 체감되는 첫 결실을 맺었어요.",
    tone: "emerald",
    category: "자산 성장",
  },
  {
    id: "profit-10m",
    name: "천만 원의 결실",
    emoji: "💎",
    mission: "현재 평가손익 1천만 원을 달성해요.",
    description: "평가이익만으로 천만 원 고지를 넘었어요.",
    tone: "cyan",
    category: "자산 성장",
  },
  {
    id: "profit-50m",
    name: "오천만 원의 파도",
    emoji: "🌊",
    mission: "현재 평가손익 5천만 원을 달성해요.",
    description: "시간과 선택이 만든 큰 수익의 파도를 만났어요.",
    tone: "blue",
    category: "자산 성장",
  },
  {
    id: "profit-100m",
    name: "수익으로 만든 1억",
    emoji: "👑",
    mission: "현재 평가손익 1억 원을 달성해요.",
    description: "원금이 아닌 평가이익만으로 1억을 기록했어요.",
    tone: "amber",
    category: "자산 성장",
  },
];

export interface AchievementSnapshot {
  savedOn: string;
  goalAmount: number;
  currentValue: number;
  monthlyContribution: number;
  analysisMode?: "quick" | "managed" | string;
  result: AnalysisResult;
}

export function findCompletedAchievementIds(snapshots: AchievementSnapshot[]) {
  if (!snapshots.length) return [];
  const latest = snapshots[0];
  const result = latest.result;
  const recordDays = new Set(snapshots.map((item) => item.savedOn)).size;
  const managedRecordDays = new Set(
    snapshots
      .filter((item) => item.analysisMode === "managed")
      .map((item) => item.savedOn),
  ).size;
  const holdingCount = result.holdings.length;
  const annualizedReturn = result.annualizedReturnRate;
  const returnRate = result.returnRate;
  const investmentMonths = result.investmentPeriodMonths ?? 0;
  const progress =
    latest.goalAmount > 0 ? latest.currentValue / latest.goalAmount : 0;
  const completed: string[] = [];
  const award = (id: string, condition: boolean) =>
    condition && completed.push(id);

  award("first-analysis", true);
  for (const [days, id] of [
    [3, "three-record-days"],
    [7, "seven-record-days"],
    [10, "record-collector"],
    [30, "thirty-day-witness"],
    [50, "fifty-record-days"],
    [100, "hundred-record-days"],
  ] as const)
    award(id, recordDays >= days);
  for (const [days, id] of [
    [1, "first-managed-analysis"],
    [3, "three-managed-days"],
    [7, "seven-managed-days"],
    [30, "thirty-managed-days"],
  ] as const)
    award(id, managedRecordDays >= days);
  for (const [count, id] of [
    [3, "three-holdings"],
    [5, "diversified-investor"],
    [10, "ten-holdings"],
    [15, "fifteen-holdings"],
    [20, "twenty-holdings"],
  ] as const)
    award(id, holdingCount >= count);
  award(
    "all-holdings-profitable",
    holdingCount >= 3 &&
      result.holdings.every((holding) => holding.returnRate > 0),
  );
  for (const [threshold, id] of [
    [20, "one-buffett"],
    [40, "annual-return-40"],
    [60, "annual-return-60"],
  ] as const)
    award(
      id,
      investmentMonths >= 12 &&
        annualizedReturn != null &&
        annualizedReturn >= threshold,
    );
  for (const [threshold, id] of [
    [0, "profit-zone"],
    [10, "return-10"],
    [25, "return-25"],
    [50, "return-50"],
    [100, "double-up"],
    [200, "return-200"],
    [300, "return-300"],
  ] as const)
    award(id, threshold === 0 ? returnRate > 0 : returnRate >= threshold);
  for (const [threshold, id] of [
    [0.1, "goal-progress-10"],
    [0.25, "goal-progress-25"],
    [0.5, "halfway-there"],
    [0.75, "goal-progress-75"],
    [1, "goal-complete"],
  ] as const)
    award(id, progress >= threshold);
  for (const [amount, id] of [
    [1, "monthly-routine"],
    [100_000, "monthly-100k"],
    [300_000, "monthly-300k"],
    [500_000, "monthly-500k"],
    [1_000_000, "monthly-1m"],
  ] as const)
    award(id, latest.monthlyContribution >= amount);
  for (const [months, id] of [
    [12, "investment-1y"],
    [36, "investment-3y"],
    [60, "long-term-investor"],
    [120, "investment-10y"],
    [240, "investment-20y"],
  ] as const)
    award(id, investmentMonths >= months);
  for (const [amount, id] of [
    [10_000_000, "asset-10m"],
    [50_000_000, "asset-50m"],
    [100_000_000, "asset-100m"],
    [500_000_000, "asset-500m"],
  ] as const)
    award(id, latest.currentValue >= amount);
  for (const [amount, id] of [
    [1_000_000, "profit-1m"],
    [10_000_000, "profit-10m"],
    [50_000_000, "profit-50m"],
    [100_000_000, "profit-100m"],
  ] as const)
    award(id, result.profit >= amount);
  return completed;
}

export function achievementById(id: string) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id) ?? null;
}

export function achievementsInCategory(category: AchievementCategory) {
  return ACHIEVEMENTS.filter(
    (achievement) => achievement.category === category,
  );
}

export function achievementDifficulty(achievement: AchievementDefinition) {
  const categoryAchievements = achievementsInCategory(achievement.category);
  const index = categoryAchievements.findIndex(
    (candidate) => candidate.id === achievement.id,
  );
  const level = Math.max(1, index + 1);
  const ratio = level / Math.max(1, categoryAchievements.length);
  const tier: AchievementDifficultyTier =
    ratio <= 0.2
      ? "starter"
      : ratio <= 0.4
        ? "easy"
        : ratio <= 0.6
          ? "normal"
          : ratio <= 0.8
            ? "hard"
            : "legendary";
  return {
    level,
    total: categoryAchievements.length,
    tier: achievement.difficultyTier ?? tier,
  };
}

const ACHIEVEMENT_DIFFICULTY_ORDER: AchievementDifficultyTier[] = [
  "starter",
  "easy",
  "normal",
  "hard",
  "legendary",
];

export function achievementDifficultyRank(achievement: AchievementDefinition) {
  return ACHIEVEMENT_DIFFICULTY_ORDER.indexOf(
    achievementDifficulty(achievement).tier,
  );
}
