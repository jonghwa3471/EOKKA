import type { SharedInvestmentCardPayload } from "../components/investment-character-card";
import type { Route } from "./+types/shared-card";

import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";

import { SharedInvestmentCard } from "../components/investment-character-card";

const tierNames = new Set<SharedInvestmentCardPayload["tier"]>([
  "아이언",
  "브론즈",
  "실버",
  "골드",
  "플래티넘",
  "에메랄드",
  "다이아",
  "마스터",
  "그랜드 마스터",
  "챌린저",
]);

const scenarioLabels = {
  conservative: "보수적",
  base: "평균",
  optimistic: "낙관적",
} as const;

const tierPreviewImages: Record<SharedInvestmentCardPayload["tier"], string> = {
  아이언: "/images/speed-tiers/iron-fantasy-v2-og.jpg",
  브론즈: "/images/speed-tiers/bronze-fantasy-v2-og.jpg",
  실버: "/images/speed-tiers/silver-fantasy-v2-og.jpg",
  골드: "/images/speed-tiers/gold-fantasy-v2-og.jpg",
  플래티넘: "/images/speed-tiers/platinum-fantasy-v2-og.jpg",
  에메랄드: "/images/speed-tiers/emerald-fantasy-v2-og.jpg",
  다이아: "/images/speed-tiers/diamond-fantasy-v2-og.jpg",
  마스터: "/images/speed-tiers/master-fantasy-v2-og.jpg",
  "그랜드 마스터": "/images/speed-tiers/grand-master-fantasy-v2-og.jpg",
  챌린저: "/images/speed-tiers/challenger-fantasy-v2-og.jpg",
};

function parsePayload(
  params: URLSearchParams,
): SharedInvestmentCardPayload | null {
  const tier = params.get("tier") as SharedInvestmentCardPayload["tier"] | null;
  const scenario = params.get("scenario") as
    | SharedInvestmentCardPayload["scenarioKey"]
    | null;
  const headline = params.get("headline")?.trim();
  const target = params.get("target")?.trim();
  const progress = Number(params.get("progress"));

  if (
    !tier ||
    !tierNames.has(tier) ||
    !scenario ||
    !(scenario in scenarioLabels) ||
    !headline ||
    headline.length > 120 ||
    !target ||
    target.length > 20 ||
    !Number.isFinite(progress)
  )
    return null;

  return {
    tier,
    scenarioKey: scenario,
    scenarioLabel: scenarioLabels[scenario],
    headline,
    progress: Math.min(100, Math.max(0, progress)),
    target,
  };
}

export function loader({ request }: Route.LoaderArgs) {
  const requestUrl = new URL(request.url);
  const payload = parsePayload(requestUrl.searchParams);
  const configuredOrigin = process.env.SITE_URL?.replace(/\/$/, "");
  const origin = configuredOrigin || requestUrl.origin;
  const canonicalUrl = `${origin}${requestUrl.pathname}${requestUrl.search}`;
  const previewImage = payload
    ? `${origin}${tierPreviewImages[payload.tier]}`
    : `${origin}/images/speed-tiers/iron-fantasy-v2-og.jpg`;

  return { payload, canonicalUrl, previewImage };
}

export const meta: Route.MetaFunction = ({ data }) => {
  const tier = data?.payload?.tier;
  const title = tier
    ? `${tier} 티어 목표 속도 카드 | EOKKA`
    : "목표 도달 속도 카드 | EOKKA";
  const description = tier
    ? `공유받은 ${tier} 티어 카드를 직접 움직여 보고 나의 목표 속도도 테스트해 보세요.`
    : "공유받은 EOKKA 목표 도달 속도 카드를 직접 움직여 보세요.";

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "EOKKA" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: data?.canonicalUrl },
    { property: "og:image", content: data?.previewImage },
    { property: "og:image:width", content: "900" },
    { property: "og:image:height", content: "900" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: data?.previewImage },
  ];
};

export default function SharedCardScreen({ loaderData }: Route.ComponentProps) {
  const { payload } = loaderData;

  if (!payload)
    return (
      <main className="flex min-h-screen items-center justify-center px-5 pt-24">
        <div className="max-w-md text-center">
          <p className="text-sm font-bold text-emerald-500">EOKKA</p>
          <h1 className="mt-2 text-2xl font-black">
            유효하지 않은 카드 링크예요
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            링크가 일부 잘렸거나 카드 정보가 올바르지 않아요. 직접 분석해서 나의
            카드를 만들어 보세요.
          </p>
          <Button
            asChild
            className="mt-6 bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <Link to="/">나도 테스트해 보기</Link>
          </Button>
        </div>
      </main>
    );

  return (
    <main className="-my-16 min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_38%),linear-gradient(to_bottom,#020617,#000)] px-4 pt-20 pb-16 text-white md:-my-32">
      <div className="mx-auto max-w-[620px] text-center">
        <p className="text-xs font-black tracking-[0.24em] text-emerald-300">
          EOKKA SHARED CARD
        </p>
        <h1 className="mt-2 text-2xl font-black">공유받은 목표 속도 카드</h1>
        <p className="mt-2 text-sm font-semibold text-white/55">
          카드 위에서 마우스를 움직여 홀로그램 효과를 확인해 보세요.
        </p>

        <div className="mt-7">
          <SharedInvestmentCard payload={payload} />
        </div>

        <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur">
          <p className="text-lg font-black">내 목표 도달 속도도 궁금한가요?</p>
          <p className="mt-2 text-sm text-white/55">
            보유 주식을 입력하고 나만의 속도 티어를 확인해 보세요.
          </p>
          <Button
            asChild
            className="mt-5 bg-emerald-400 text-slate-950 hover:bg-emerald-300"
          >
            <Link to="/">
              나도 테스트해 보기 <ArrowRightIcon />
            </Link>
          </Button>
        </div>

        <p className="mt-5 text-[11px] leading-5 text-white/35">
          이 카드는 과거 데이터를 바탕으로 만든 예상 시나리오이며 투자 조언이나
          수익 보장이 아닙니다.
        </p>
      </div>
    </main>
  );
}
