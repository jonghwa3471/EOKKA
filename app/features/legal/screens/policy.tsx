import type { Route } from "./+types/policy";

import { bundleMDX } from "mdx-bundler";
import { getMDXComponent } from "mdx-bundler/client";
import path from "node:path";
import { Link, data } from "react-router";

import {
  TypographyBlockquote,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyInlineCode,
  TypographyList,
  TypographyOrderedList,
  TypographyP,
} from "~/core/components/mdx-typography";
import { Button } from "~/core/components/ui/button";

const LEGAL_DOCUMENTS = new Set(["privacy-policy", "terms-of-service"]);

export const meta: Route.MetaFunction = ({ data }) => {
  if (!data) {
    return [
      { title: `페이지를 찾을 수 없음 | ${import.meta.env.VITE_APP_NAME}` },
    ];
  }

  return [
    {
      title: `${data.frontmatter.title} | ${import.meta.env.VITE_APP_NAME}`,
    },
    {
      name: "description",
      content: data.frontmatter.description,
    },
  ];
};

export async function loader({ params }: Route.LoaderArgs) {
  if (!params.slug || !LEGAL_DOCUMENTS.has(params.slug)) {
    throw data(null, { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    "app",
    "features",
    "legal",
    "docs",
    `${params.slug}.mdx`,
  );

  try {
    const { code, frontmatter } = await bundleMDX({ file: filePath });
    return { frontmatter, code };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw data(null, { status: 404 });
    }
    throw data(null, { status: 500 });
  }
}

export default function Policy({
  loaderData: { frontmatter, code },
}: Route.ComponentProps) {
  const MDXContent = getMDXComponent(code);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 md:px-10 md:py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" asChild>
          <Link to="/" viewTransition>
            &larr; 홈으로
          </Link>
        </Button>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="border-border bg-muted rounded-full border px-2.5 py-1 font-semibold tracking-[0.12em]">
            LEGAL
          </span>
          {frontmatter.effectiveDate ? (
            <span>시행일 {frontmatter.effectiveDate}</span>
          ) : null}
        </div>
      </div>

      <article className="border-border bg-card rounded-3xl border px-6 py-8 shadow-sm md:px-12 md:py-12">
        <MDXContent
          components={{
            h1: TypographyH1,
            h2: TypographyH2,
            h3: TypographyH3,
            h4: TypographyH4,
            p: TypographyP,
            blockquote: TypographyBlockquote,
            ul: TypographyList,
            ol: TypographyOrderedList,
            code: TypographyInlineCode,
            a: ({ href, ...props }) => (
              <a
                className="text-primary font-medium underline underline-offset-4"
                href={href}
                rel={href?.startsWith("http") ? "noreferrer" : undefined}
                {...props}
              />
            ),
          }}
        />
      </article>
    </main>
  );
}
