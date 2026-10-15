import type { Route } from "./+types/social-og";

import { ImageResponse } from "@vercel/og";

const productionSiteUrl = "https://eokka.qualius.co";

const tierImages = {
  아이언: "iron-fantasy-v2-og.jpg",
  브론즈: "bronze-fantasy-v2-og.jpg",
  실버: "silver-fantasy-v2-og.jpg",
  골드: "gold-fantasy-v2-og.jpg",
  플래티넘: "platinum-fantasy-v2-og.jpg",
  에메랄드: "emerald-fantasy-v2-og.jpg",
  다이아: "diamond-supercar-v3.png",
  마스터: "master-fantasy-v2-og.jpg",
  "그랜드 마스터": "grand-master-fantasy-v2-og.jpg",
  챌린저: "challenger-fantasy-v2-og.jpg",
} as const;

type TierName = keyof typeof tierImages;

function isTierName(value: string | null): value is TierName {
  return value !== null && value in tierImages;
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const requestedTier = url.searchParams.get("tier");
  const tier = isTierName(requestedTier) ? requestedTier : null;
  const tierImage = tier
    ? `${productionSiteUrl}/images/speed-tiers/${tierImages[tier]}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: tier
            ? "#050807"
            : "linear-gradient(135deg, #07110e 0%, #050607 52%, #11102a 100%)",
          color: "white",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "64px 72px",
          position: "relative",
          width: "100%",
        }}
      >
        {tierImage ? (
          <img
            src={tierImage}
            style={{
              height: "100%",
              left: 0,
              objectFit: "cover",
              opacity: 0.7,
              position: "absolute",
              top: 0,
              width: "100%",
            }}
          />
        ) : null}
        <div
          style={{
            background:
              "linear-gradient(90deg, rgba(3,7,6,.96) 0%, rgba(3,7,6,.82) 48%, rgba(3,7,6,.12) 100%)",
            display: "flex",
            height: "100%",
            left: 0,
            position: "absolute",
            top: 0,
            width: "100%",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            width: tier ? 690 : 830,
          }}
        >
          <div
            style={{
              alignItems: "center",
              color: "#34d399",
              display: "flex",
              fontSize: 27,
              fontWeight: 800,
              letterSpacing: 5,
            }}
          >
            EOKKA
            <span
              style={{
                border: "1px solid #4b5563",
                borderRadius: 999,
                color: "#cbd5e1",
                fontSize: 14,
                letterSpacing: 2,
                marginLeft: 18,
                padding: "6px 12px",
              }}
            >
              BETA
            </span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: tier ? 72 : 68,
              fontWeight: 900,
              letterSpacing: -3,
              lineHeight: 1.12,
              marginTop: 34,
              whiteSpace: "pre-wrap",
            }}
          >
            {tier ? `${tier} 티어` : "내 주식,\n목표까지 얼마나 남았을까?"}
          </div>
          <div
            style={{
              color: "#cbd5e1",
              display: "flex",
              fontSize: 26,
              lineHeight: 1.45,
              marginTop: 24,
            }}
          >
            {tier
              ? "나의 목표 달성 속도 카드 · 직접 움직여 보세요"
              : "보유 주식을 입력하고 목표 달성 시점과 투자 성향을 확인해 보세요."}
          </div>
        </div>
        {!tier ? (
          <div
            style={{
              alignItems: "center",
              background: "linear-gradient(145deg, #10b981, #22d3ee, #8b5cf6)",
              borderRadius: 42,
              boxShadow: "0 24px 80px rgba(16,185,129,.28)",
              display: "flex",
              height: 235,
              justifyContent: "center",
              position: "relative",
              transform: "rotate(4deg)",
              width: 235,
            }}
          >
            <img
              src={`${productionSiteUrl}/images/eokka-app-logo-kakao.png`}
              style={{ borderRadius: 38, height: 220, width: 220 }}
            />
          </div>
        ) : null}
        <div
          style={{
            background: "linear-gradient(90deg, #10b981, #22d3ee, #8b5cf6)",
            bottom: 0,
            display: "flex",
            height: 9,
            left: 0,
            position: "absolute",
            width: "100%",
          }}
        />
      </div>
    ),
    {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
      height: 630,
      width: 1200,
    },
  );
}
