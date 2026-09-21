export interface DatedCashFlow {
  date: string;
  amountKrw: number;
}

const DAY_MS = 86_400_000;

export function moneyWeightedAnnualReturn(
  cashFlows: DatedCashFlow[],
  currentValue: number,
  valuedOn: string,
) {
  const flows = [
    ...cashFlows
      .filter(
        (flow) =>
          Number.isFinite(flow.amountKrw) &&
          flow.amountKrw !== 0 &&
          flow.date <= valuedOn,
      )
      .map((flow) => ({ ...flow, time: new Date(`${flow.date}T00:00:00Z`) })),
    {
      date: valuedOn,
      amountKrw: currentValue,
      time: new Date(`${valuedOn}T00:00:00Z`),
    },
  ].sort((a, b) => a.time.getTime() - b.time.getTime());
  if (
    flows.length < 2 ||
    !flows.some((flow) => flow.amountKrw < 0) ||
    !flows.some((flow) => flow.amountKrw > 0)
  )
    return null;

  const origin = flows[0].time.getTime();
  const npv = (rate: number) =>
    flows.reduce(
      (sum, flow) =>
        sum +
        flow.amountKrw /
          (1 + rate) ** ((flow.time.getTime() - origin) / DAY_MS / 365.2425),
      0,
    );
  let low = -0.9999;
  let high = 10;
  let lowValue = npv(low);
  let highValue = npv(high);
  while (lowValue * highValue > 0 && high < 10_000) {
    high *= 2;
    highValue = npv(high);
  }
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)) return null;
  if (lowValue * highValue > 0) return null;

  for (let iteration = 0; iteration < 160; iteration += 1) {
    const middle = (low + high) / 2;
    const middleValue = npv(middle);
    if (!Number.isFinite(middleValue)) return null;
    if (Math.abs(middleValue) < 0.01) return middle * 100;
    if (lowValue * middleValue <= 0) {
      high = middle;
      highValue = middleValue;
    } else {
      low = middle;
      lowValue = middleValue;
    }
  }
  return ((low + high) / 2) * 100;
}
