import { useEffect, useRef, useState } from "react";

const MIN_ESTIMATE_MS = 4_000;
const MAX_ESTIMATE_MS = 120_000;

type ProgressState = {
  progress: number;
  remainingSeconds: number;
  overtime: boolean;
  completing: boolean;
};

function storageKey(key: string) {
  return `eokka:action-duration:${key}`;
}

function boundedDuration(duration: number) {
  return Math.min(MAX_ESTIMATE_MS, Math.max(MIN_ESTIMATE_MS, duration));
}

export function useAdaptiveProgress(
  active: boolean,
  key: string,
  defaultEstimateMs: number,
) {
  const startedAtRef = useRef<number | null>(null);
  const estimateRef = useRef(boundedDuration(defaultEstimateMs));
  const activeKeyRef = useRef(key);
  const [state, setState] = useState<ProgressState>({
    progress: 0,
    remainingSeconds: Math.ceil(defaultEstimateMs / 1_000),
    overtime: false,
    completing: false,
  });

  useEffect(() => {
    if (!active) {
      if (startedAtRef.current !== null) {
        const actualDuration = performance.now() - startedAtRef.current;
        const previousEstimate = estimateRef.current;
        // Recent runs matter most, while one unusually slow request cannot
        // completely distort the next estimate.
        const learnedEstimate = boundedDuration(
          previousEstimate * 0.65 + actualDuration * 0.35,
        );
        try {
          window.localStorage.setItem(
            storageKey(activeKeyRef.current),
            String(Math.round(learnedEstimate)),
          );
        } catch {
          // Progress estimation remains functional when storage is unavailable.
        }
        startedAtRef.current = null;
        setState({
          progress: 100,
          remainingSeconds: 0,
          overtime: false,
          completing: true,
        });
        const completionTimer = window.setTimeout(() => {
          setState({
            progress: 0,
            remainingSeconds: Math.ceil(defaultEstimateMs / 1_000),
            overtime: false,
            completing: false,
          });
        }, 340);
        return () => window.clearTimeout(completionTimer);
      }
      startedAtRef.current = null;
      setState({
        progress: 0,
        remainingSeconds: Math.ceil(defaultEstimateMs / 1_000),
        overtime: false,
        completing: false,
      });
      return;
    }

    let estimate = boundedDuration(defaultEstimateMs);
    try {
      const stored = Number(window.localStorage.getItem(storageKey(key)));
      if (Number.isFinite(stored) && stored > 0)
        estimate = boundedDuration(stored);
    } catch {
      // Use the supplied estimate when storage is unavailable.
    }
    estimateRef.current = estimate;
    activeKeyRef.current = key;
    startedAtRef.current = performance.now();

    const update = () => {
      if (startedAtRef.current === null) return;
      const elapsed = performance.now() - startedAtRef.current;
      const ratio = elapsed / estimate;
      // Reach 92% around the learned completion time. When a request is slower
      // than usual, approach 97% gradually instead of freezing at one value.
      const progress =
        ratio <= 1
          ? 6 + 86 * ratio
          : 92 + 5 * (1 - Math.exp(-(ratio - 1) / 1.5));
      setState({
        progress: Math.min(97, progress),
        remainingSeconds: Math.max(0, Math.ceil((estimate - elapsed) / 1_000)),
        overtime: elapsed >= estimate,
        completing: false,
      });
    };

    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [active, defaultEstimateMs, key]);

  return state;
}
