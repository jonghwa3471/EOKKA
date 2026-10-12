import { useEffect } from "react";

export type CurrencyTrailPoint = {
  x: number;
  y: number;
  time: number;
  speed: number;
};

export function CurrencyMatrixSpotlight({
  canvasRef,
  trailRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  trailRef: React.RefObject<CurrencyTrailPoint[]>;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    const spacing = 10;
    const lightRadius = 76;
    const maxTrailLifetime = 460;
    const rippleLifetime = 900;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      trailRef.current = trailRef.current.filter(
        (point) =>
          now - point.time < Math.max(maxTrailLifetime, rippleLifetime),
      );

      const latestPoint = trailRef.current.at(-1);
      if (latestPoint) {
        const idleAge = Math.max(0, now - latestPoint.time - 70);
        const idleFade = Math.max(0, 1 - idleAge / rippleLifetime);
        const speedBrightness =
          0.45 + Math.min(latestPoint.speed / 1.4, 1) * 0.55;
        const glow = context.createRadialGradient(
          latestPoint.x,
          latestPoint.y,
          0,
          latestPoint.x,
          latestPoint.y,
          lightRadius,
        );
        glow.addColorStop(
          0,
          `rgba(16, 185, 129, ${0.13 * idleFade * speedBrightness})`,
        );
        glow.addColorStop(
          0.58,
          `rgba(16, 185, 129, ${0.045 * idleFade * speedBrightness})`,
        );
        glow.addColorStop(1, "rgba(16, 185, 129, 0)");
        context.fillStyle = glow;
        context.fillRect(
          latestPoint.x - lightRadius,
          latestPoint.y - lightRadius,
          lightRadius * 2,
          lightRadius * 2,
        );
      }

      const cells = new Map<string, { x: number; y: number; alpha: number }>();
      for (const point of trailRef.current) {
        const lifetime = Math.min(maxTrailLifetime, 65 + point.speed * 235);
        const age = (now - point.time) / lifetime;
        if (age >= 1) continue;
        const normalizedSpeed = Math.min(point.speed / 1.4, 1);
        const trailTaper = 0.28 + Math.pow(1 - age, 0.8) * 0.72;
        const pointRadius =
          lightRadius * (0.72 + normalizedSpeed * 0.25) * trailTaper;
        const speedBrightness = 0.34 + normalizedSpeed * 0.66;
        const minColumn = Math.floor((point.x - pointRadius) / spacing);
        const maxColumn = Math.ceil((point.x + pointRadius) / spacing);
        const minRow = Math.floor((point.y - pointRadius) / spacing);
        const maxRow = Math.ceil((point.y + pointRadius) / spacing);

        for (let column = minColumn; column <= maxColumn; column += 1) {
          for (let row = minRow; row <= maxRow; row += 1) {
            const x = column * spacing + spacing / 2;
            const baseY = row * spacing + spacing / 2;
            const distance = Math.hypot(x - point.x, baseY - point.y);
            if (distance > pointRadius) continue;
            const distanceFade = Math.pow(1 - distance / pointRadius, 1.7);
            const ageFade = Math.pow(1 - age, 1.8);
            const alpha = distanceFade * ageFade * speedBrightness * 0.92;
            const key = `${column}:${row}`;
            const previous = cells.get(key);
            if (!previous || alpha > previous.alpha)
              cells.set(key, { x, y: baseY, alpha });
          }
        }
      }

      if (latestPoint) {
        const rippleAge = Math.max(0, now - latestPoint.time - 90);
        if (rippleAge > 0 && rippleAge < rippleLifetime) {
          const progress = rippleAge / rippleLifetime;
          const rippleRadius = 18 + progress * 82;
          const ringWidth = 12 + progress * 8;
          const rippleAlpha = Math.pow(1 - progress, 1.5) * 0.52;
          const minColumn = Math.floor(
            (latestPoint.x - rippleRadius - ringWidth) / spacing,
          );
          const maxColumn = Math.ceil(
            (latestPoint.x + rippleRadius + ringWidth) / spacing,
          );
          const minRow = Math.floor(
            (latestPoint.y - rippleRadius - ringWidth) / spacing,
          );
          const maxRow = Math.ceil(
            (latestPoint.y + rippleRadius + ringWidth) / spacing,
          );

          for (let column = minColumn; column <= maxColumn; column += 1) {
            for (let row = minRow; row <= maxRow; row += 1) {
              const x = column * spacing + spacing / 2;
              const y = row * spacing + spacing / 2;
              const distance = Math.hypot(x - latestPoint.x, y - latestPoint.y);
              const ringDistance = Math.abs(distance - rippleRadius);
              if (ringDistance > ringWidth) continue;
              const alpha =
                Math.pow(1 - ringDistance / ringWidth, 1.8) * rippleAlpha;
              const key = `${column}:${row}`;
              const previous = cells.get(key);
              if (!previous || alpha > previous.alpha)
                cells.set(key, { x, y, alpha });
            }
          }
        }
      }

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = '600 7px "SFMono-Regular", Consolas, monospace';
      for (const [key, cell] of cells) {
        const [column, row] = key.split(":").map(Number);
        const startsAsDollar = Math.abs(column + row) % 2 === 0;
        const isSwapped = Math.floor(now / 220) % 2 === 1;
        const symbol = startsAsDollar !== isSwapped ? "$" : "₩";
        context.fillStyle = `rgba(52, 211, 153, ${cell.alpha})`;
        context.fillText(symbol, cell.x, cell.y);
      }

      frame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frame);
    };
  }, [canvasRef, trailRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden motion-reduce:hidden md:block"
    />
  );
}
