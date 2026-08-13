/**
 * Social Authentication Complete Screen
 *
 * This component handles the callback from third-party OAuth providers after authentication.
 * It processes the authentication code returned by the provider and exchanges it for a session.
 *
 * The social authentication flow consists of two steps:
 * 1. Start screen: Initiates the OAuth flow and redirects to the provider
 * 2. This screen: Handles the callback from the provider and completes the authentication
 *
 * This implementation uses Supabase's OAuth authentication system to exchange the OAuth code
 * for a valid session, creating or updating the user in the Supabase database.
 */
import type { Route } from "./+types/complete";

import { data, redirect } from "react-router";
import { z } from "zod";

import makeServerClient from "~/core/lib/supa-client.server";

/**
 * Meta function for the social authentication complete page
 *
 * Sets the page title using the application name from environment variables
 */
export const meta: Route.MetaFunction = () => {
  return [
    {
      title: `로그인 확인 | ${import.meta.env.VITE_APP_NAME}`,
    },
  ];
};

/**
 * Schema for validating successful OAuth callback parameters
 *
 * When the OAuth flow is successful, the provider redirects back with a code
 * that can be exchanged for a session
 */
const searchParamsSchema = z.object({
  code: z.string(),
});

const paramsSchema = z.object({
  provider: z.enum(["google", "kakao"]),
});

/**
 * Schema for validating error parameters from OAuth providers
 *
 * When the OAuth flow fails (e.g., user denies permission), the provider
 * redirects back with error information in standard OAuth error format
 */
const errorSchema = z.object({
  error: z.string(),
  error_code: z.string(),
  error_description: z.string(),
});

function getOAuthProfile(user: {
  email?: string;
  user_metadata: Record<string, unknown>;
}) {
  const metadata = user.user_metadata;
  const firstString = (...values: unknown[]) =>
    values.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

  return {
    name:
      firstString(
        metadata.name,
        metadata.full_name,
        metadata.user_name,
        metadata.nickname,
        metadata.preferred_username,
      ) ??
      user.email?.split("@")[0] ??
      "사용자",
    avatarUrl:
      firstString(
        metadata.avatar_url,
        metadata.picture,
        metadata.profile_image_url,
        metadata.thumbnail_image_url,
      ) ?? null,
  };
}

/**
 * Loader function for the social authentication complete page
 *
 * This function handles the OAuth callback and completes the authentication process:
 * 1. Extracts and validates the code or error from URL query parameters
 * 2. For successful flows, exchanges the code for a session with Supabase
 * 3. For error flows, extracts and displays the error message
 * 4. Redirects authenticated users to the home page with session cookies
 *
 * @param request - The incoming request with OAuth callback parameters
 * @returns Redirect to home page with auth cookies or error response
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return data({ error: "지원하지 않는 로그인 방식입니다." }, { status: 400 });
  }

  // Extract query parameters from the URL
  const { searchParams } = new URL(request.url);

  // Try to validate the parameters as a successful OAuth callback
  const { success, data: validData } = searchParamsSchema.safeParse(
    Object.fromEntries(searchParams),
  );

  // If not a successful callback, check if it's an error callback
  if (!success) {
    const { data: errorData, success: errorSuccess } = errorSchema.safeParse(
      Object.fromEntries(searchParams),
    );

    // If neither a successful nor error callback, return generic error
    if (!errorSuccess) {
      return data({ error: "유효하지 않은 인증 코드입니다." }, { status: 400 });
    }

    // Return the error description from the provider
    return data(
      {
        error:
          errorData.error === "access_denied"
            ? "소셜 로그인이 취소되었어요."
            : errorData.error_description,
      },
      { status: 400 },
    );
  }

  // Create Supabase client and get response headers for auth cookies
  const [client, headers] = makeServerClient(request);

  // Exchange the OAuth code for a session
  const { data: authData, error } =
    await client.auth.exchangeCodeForSession(validData.code);

  // Return error if session exchange fails
  if (error) {
    return data({ error: error.message }, { status: 400 });
  }

  const user = authData.user;
  if (!user) {
    return data(
      { error: "로그인 사용자 정보를 확인하지 못했어요." },
      { status: 400, headers },
    );
  }

  // Supabase creates new profiles through handle_sign_up(). This upsert also
  // repairs older OAuth accounts that do not have a profile yet. On later
  // logins we preserve any name or image the user edited in EOKKA.
  const oauthProfile = getOAuthProfile(user);

  // Normalize provider-specific metadata so the navigation and account screens
  // can use the same fields for both Google and Kakao.
  const normalizedMetadata = {
    ...user.user_metadata,
    name: oauthProfile.name,
    display_name: oauthProfile.name,
    avatar_url: oauthProfile.avatarUrl,
  };
  const { error: metadataError } = await client.auth.updateUser({
    data: normalizedMetadata,
  });

  if (metadataError) {
    return data(
      { error: "소셜 프로필 정보를 저장하지 못했어요. 다시 시도해 주세요." },
      { status: 500, headers },
    );
  }

  const { data: existingProfile, error: profileReadError } = await client
    .from("profiles")
    .select("profile_id, name, avatar_url")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (profileReadError) {
    return data(
      { error: "프로필 정보를 확인하지 못했어요. 다시 시도해 주세요." },
      { status: 500, headers },
    );
  }

  const profileResult = existingProfile
    ? await client
        .from("profiles")
        .update({
          name: existingProfile.name || oauthProfile.name,
          avatar_url: existingProfile.avatar_url || oauthProfile.avatarUrl,
        })
        .eq("profile_id", user.id)
    : await client.from("profiles").insert({
        profile_id: user.id,
        name: oauthProfile.name,
        avatar_url: oauthProfile.avatarUrl,
        marketing_consent: false,
      });

  if (profileResult.error) {
    return data(
      { error: "프로필을 만들지 못했어요. 다시 시도해 주세요." },
      { status: 500, headers },
    );
  }

  // Redirect to home page with auth cookies in headers
  return redirect("/", { headers });
}

/**
 * Social Authentication Complete Component
 *
 * This component is only rendered if there's an error during the OAuth callback processing.
 * Under normal circumstances, the loader function will redirect the user directly to
 * the home page after successful authentication before this component is rendered.
 *
 * If there's an error (e.g., invalid code, authentication denied by user, network issues),
 * this component displays the error message to inform the user about the failure.
 *
 * @param loaderData - Data from the loader containing any error messages
 */
export default function Confirm({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5">
      {/* Display error heading */}
      <h1 className="text-2xl font-semibold">로그인하지 못했어요</h1>
      {/* Display specific error message from the provider or Supabase */}
      <p className="text-muted-foreground">{loaderData.error}</p>
    </div>
  );
}
