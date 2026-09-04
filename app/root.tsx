/**
 * Root Application Component
 *
 * This is the top-level component of the application that sets up:
 * - Theme management with dark/light mode support
 * - Internationalization (i18n) configuration
 * - Global UI components like dialogs and sheets
 * - Error boundaries and 404 handling
 * - Analytics integrations (Google Tag Manager)
 * - Customer support integration (Channel.io)
 * - Progress indicators for navigation
 */
import "./app.css";

import type { Route } from "./+types/root";

import * as Sentry from "@sentry/react-router";
import { LoaderCircleIcon } from "lucide-react";
import NProgress from "nprogress";
import nProgressStyles from "nprogress/nprogress.css?url";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useFetchers,
  useLocation,
  useNavigate,
  useNavigation,
  useRouteLoaderData,
  useSearchParams,
} from "react-router";
import { useChangeLanguage } from "remix-i18next/react";
import {
  PreventFlashOnWrongTheme,
  ThemeProvider,
  useTheme,
} from "remix-themes";
import { Toaster } from "sonner";

import { Dialog } from "./core/components/ui/dialog";
import { Sheet } from "./core/components/ui/sheet";
import i18next from "./core/lib/i18next.server";
import { themeSessionResolver } from "./core/lib/theme-session.server";
import { cn } from "./core/lib/utils";
import NotFound from "./core/screens/404";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico?v=eokka-2", sizes: "any" },
  {
    rel: "icon",
    href: "/images/eokka-app-logo-kakao.png?v=eokka-2",
    type: "image/png",
    sizes: "512x512",
  },
  {
    rel: "apple-touch-icon",
    href: "/images/eokka-app-logo-kakao.png?v=eokka-2",
    sizes: "512x512",
  },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap",
  },
  { rel: "stylesheet", href: nProgressStyles },
];

/**
 * Root loader function
 *
 * This server-side function runs on every request and is responsible for:
 * 1. Validating that all required environment variables are present
 * 2. Loading the user's theme preference from the session
 * 3. Detecting the user's preferred locale
 *
 * The data returned from this loader is available throughout the application
 * via the useRouteLoaderData hook with the 'root' ID.
 *
 * @param request - The incoming HTTP request
 * @returns Object containing theme and locale preferences
 */
export async function loader({ request }: Route.LoaderArgs) {
  // Validate that all required Supabase environment variables are present
  // This prevents the application from starting with incomplete configuration
  if (
    !process.env.DATABASE_URL ||
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_PUBLISHABLE_KEY ||
    !process.env.SUPABASE_SECRET_KEY ||
    process.env.DATABASE_URL === "" ||
    process.env.SUPABASE_URL === "" ||
    process.env.SUPABASE_PUBLISHABLE_KEY === "" ||
    process.env.SUPABASE_SECRET_KEY === ""
  ) {
    throw new Error("Missing Supabase environment variables");
  }

  // Concurrently load theme and locale preferences for better performance
  const [{ getTheme }, locale] = await Promise.all([
    themeSessionResolver(request),
    i18next.getLocale(request),
  ]);

  return {
    theme: getTheme(),
    locale,
  };
}

/**
 * i18n handle for the root route
 * Specifies that this route uses the 'common' translation namespace
 */
export const handle = {
  i18n: "common",
};

/**
 * Primary Layout Component
 *
 * This component wraps the entire application with the ThemeProvider
 * to enable dark/light mode functionality. It retrieves theme preferences
 * from the root loader data and provides a theme switching API endpoint.
 *
 * @param children - Child components to render within the layout
 */
export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData("root");
  return (
    <ThemeProvider
      specifiedTheme={data?.theme ?? "dark"} // Default to dark theme if none is specified
      themeAction="/api/settings/theme" // API endpoint for changing theme
    >
      <InnerLayout>{children}</InnerLayout>
    </ThemeProvider>
  );
}

/**
 * Inner Layout Component
 *
 * This component handles the HTML structure of the application and applies:
 * - Language direction (RTL/LTR) based on the current locale
 * - Theme class to the HTML element
 * - Special handling for pre-rendered routes (blog, legal pages)
 * - Loading of analytics and customer support scripts
 *
 * @param children - Child components to render within the layout
 */
