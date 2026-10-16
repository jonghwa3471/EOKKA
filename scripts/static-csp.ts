import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Static documents cannot use a per-request nonce. Authorize only the exact
// inline scripts produced by the build, and apply the policy before scripts.
export async function protectStaticHtml(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await protectStaticHtml(file);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(file, "utf8");
      const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
        .filter((match) => match[1].trim())
        .map(
          (match) =>
            `'sha256-${createHash("sha256").update(match[1]).digest("base64")}'`,
        );
      const policy = `default-src 'self'; script-src 'self' ${[...new Set(hashes)].join(" ")} https://www.googletagmanager.com https://cdn.channel.io https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: wss:; frame-src https://www.googletagmanager.com https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'`;
      await writeFile(
        file,
        html.replace(
          /<head>/i,
          `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`,
        ),
      );
    }
  }
}
