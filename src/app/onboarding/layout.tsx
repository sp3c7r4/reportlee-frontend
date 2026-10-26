import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { Monogram } from "@/components/brand/monogram";
import { Wordmark } from "@/components/brand/wordmark";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * First-run layout: its own surface, not the split authentication shell. No
 * photographic panel, no card, one centred column on the page itself.
 *
 * One flat surface, deliberately. An earlier pass laid a faint image under the
 * flow and a warm wash over the top; both read as a band across the lower third
 * of the window rather than as atmosphere, because a decorative layer that
 * covers part of a page is a seam however soft its edge is. The column carries
 * the page on its own.
 */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div
      className={cn(
        "relative flex min-h-svh flex-col overflow-hidden bg-surface",
        theme === "dark" && "dark"
      )}
    >
      <header className="relative flex items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" aria-label="Reportlee home" className="inline-flex w-fit items-center gap-2.5">
          <Monogram className="size-8" />
          <Wordmark className="text-[24px] text-ink" />
        </Link>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-6 pt-6 pb-16 sm:px-10 sm:pt-10">
        <div className="w-full max-w-[520px]">{children}</div>
      </main>
    </div>
  );
}
