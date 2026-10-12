/** Shared product limits used by client hints and server validation. */
export const SERVICE_LIMITS = {
  freeHoldings: 10,
  proHoldings: 20,
  manualAnalysesPerDay: 5,
  anonymousAnalysesPerIpPerDay: 30,
  detailedAnalysisRecords: 30,
} as const;

export function holdingLimitFor(isPro: boolean) {
  return isPro ? SERVICE_LIMITS.proHoldings : SERVICE_LIMITS.freeHoldings;
}
