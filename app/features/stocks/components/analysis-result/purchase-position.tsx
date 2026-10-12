import type { AnalysisResult } from "../../analysis.types";

import { price } from "./formatters";

const purchasePosition = (rangePosition: number) => {
  if (rangePosition <= 20)
    return {
      label: "발에서 샀어요",
      y: 94,
      image: "/images/eokka-mascot-position-foot.png",
    };
  if (rangePosition <= 40)
    return {
      label: "무릎에서 샀어요",
      y: 83,
      image: "/images/eokka-mascot-position-knee.png",
    };
  if (rangePosition <= 60)
    return {
      label: "배에서 샀어요",
      y: 79,
      image: "/images/eokka-mascot-position-belly.png",
    };
  if (rangePosition <= 80)
    return {
      label: "어깨에서 샀어요",
      y: 71,
      image: "/images/eokka-mascot-position-shoulder.png",
    };
  return {
    label: "머리에서 샀어요",
    y: 56,
    image: "/images/eokka-mascot-position-head.png",
  };
};

export function PurchasePositionCharacter({
  holding,
}: {
  holding: AnalysisResult["holdings"][number];
}) {
  const data = holding.purchasePosition;
  const hasCalculatedPosition =
    data && typeof data.tenYearPosition === "number";
  const position = hasCalculatedPosition
    ? purchasePosition(data.tenYearPosition)
    : {
        label: "위치 계산 전",
        y: 82,
        image: "/images/eokka-compound-mate-mascot.png",
      };
  const averagePrice =
    holding.averagePrice ??
    (holding.returnRate > -100
      ? holding.currentPrice / (1 + holding.returnRate / 100)
      : 0);
  return (
    <div className="mx-auto mt-6 w-full max-w-md min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#171d21]">
      <div className="px-6 pt-6 pb-3">
        <p className="text-2xl font-black text-white">{holding.name}</p>
        <p
          className={`mt-2 text-xl font-bold ${holding.returnRate >= 0 ? "text-rose-400" : "text-blue-400"}`}
        >
          {holding.returnRate >= 0 ? "+" : ""}
          {holding.returnRate.toFixed(2)}%
        </p>
        <p className="mt-3 text-sm text-white/55">
          내 평균가 {price(averagePrice, holding.currency)}
        </p>
      </div>
      <div className="relative h-[380px] w-full overflow-hidden bg-gradient-to-br from-[#101024] via-[#111827] to-[#071018]">
        <img
          src={position.image}
          alt="매수 위치를 설명하는 EOKKA 복리 메이트 마스코트"
          className="absolute inset-y-3 left-1 h-[calc(100%_-_1.5rem)] w-[72%] object-contain object-center drop-shadow-[0_18px_28px_rgba(16,185,129,0.22)]"
        />
        <div
          className="absolute right-4 left-[50%] z-10 flex -translate-y-1/2 items-center"
          style={{ top: `${position.y}%` }}
        >
          <span className="min-w-7 flex-1 border-t-2 border-dashed border-emerald-200" />
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black whitespace-nowrap text-slate-900 shadow-lg">
            {position.label}
          </span>
        </div>
      </div>
    </div>
  );
}
