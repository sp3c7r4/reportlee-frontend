"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { USER } from "@/data/viewer";
import { oauthStartUrl, SIMULATED_AUTH } from "@/lib/auth";
import { writeSession } from "@/lib/session";

const PROVIDERS = [
  { id: "google", label: "Google", mark: "/brand/google.svg" },
  { id: "facebook", label: "Facebook", mark: "/brand/facebook.svg" },
] as const;

/**
 * The way in without a password. These leave the app: the provider returns to
 * the API's callback, so they are plain navigations rather than fetch calls.
 */
export function OAuthButtons() {
  const router = useRouter();

  // A real provider leaves the app and returns through the API's callback. This build
  // has no callback, so a provider signs the sample person in and lands on the frame.
  function simulate() {
    writeSession(USER.email);
    router.replace("/dashboard");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
        <span className="font-medium text-[11.5px] text-ink/60 uppercase tracking-[0.16em]">
          or
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() =>
              SIMULATED_AUTH
                ? simulate()
                : window.location.assign(oauthStartUrl(provider.id))
            }
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded-4xl border border-hairline bg-surface-alt px-4 font-medium text-[14.5px] text-ink transition-colors hover:bg-surface-muted"
          >
            <Image
              src={provider.mark}
              alt=""
              width={18}
              height={18}
              unoptimized
              className="size-[18px] shrink-0"
            />
            {provider.label}
          </button>
        ))}
      </div>
    </div>
  );
}
