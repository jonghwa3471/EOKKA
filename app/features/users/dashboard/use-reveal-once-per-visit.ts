import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

export function useRevealOncePerVisit<T extends Element>() {
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
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    // Never leave charts and numeric effects invisible when an observer
    // notification is delayed or dropped during route/HMR transitions.
    const fallback = window.setTimeout(() => setIsRevealed(true), 700);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [isRevealed, pageVisitKey]);

  return { ref, isRevealed };
}
