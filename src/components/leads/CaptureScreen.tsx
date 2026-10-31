"use client";

import { use, useEffect, useState } from "react";
import type { EventContext } from "@/data/leads";
import { resolveCaptureLink } from "@/lib/leads";
import { CaptureForm } from "./CaptureForm.tsx";

/**
 * The public capture screen's client half. It reads the token from the route params
 * promise, resolves it to an event context, and renders one of three states: loading,
 * an invalid-link message with no form, or the form.
 *
 * It never reads a session, a Membership or any other lead. It renders no dashboard
 * shell: the route sits outside `/dashboard` and this component draws its own frame.
 */

type Phase =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "ready"; context: EventContext };

export function CaptureScreen({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [phase, setPhase] = useState<Phase>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setPhase({ status: "loading" });
    resolveCaptureLink(token).then((result) => {
      if (!active) return;
      setPhase(
        result.ok
          ? { status: "ready", context: result.data }
          : { status: "invalid" },
      );
    });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      {phase.status === "loading" ? <Loading /> : null}
      {phase.status === "invalid" ? <InvalidLink /> : null}
      {phase.status === "ready" ? (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              {phase.context.workspaceName}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              {phase.context.eventName}
            </h1>
            <p className="text-sm/relaxed text-muted-foreground">
              Leave your details and the team will follow up.
            </p>
          </header>
          <CaptureForm token={token} context={phase.context} />
        </div>
      ) : null}
    </main>
  );
}

function Loading() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      <p className="text-sm text-muted-foreground">Loading the form...</p>
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <h1 className="font-heading text-xl font-medium tracking-tight">
        This link is not valid
      </h1>
      <p className="max-w-sm text-sm/relaxed text-muted-foreground">
        The capture link may be wrong or no longer active. Ask the event team
        for a current link.
      </p>
    </div>
  );
}
