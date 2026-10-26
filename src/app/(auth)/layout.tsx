import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Monogram } from "@/components/brand/monogram";
import { Wordmark } from "@/components/brand/wordmark";
import { Reveal } from "@/components/motion/reveal";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Split shell for the authentication routes: the brand holds the left half at
 * full height, the form does its one job on the right. Below lg the panel is
 * dropped and the mark moves above the form.
 */

/* @info - The layout reads the theme cookie on the server so signing out of a dark app
   lands on a dark sign-in page with no flash. With cacheComponents on, that request-time
   cookie read cannot prerender into the static shell, so this layout is allowed to block
   on navigation instead. Without this the production build fails generating the auth
   routes' static shell. See Next 16 "Authentication with Cache Components". */
export const instant = false;

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // The theme is read on the server, so signing out of a dark app lands on a dark
  // sign-in page rather than flashing a light one.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div
      className={cn(
        "flex min-h-svh flex-col bg-surface lg:grid lg:grid-cols-[41fr_59fr]",
        theme === "dark" && "dark"
      )}
    >
      <aside className="hidden p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-[20px] bg-photo-scrim">
          <Image
            src="/photography/desert-dunes.jpg"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="(min-width: 1024px) 41vw, 1px"
            className="object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-photo-scrim/85 via-photo-scrim/25 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[26%] bg-gradient-to-b from-photo-scrim/75 via-photo-scrim/35 to-transparent"
          />

          <div className="relative flex h-full flex-col justify-between p-10">
            <Link
              href="/"
              aria-label="Reportlee home"
              className="inline-flex w-fit items-center gap-2.5"
            >
              <Monogram className="size-8" />
              <Wordmark className="text-[26px] text-white" />
            </Link>

            <div className="flex max-w-[19rem] flex-col gap-3.5">
              <p className="whitespace-nowrap font-bold text-[clamp(18px,calc(2.5vw-6px),30px)] text-white leading-[1.15] tracking-[-0.03em]">
                Every report, accounted for.
              </p>
              <p className="text-[14.5px] text-white/70 leading-[1.55]">
                Draft, review and approve reports across every Space.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-10">
        <Reveal immediate className="w-full max-w-[360px]">
          <Link
            href="/"
            aria-label="Reportlee home"
            className="mb-10 inline-flex w-fit items-center gap-2.5 lg:hidden"
          >
            <Monogram className="size-8" />
            <Wordmark className="text-[24px] text-ink" />
          </Link>
          {children}
        </Reveal>
      </main>
    </div>
  );
}
