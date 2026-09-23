import type { Route } from "./+types/navigation.layout";

import { Suspense } from "react";
import { Await, Outlet } from "react-router";

import { isAdmin } from "~/features/admin/admin.server";
import { getUnreadNotificationCount } from "~/features/notifications/notifications.server";
import { getAutomaticAnalysisSettings } from "~/features/users/automatic-analysis-settings.server";
import { proTenureBadge } from "~/features/users/pro-tenure";

import Footer from "../components/footer";
import { NavigationBar } from "../components/navigation-bar";
import makeServerClient from "../lib/supa-client.server";

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const userPromise = client.auth.getUser().then(async (result) => {
    const user = result.data.user;
    const [unreadNotificationCount, profileResult, paymentsResult, settings] =
      user
        ? await Promise.all([
            getUnreadNotificationCount(user.id),
            client
              .from("profiles")
              .select("name, avatar_url")
              .eq("profile_id", user.id)
              .maybeSingle(),
            client.from("payments").select("status").eq("user_id", user.id),
            getAutomaticAnalysisSettings(user.id),
          ])
        : [0, null, null, { isPro: false }];

    const completedPaymentCount = (paymentsResult?.data ?? []).filter(
      (payment) =>
        ["DONE", "PAID", "APPROVED"].includes(payment.status.toUpperCase()),
    ).length;
    const tenureBadge = proTenureBadge(
      settings.isPro
        ? Math.max(1, completedPaymentCount)
        : completedPaymentCount,
    );

    return {
      ...result,
      isAdmin: user ? await isAdmin(user.id) : false,
      unreadNotificationCount,
      profile: profileResult?.data ?? null,
      proBadgeTone: tenureBadge?.tone ?? null,
    };
  });
  return { userPromise };
}

export default function NavigationLayout({ loaderData }: Route.ComponentProps) {
  const { userPromise } = loaderData;
  return (
    <div className="flex min-h-screen flex-col justify-between">
      <Suspense fallback={<NavigationBar loading={true} />}>
        <Await resolve={userPromise}>
          {({
            data: { user },
            unreadNotificationCount,
            profile,
            isAdmin,
            proBadgeTone,
          }) =>
            user === null ? (
              <NavigationBar loading={false} />
            ) : (
              <NavigationBar
                isAdmin={isAdmin}
                name={profile?.name || user.user_metadata.name || "사용자"}
                email={user.email}
                avatarUrl={
                  profile?.avatar_url ?? user.user_metadata.avatar_url ?? null
                }
                unreadNotificationCount={unreadNotificationCount}
                proBadgeTone={proBadgeTone}
                loading={false}
              />
            )
          }
        </Await>
      </Suspense>
      <div className="mx-auto my-16 w-full max-w-screen-2xl px-5 md:my-32">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
