"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { Monogram } from "@/components/brand/monogram";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/data/viewer";
import {
  CODE_EMAIL_NOT_VERIFIED,
  CODE_INVITE_EMAIL_MISMATCH,
  type InvitationPreview,
} from "@/lib/api-types";
import { hasLiveSession, signOut } from "@/lib/auth";
import { acceptInvitation, previewInvitation } from "@/lib/invitations";
import {
  clearPendingInvite,
  isInviteToken,
  setPendingInvite,
} from "@/lib/pending-invite";

type View =
  | { state: "loading" }
  | { state: "signedOut" }
  | { state: "invalid" }
  | { state: "ready"; preview: InvitationPreview }
  | { state: "mismatch"; message: string }
  | { state: "unverified" }
  | { state: "conflict"; message: string }
  | { state: "error"; message: string };

const INVALID = "This invitation is not valid. Ask for a new one.";

/**
 * The page behind an invitation link. The token is read from the path and goes to
 * exactly two calls, preview and accept. A signed-out visitor's token waits in
 * session storage until the dashboard shell sends them back after login. The page
 * branches on the server's `code`, never on its wording.
 */
export function InviteScreen({ token }: { token: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>({ state: "loading" });
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const openInvite = useCallback(() => {
    if (!isInviteToken(token)) {
      setView({ state: "invalid" });
      return () => {};
    }
    if (!hasLiveSession()) {
      setPendingInvite(window.sessionStorage, token);
      setView({ state: "signedOut" });
      return () => {};
    }
    setView({ state: "loading" });
    let cancelled = false;
    void previewInvitation(token).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setView({ state: "ready", preview: result.data });
        return;
      }
      if (result.status === 401 && !hasLiveSession()) {
        setPendingInvite(window.sessionStorage, token);
        setView({ state: "signedOut" });
        return;
      }
      if (result.status === 404) {
        clearPendingInvite(window.sessionStorage);
        setView({ state: "invalid" });
        return;
      }
      if (result.status === 403 && result.code === CODE_INVITE_EMAIL_MISMATCH) {
        setView({ state: "mismatch", message: result.message });
        return;
      }
      if (result.status === 403 && result.code === CODE_EMAIL_NOT_VERIFIED) {
        setView({ state: "unverified" });
        return;
      }
      setView({ state: "error", message: result.message });
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => openInvite(), [openInvite]);

  async function accept() {
    if (accepting) return;
    setAccepting(true);
    setAcceptError(null);
    const result = await acceptInvitation(token);
    setAccepting(false);
    if (result.ok) {
      clearPendingInvite(window.sessionStorage);
      router.replace("/dashboard");
      return;
    }
    if (result.status === 404) {
      clearPendingInvite(window.sessionStorage);
      setView({ state: "invalid" });
      return;
    }
    if (result.status === 409) {
      clearPendingInvite(window.sessionStorage);
      setView({ state: "conflict", message: result.message });
      return;
    }
    if (result.status === 403 && result.code === CODE_INVITE_EMAIL_MISMATCH) {
      setView({ state: "mismatch", message: result.message });
      return;
    }
    if (result.status === 403 && result.code === CODE_EMAIL_NOT_VERIFIED) {
      setView({ state: "unverified" });
      return;
    }
    setAcceptError(result.message);
  }

  async function switchAccount() {
    await signOut();
    setPendingInvite(window.sessionStorage, token);
    setView({ state: "signedOut" });
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface">
      <header className="px-6 py-6 sm:px-10">
        <Link
          href="/"
          aria-label="Reportlee home"
          className="inline-flex w-fit items-center gap-2.5"
        >
          <Monogram className="size-8" />
          <Wordmark className="text-[24px] text-ink" />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pt-6 pb-16 sm:px-10 sm:pt-10">
        <div className="flex w-full max-w-[460px] flex-col gap-5">
          {view.state === "loading" ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">Opening your invitation</span>
              <div className="h-7 w-56 animate-pulse rounded-lg bg-surface-muted" />
              <div className="h-11 animate-pulse rounded-xl bg-surface-muted" />
            </div>
          ) : null}

          {view.state === "signedOut" ? (
            <>
              <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
                You have been invited to a Workspace
              </h1>
              <p className="text-[15px] text-muted-foreground leading-[1.6]">
                Sign in or create an account with the email this invitation was
                sent to. You will come back here afterwards.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center rounded-4xl bg-ink px-6 font-medium text-[15px] text-on-ink"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center rounded-4xl border border-hairline px-6 font-medium text-[15px] text-ink"
                >
                  Sign up
                </Link>
              </div>
            </>
          ) : null}

          {view.state === "ready" ? (
            <>
              <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
                Join {view.preview.workspaceName} as{" "}
                {ROLE_LABEL[view.preview.role]}
              </h1>
              {view.preview.spaceName ? (
                <p className="text-[15px] text-muted-foreground">
                  Space: {view.preview.spaceName}
                </p>
              ) : null}
              <p className="text-[13.5px] text-muted-foreground">
                Sent to {view.preview.email}
              </p>
              {acceptError ? <FormAlert message={acceptError} /> : null}
              <Button
                type="button"
                disabled={accepting}
                onClick={() => void accept()}
                className="h-12 w-full rounded-4xl bg-ink font-medium text-[15px] text-on-ink hover:bg-charcoal"
              >
                {accepting ? "Joining" : "Accept invitation"}
              </Button>
            </>
          ) : null}

          {view.state === "invalid" ? (
            <div role="alert" className="flex flex-col gap-3">
              <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
                {INVALID}
              </h1>
              <Link href="/dashboard" className="text-[14px] underline">
                Go to your dashboard
              </Link>
            </div>
          ) : null}

          {view.state === "mismatch" ? (
            <div role="alert" className="flex flex-col gap-4">
              <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
                This invitation is for another account
              </h1>
              <p className="text-[15px] text-muted-foreground">
                {view.message}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void switchAccount()}
                className="h-12 w-fit rounded-4xl px-6"
              >
                Sign out and use another account
              </Button>
            </div>
          ) : null}

          {view.state === "unverified" ? (
            <div role="alert" className="flex flex-col gap-3">
              <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
                Verify your email to continue.
              </h1>
              <Link href="/verify" className="text-[14px] underline">
                Go to verification
              </Link>
            </div>
          ) : null}

          {view.state === "conflict" ? (
            <div role="alert" className="flex flex-col gap-3">
              <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
                {view.message}
              </h1>
              <Link href="/dashboard" className="text-[14px] underline">
                Go to your dashboard
              </Link>
            </div>
          ) : null}

          {view.state === "error" ? (
            <div role="alert" className="flex flex-col gap-3">
              <h1 className="font-bold text-[20px] text-ink">{view.message}</h1>
              <Button
                type="button"
                variant="outline"
                onClick={() => void openInvite()}
                className="h-11 w-fit rounded-4xl px-6"
              >
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
