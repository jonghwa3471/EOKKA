import type { Route } from "./+types/search";

import { data } from "react-router";

import { searchStocks } from "../queries.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const stocks = await searchStocks(query);

  return data(
    { stocks },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
