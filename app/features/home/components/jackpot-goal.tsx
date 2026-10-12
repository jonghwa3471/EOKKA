import { useEffect, useRef, useState } from "react";

export function JackpotGoal() {
  const [currentGoal, setCurrentGoal] = useState(1);
  const [nextGoal, setNextGoal] = useState(2);
  const [isRolling, setIsRolling] = useState(false);
  const currentGoalRef = useRef(1);

  useEffect(() => {
    const roll = () => {
      let randomGoal = Math.floor(Math.random() * 9) + 1;
      while (randomGoal === currentGoalRef.current)
        randomGoal = Math.floor(Math.random() * 9) + 1;
      setNextGoal(randomGoal);
      setIsRolling(true);
    };

    const interval = window.setInterval(roll, 2_200);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      className="relative inline-block h-[1em] w-[1ch] overflow-hidden align-[-0.08em] text-emerald-500 tabular-nums"
      aria-label={`${currentGoal}억`}
    >
      <span
        className="flex flex-col items-end leading-none will-change-transform"
        style={{
          transform: isRolling ? "translateY(-1em)" : "translateY(0)",
          transition: isRolling
            ? "transform 700ms cubic-bezier(0.22, 0.7, 0.24, 1)"
            : "none",
        }}
        onTransitionEnd={() => {
          if (!isRolling) return;
          currentGoalRef.current = nextGoal;
          setCurrentGoal(nextGoal);
          setIsRolling(false);
        }}
        aria-hidden="true"
      >
        <span className="flex h-[1em] w-full shrink-0 items-center justify-end">
          {currentGoal}
        </span>
        <span className="flex h-[1em] w-full shrink-0 items-center justify-end">
          {nextGoal}
        </span>
      </span>
    </span>
  );
}
