import type { Metadata } from "next";
import { Suspense } from "react";
import { CaptureScreen } from "@/components/leads/CaptureScreen";

/**
 * The PUBLIC event capture route, at `/capture/[token]`, deliberately OUTSIDE
 * `/dashboard`. It renders with no session: it reads no Membership, shows no dashboard
 * shell, no sidebar, no tab bar and no Workspace switcher, and it renders no data about
 * any other lead. The token is resolved client-side against a sample constant while
 * there is no backend, and an unknown token reaches the invalid-link state.
 *
 * The screen reads the token from the params promise, so with Cache Components on it
 * must sit behind a Suspense boundary whose fallback can prerender.
 */

export const metadata: Metadata = {
  title: "Leave your details | Reportlee",
  description: "Share your details with the event team.",
};

export default function CapturePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10">
          <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </main>
      }
    >
      <CaptureScreen params={params} />
    </Suspense>
  );
}