function InnerLayout({ children }: { children: React.ReactNode }) {
  const [theme] = useTheme();
  const data = useRouteLoaderData<typeof loader>("root");
  const { i18n } = useTranslation();
  const { pathname } = useLocation();

  // Set the i18next language based on the locale from the loader
  useChangeLanguage(data?.locale ?? "en");

  // Detect if the current route is a pre-rendered page (blog or legal)
  // These pages require special theme handling
  const isPreRendered =
    pathname.includes("/legal") || pathname.includes("/blog");

  return (
    <html
      lang={data?.locale ?? "en"}
      className={cn(theme ?? "", "h-full")}
      dir={i18n.dir()}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {isPreRendered ? (
          <script src="/scripts/prerendered-theme.js" />
        ) : (
          <PreventFlashOnWrongTheme ssrTheme={Boolean(data?.theme)} />
        )}
      </head>
      <body className="h-full">
        {children}
        <Toaster richColors position="bottom-right" />
        <ScrollRestoration />
        <Scripts />
        {import.meta.env.VITE_GOOGLE_TAG_ID &&
          import.meta.env.VITE_GOOGLE_TAG_ID !== "" && (
            <>
              <script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GOOGLE_TAG_ID}`}
              ></script>
              <script
                dangerouslySetInnerHTML={{
                  __html: `window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${import.meta.env.VITE_GOOGLE_TAG_ID}');`,
                }}
              />
            </>
          )}
        {import.meta.env.VITE_CHANNEL_PLUGIN_KEY &&
          import.meta.env.VITE_CHANNEL_PLUGIN_KEY !== "" && (
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(){var w=window;if(w.ChannelIO){return w.console.error("ChannelIO script included twice.");}var ch=function(){ch.c(arguments);};ch.q=[];ch.c=function(args){ch.q.push(args);};w.ChannelIO=ch;function l(){if(w.ChannelIOInitialized){return;}w.ChannelIOInitialized=true;var s=document.createElement("script");s.type="text/javascript";s.async=true;s.src="https://cdn.channel.io/plugin/ch-plugin-web.js";var x=document.getElementsByTagName("script")[0];if(x.parentNode){x.parentNode.insertBefore(s,x);}}if(document.readyState==="complete"){l();}else{w.addEventListener("DOMContentLoaded",l);w.addEventListener("load",l);}})();
            ChannelIO('boot', {
              "pluginKey": "${import.meta.env.VITE_CHANNEL_PLUGIN_KEY}"
            });
`,
              }}
            ></script>
          )}
      </body>
    </html>
  );
}

/**
 * Main Application Component
 *
 * This is the primary component rendered by React Router.
 * It handles global UI elements, progress indicators, and navigation.
 *
 * Key responsibilities:
 * 1. Setting up progress indicators for navigation (NProgress)
 * 2. Handling Supabase authentication redirects
 * 3. Providing global UI context (Sheet and Dialog components)
 */
export default function App() {
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const isBusy =
    navigation.state !== "idle" ||
    fetchers.some((fetcher) => fetcher.state !== "idle");
  const [showBlockingLoader, setShowBlockingLoader] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const activeFetcher = fetchers.find((fetcher) => fetcher.state !== "idle");

  // Initialize NProgress with spinner for better UX during navigation
  useEffect(() => {
    NProgress.configure({ showSpinner: false });
  }, []);

  // Fast route changes stay visually instant. Only requests that take longer
  // than the threshold show a blocking loader.
  useEffect(() => {
    if (!isBusy) {
      setShowBlockingLoader(false);
      setLoadingProgress(0);
      NProgress.done();
      return;
    }

    const timer = window.setTimeout(() => {
      setLoadingProgress(8);
      setShowBlockingLoader(true);
      NProgress.start();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isBusy]);

  useEffect(() => {
    if (!showBlockingLoader || !isBusy) return;
    const timer = window.setInterval(() => {
      setLoadingProgress((progress) =>
        progress >= 92
          ? 92
          : Math.min(92, progress + Math.max(1, (92 - progress) * 0.08)),
      );
    }, 350);
    return () => window.clearInterval(timer);
  }, [isBusy, showBlockingLoader]);

  useEffect(() => {
    if (!showBlockingLoader) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showBlockingLoader]);

  // Handle Supabase authentication redirects
  // This is a workaround for a Supabase auth issue: https://github.com/supabase/auth/issues/1927
  // TODO: Remove this once the issue is fixed
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requestFormData = navigation.formData ?? activeFetcher?.formData;
  const requestIntent = String(requestFormData?.get("intent") ?? "");
  const targetPath = navigation.location?.pathname ?? location.pathname;
  const loadingCopy = (() => {
    switch (requestIntent) {
      case "analyze-managed":
        return {
          title: "정밀 분석을 진행하고 있어요",
          description: "포트폴리오와 목표를 바탕으로 미래 시나리오를 계산해요.",
        };
      case "refresh-managed-analysis":
        return {
          title: "오늘의 분석을 업데이트하고 있어요",
          description: "최신 가격과 환율을 반영해 분석 기록을 새로 계산해요.",
        };
      case "add-transaction":
        return {
          title: "매매일지를 저장하고 있어요",
          description:
            "거래일의 환율과 보유 현황만 계산해요. 정밀 분석에는 아직 반영하지 않아요.",
        };
      case "update-transaction":
        return {
          title: "매매일지를 수정하고 있어요",
          description:
            "변경 내용을 매매일지에 저장해요. 정밀 분석에는 아직 반영하지 않아요.",
        };
      case "apply-transaction-updates":
        return {
          title: "매매일지 수정사항을 저장하고 있어요",
          description:
            "대기 중인 변경을 한 번에 반영하고 보유 현황을 다시 계산해요.",
        };
      case "delete-transaction":
        return {
          title: "매매 기록을 삭제하고 있어요",
          description:
            "남은 거래로 보유 현황만 정리해요. 정밀 분석에는 아직 반영하지 않아요.",
        };
      case "delete-all-transactions":
        return {
          title: "매매일지를 전부 삭제하고 있어요",
          description:
            "모든 거래 기록을 정리하고 포트폴리오 보유 현황을 비우고 있어요.",
        };
      case "import-quick-portfolio":
        return {
          title: "포트폴리오를 가져오고 있어요",
          description: "빠른 분석의 종목을 정밀 매매일지로 옮기고 있어요.",
        };
      case "delete-analysis":
        return {
          title: "분석 기록을 삭제하고 있어요",
          description: "선택한 목표 분석을 기록에서 정리해요.",
        };
      case "delete-all-history":
        return {
          title: "전체 분석 기록을 삭제하고 있어요",
          description: "저장된 분석 기록을 안전하게 정리하고 있어요.",
        };
    }

    if (requestFormData)
      return {
        title: "변경사항을 저장하고 있어요",
        description: "요청한 내용을 안전하게 반영하고 있어요.",
      };
    if (targetPath.startsWith("/dashboard/history"))
      return {
        title: "분석 기록을 불러오고 있어요",
        description: "저장된 날짜와 목표별 분석을 정리하고 있어요.",
      };
    if (targetPath.startsWith("/dashboard/portfolio"))
      return {
        title: "포트폴리오를 불러오고 있어요",
        description: "보유 현황과 매매일지를 준비하고 있어요.",
      };
    if (targetPath.startsWith("/dashboard/insights"))
      return {
        title: "투자 인사이트를 불러오고 있어요",
        description: "저장된 기록을 비교해 주요 변화를 정리하고 있어요.",
      };
    if (targetPath.startsWith("/dashboard"))
      return {
        title: "대시보드를 불러오고 있어요",
        description: "최신 투자 현황과 목표 진행 상황을 준비하고 있어요.",
      };
    return {
      title: "페이지를 불러오고 있어요",
      description: "필요한 정보를 준비하고 있어요.",
    };
  })();
  useEffect(() => {
    if (location.pathname === "/") {
      const error = searchParams.get("error");
      const code = searchParams.get("code");
      if (error) {
        // Redirect to error page if authentication failed
        navigate(`/error?${searchParams.toString()}`);
      } else if (code) {
        // Redirect to dashboard if authentication succeeded
        navigate(`/dashboard/account`);
      }
    }
  }, [searchParams]);

  return (
    <Sheet>
      <Dialog>
        <Outlet />
        {showBlockingLoader && (
          <div
            className="bg-background/55 fixed inset-0 z-[9999] flex cursor-wait items-center justify-center backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-label="요청 처리 중"
          >
            <div className="border-border/70 bg-card/95 w-[min(90vw,360px)] rounded-2xl border px-5 py-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-500">
                  <LoaderCircleIcon className="size-5 animate-spin" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black">{loadingCopy.title}</p>
                    <span className="text-xs font-black text-emerald-500 tabular-nums">
                      {Math.round(loadingProgress)}%
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {loadingCopy.description}
                  </p>
                </div>
              </div>
              <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-[width] duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </Sheet>
  );
}

/**
 * Global Error Boundary Component
 *
 * This component catches and displays errors that occur during rendering
 * anywhere in the application. It provides different behavior based on:
 * - Error type (route error vs. JavaScript error)
 * - Environment (development vs. production)
 *
 * Key features:
 * - Special handling for 404 errors with a custom NotFound component
 * - Error reporting to Sentry in production
 * - Detailed stack traces in development mode
 * - User-friendly error messages in production
 *
 * @param error - The error that was caught by React Router
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    // Handle route errors (404, 500, etc.)
    if (error.status === 404) {
      // Show custom 404 page for "not found" errors
      return <NotFound />;
    }
    message = "Error";
    details = error.statusText || details;
  } else if (error && error instanceof Error) {
    // Handle JavaScript errors
    if (
      import.meta.env.VITE_SENTRY_DSN &&
      import.meta.env.MODE === "production"
    ) {
      // Report error to Sentry in production
      Sentry.captureException(error);
    }
    if (import.meta.env.DEV) {
      // Show detailed error information in development
      details = error.message;
      stack = error.stack;
    }
  }

  // Render a simple error page with available information
  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
