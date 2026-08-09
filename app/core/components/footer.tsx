import { Link } from "react-router";

const footerLinks = [
  { to: "/about", label: "서비스 소개" },
  { to: "/methodology", label: "분석 방법" },
  { to: "/contact-us", label: "문의하기" },
  { to: "/legal/terms-of-service", label: "이용약관" },
  { to: "/legal/privacy-policy", label: "개인정보처리방침" },
] as const;

export default function Footer() {
  const appName = import.meta.env.VITE_APP_NAME || "EOKKA";

  return (
    <footer className="bg-background/95 mt-auto border-t">
      <div className="mx-auto w-full max-w-screen-2xl px-5 py-10 md:px-10 md:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2.5">
              <Link
                className="text-foreground text-lg font-black tracking-tight"
                to="/"
                viewTransition
              >
                {appName}
              </Link>
              <span className="border-border bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.14em]">
                BETA
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-6">
              내 주식 포트폴리오가 목표 금액에 도달하는 과정을 여러 시나리오로
              살펴보세요.
            </p>
            <p className="text-muted-foreground/80 max-w-xl text-xs leading-5">
              EOKKA의 분석은 교육·정보 제공을 위한 참고 자료이며 투자 권유나
              수익 보장이 아닙니다. 투자 판단과 그 결과에 대한 책임은 이용자에게
              있습니다.
            </p>
          </div>

          <nav aria-label="푸터 메뉴">
            <ul className="flex max-w-xl flex-wrap gap-x-6 gap-y-3 text-sm">
              {footerLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    to={link.to}
                    viewTransition
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-border text-muted-foreground/70 mt-8 flex flex-col gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {appName}. All rights reserved.
          </p>
          <p>대한민국 · 주식 목표 시뮬레이션 서비스</p>
        </div>
      </div>
    </footer>
  );
}
