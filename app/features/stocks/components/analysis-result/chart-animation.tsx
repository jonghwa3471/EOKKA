import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

export function useChartRevealOnce<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const { key: pageVisitKey } = useLocation();
  const previousPageVisitKey = useRef(pageVisitKey);

  useEffect(() => {
    if (previousPageVisitKey.current === pageVisitKey) return;
    previousPageVisitKey.current = pageVisitKey;
    setIsRevealed(false);
  }, [pageVisitKey]);

  useEffect(() => {
    const element = ref.current;
    if (!element || isRevealed) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsRevealed(true);
        observer.disconnect();
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isRevealed, pageVisitKey, threshold]);

  return { ref, isRevealed };
}

export function RollingNumber({
  value,
  isActive,
  format,
  delay = 0,
  duration = 950,
}: {
  value: number;
  isActive: boolean;
  format: (displayValue: number) => string;
  delay?: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setDisplayValue(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }

    let animationFrame = 0;
    let startedAt = 0;
    const timeout = window.setTimeout(() => {
      const animate = (time: number) => {
        if (startedAt === 0) startedAt = time;
        const progress = Math.min(1, (time - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        const remainingJitter = progress < 0.72 ? 1 - progress / 0.72 : 0;
        const jitter =
          (Math.random() - 0.5) *
          Math.max(Math.abs(value) * 0.12, 8) *
          remainingJitter;
        const nextValue = progress === 1 ? value : value * eased + jitter;
        setDisplayValue(nextValue);
        if (progress < 1) animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(animationFrame);
    };
  }, [delay, duration, isActive, value]);

  return (
    <span className="inline-block tabular-nums" aria-label={format(value)}>
      <span aria-hidden="true">{format(displayValue)}</span>
    </span>
  );
}
