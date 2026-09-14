import type { Route } from "./+types/link-complete";

import { redirect } from "react-router";

import makeServerClient from "~/core/lib/supa-client.server";

function accountRedirect(
  status: "connected" | "cancelled" | "exists" | "failed",
  provider: string,
) {
  return `/account/edit?${new URLSearchParams({ social: status, provider })}`;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const provider = params.provider === "google" ? "google" : "kakao";
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code") ?? "";
  const errorDescription = searchParams.get("error_description") ?? "";

  if (error) {
    const detail = `${error} ${errorCode} ${errorDescription}`.toLowerCase();
    if (error === "access_denied")
      return redirect(accountRedirect("cancelled", provider));
    if (
      detail.includes("already") ||
      detail.includes("exists") ||
      detail.includes("identity_already")
    )
      return redirect(accountRedirect("exists", provider));
    return redirect(accountRedirect("failed", provider));
  }

  const code = searchParams.get("code");
  if (!code) return redirect(accountRedirect("failed", provider));

  const [client, headers] = makeServerClient(request);
  const { error: exchangeError } =
    await client.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    const detail =
      `${exchangeError.code ?? ""} ${exchangeError.message}`.toLowerCase();
    return redirect(
      accountRedirect(
        detail.includes("already") || detail.includes("exists")
          ? "exists"
          : "failed",
        provider,
      ),
      { headers },
    );
  }

  return redirect(accountRedirect("connected", provider), { headers });
}

export default function LinkComplete() {
  return null;
}
