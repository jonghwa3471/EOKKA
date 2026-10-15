export async function loader() {
  const productionSiteUrl = "https://eokka.qualius.co";

  return new Response(
    `User-agent: *
Disallow: /dashboard
Disallow: /account
Disallow: /settings
Disallow: /payments
Disallow: /admin
Disallow: /notifications
Disallow: /api
Allow: /

Sitemap: ${productionSiteUrl}/sitemap.xml`,
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Content-Type": "text/plain",
      },
    },
  );
}
