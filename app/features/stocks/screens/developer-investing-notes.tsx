import type { Route } from "./+types/developer-investing-notes";

import {
  BookOpenTextIcon,
  BriefcaseBusinessIcon,
  Clock3Icon,
  CoffeeIcon,
  ConstructionIcon,
  HeartHandshakeIcon,
  LineChartIcon,
} from "lucide-react";
import { Link, redirect } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  loadCachedRouteData,
  usePrimeRouteDataCache,
} from "~/core/lib/route-data-cache";
import makeServerClient from "~/core/lib/supa-client.server";
import { isAdmin } from "~/features/admin/admin.server";
import { getAutomaticAnalysisSettings } from "~/features/users/automatic-analysis-settings.server";

export const meta: Route.MetaFunction = () => [
  { title: `개발자의 투자 노하우 | ${import.meta.env.VITE_APP_NAME}` },
  {
    name: "description",
    content:
      "본업에 집중하면서 마음 편히 장기 투자하고 있는 개발자의 개인적인 투자 경험을 소개합니다.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw redirect("/login");
  const settings = await getAutomaticAnalysisSettings(user.id);
  if (!settings.isPro) throw redirect("/dashboard/pro");
  if (!settings.developerPortfolioGiftRevealedAt && !(await isAdmin(user.id)))
    throw redirect("/dashboard/pro");
  return {};
}

type DeveloperInvestingNotesLoaderData = Awaited<ReturnType<typeof loader>>;

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return loadCachedRouteData<DeveloperInvestingNotesLoaderData>(
    "developer-investing-notes",
    async () => serverLoader() as Promise<DeveloperInvestingNotesLoaderData>,
  );
}

export default function DeveloperInvestingNotes({
  loaderData,
}: Route.ComponentProps) {
  usePrimeRouteDataCache("developer-investing-notes", loaderData);
  return (
    <main className="mx-auto w-full max-w-5xl py-6 md:py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-500/15 bg-[radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.2),transparent_36%),radial-gradient(circle_at_0%_100%,rgba(245,158,11,0.12),transparent_35%)] px-6 py-12 sm:px-10 sm:py-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
            <ConstructionIcon className="size-3.5" /> 콘텐츠 준비 중
          </span>
          <h1 className="mt-5 text-3xl leading-tight font-black tracking-[-0.045em] sm:text-5xl">
            차트를 덜 보고도
            <br />
            마음 편히 투자하는 방법
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-7 font-medium sm:text-base">
            주식이 처음이라 어렵거나, 수익률이 생각처럼 나오지 않거나, 제가
            투자하는 방식이 궁금한 분들을 위해 시행착오를 거치며 정리한 개인적인
            투자 노하우를 준비하고 있어요.
          </p>
        </div>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: BriefcaseBusinessIcon,
            title: "본업이 먼저예요",
            body: "매일 경제 뉴스와 차트를 붙잡고 있기보다, 본업에 충실하면서 남는 자산이 꾸준히 일하게 만드는 방법을 이야기할 거예요.",
          },
          {
            icon: Clock3Icon,
            title: "하루 5분이면 충분해요",
            body: "지금의 저는 하루에 주식 차트를 5분도 보지 않고, 어떤 날은 아예 열어보지 않아도 불안하지 않게 투자하고 있어요.",
          },
          {
            icon: HeartHandshakeIcon,
            title: "종목보다 마음이 중요해요",
            body: "무슨 종목을 샀는지만큼 왜 샀고 얼마나 오래 기다릴 수 있는지가 중요해요. 흔들릴 때 지킬 수 있는 투자 마인드를 함께 다룰 거예요.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="bg-card rounded-3xl border p-6 shadow-sm"
          >
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <Icon className="size-5" />
            </div>
            <h2 className="mt-5 text-lg font-black">{title}</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6 font-medium">
              {body}
            </p>
          </article>
        ))}
      </section>

      <section className="bg-card mt-7 rounded-3xl border p-6 sm:p-8">
        <div className="grid gap-7 md:grid-cols-[auto_1fr] md:items-start">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <BookOpenTextIcon className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-black">이 방법만이 정답은 아니에요</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-7 font-medium">
              주식 투자에는 단기 매매, 가치 투자, 성장주 투자, 지수 투자처럼
              정말 다양한 방법이 있어요. 앞으로 소개할 내용은 그중 하나일
              뿐이며, 누구에게나 같은 수익을 만들어 주는 공식이나 절대적인 답이
              아니에요.
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-7 font-medium">
              다만 주식 초보였던 제가 매일 차트와 경제 뉴스를 뚫어져라 보며
              초조해하지 않고도, 본업과 일상을 지키면서 장기적으로 자산을 굴릴
              수 있게 된 과정은 솔직하게 나누고 싶어요.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-7 text-center sm:p-10">
        <CoffeeIcon className="mx-auto size-8 text-emerald-500" />
        <h2 className="mt-4 text-xl font-black">조금만 기다려 주세요</h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm leading-6 font-medium">
          실제 매수 원칙, 종목을 바라보는 기준, 하락장에서 마음을 지키는 방법을
          초보자도 바로 이해할 수 있는 말로 차근차근 정리하고 있어요.
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-6 rounded-full font-black"
        >
          <Link to="/dashboard/developer-portfolio">
            <LineChartIcon className="size-4" /> 주식 포트폴리오로 돌아가기
          </Link>
        </Button>
      </section>

      <p className="text-muted-foreground mt-6 text-center text-xs leading-5 font-medium">
        이 콘텐츠는 개인적인 경험을 공유하기 위한 참고 자료이며 투자 권유나 수익
        보장이 아니에요. 투자 판단과 결과에 대한 책임은 투자자 본인에게 있어요.
      </p>
    </main>
  );
}
