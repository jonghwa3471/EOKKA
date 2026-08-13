import { cn } from "~/core/lib/utils";

export function EokkaLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src="/images/eokka-app-logo.png"
      alt="EOKKA 로고"
      className={cn("shrink-0 rounded-[22%] object-cover", className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
