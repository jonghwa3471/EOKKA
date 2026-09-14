import type { Route } from "./+types/navigation.layout";

import { Suspense } from "react";
import { Await, Outlet } from "react-router";

import { getUnreadNotificationCount } from "~/features/notifications/notifications.server";

import Footer from "../components/footer";
import { NavigationBar } from "../components/navigation-bar";
import makeServerClient from "../lib/supa-client.server";

export async function loader({ request }: Route.LoaderArgs) {
  const [client] = makeServerClient(request);
  const userPromise = client.auth.getUser().then(async (result) => {
    const user = result.data.user;
    const [unreadNotificationCount, profileResult] = user
      ? await Promise.all([
          getUnreadNotificationCount(user.id),
          client
            .from("profiles")
            .select("name, avatar_url")
            .eq("profile_id", user.id)
            .maybeSingle(),
        ])
      : [0, null];

    return {
      ...result,
      unreadNotificationCount,
      profile: profileResult?.data ?? null,
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
          {({ data: { user }, unreadNotificationCount, profile }) =>
            user === null ? (
              <NavigationBar loading={false} />
            ) : (
              <NavigationBar
                name={profile?.name || user.user_metadata.name || "사용자"}
                email={user.email}
                avatarUrl={
                  profile?.avatar_url ?? user.user_metadata.avatar_url ?? null
                }
                unreadNotificationCount={unreadNotificationCount}
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
