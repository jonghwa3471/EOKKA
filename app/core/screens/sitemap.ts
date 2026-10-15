/**
 * Sitemap Generator Module
 *
 * This module dynamically generates an XML sitemap for the application by scanning
 * content directories and combining them with static routes. The sitemap helps search
 * engines discover and index the application's pages, improving SEO performance.
 *
 * The module automatically includes:
 * - Blog posts from MDX files in the blog directory
 * - Legal pages from MDX files in the legal directory
 * - Custom static routes defined in the code
 *
 * The sitemap is generated on-demand when the route is accessed, ensuring it always
 * contains the latest content without requiring a rebuild of the application.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Sitemap generator loader function
 *
 * This React Router loader function dynamically generates an XML sitemap for the application.
 * It scans the filesystem for content files, combines them with static routes, and formats
 * them according to the sitemap protocol specification.
 *
 * The function performs these steps:
 * 1. Gets the site domain from environment variables
 * 2. Scans the blog directory for MDX files and converts filenames to URLs
 * 3. Scans the legal directory for MDX files and converts filenames to URLs
 * 4. Combines these with static routes like homepage, login, and registration
 * 5. Formats all URLs according to the sitemap XML specification
 * 6. Returns an XML response with the proper content type header
 *
 * @returns {Response} XML response containing the sitemap
 */
export async function loader() {
  const domain = "https://eokka.qualius.co";

  // Scan the blog directory for MDX files and convert to URLs
  const blogUrls = (
    await readdir(path.join(process.cwd(), "app", "features", "blog", "docs"))
  )
    .filter((file) => file.endsWith(".mdx")) // Only include MDX files
    .map((file) => `/blog/${file.replace(".mdx", "")}`);

  // Scan the legal directory for MDX files and convert to URLs
  const legalUrls = (
    await readdir(path.join(process.cwd(), "app", "features", "legal", "docs"))
  )
    .filter((file) => file.endsWith(".mdx")) // Only include MDX files
    .map((file) => `/legal/${file.replace(".mdx", "")}`);

  // Define static routes that should be included in the sitemap
  const customUrls = ["/", "/about", "/methodology"];

  // Combine all URLs and format them according to sitemap protocol
  const sitemapUrls = [...customUrls, ...blogUrls, ...legalUrls].map((url) => {
    return `<url>
      <loc>${domain}${url}</loc>
      <changefreq>${url === "/" ? "daily" : url.startsWith("/blog/") ? "weekly" : "monthly"}</changefreq>
      <priority>${url === "/" ? "1.0" : url === "/about" || url === "/methodology" ? "0.8" : "0.6"}</priority>
    </url>`;
  });

  // Return an XML response with the sitemap
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
    >
      ${sitemapUrls.join("\n")}
    </urlset>
    `,
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Content-Type": "application/xml",
      },
    },
  );
}
