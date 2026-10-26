"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FormAlert } from "@/components/auth/form-alert";
import { OtpInput, type OtpInputHandle } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requestSignInCode, resendCode, verifyCode } from "@/lib/auth";
import {
  CODE_LENGTH,
  type FlowConfig,
  isCompleteCode,
  isFlowExpired,
  resendSecondsLeft,
} from "@/lib/otp";
import { clearFlow, readFlow, writeFlow, writeSession } from "@/lib/session";

type VerifyFormProps = {
  flow: FlowConfig;
  email: string;
};

/**
 * One screen for every code entry.
 *
 * The flow decides the heading, the supporting text and where a verified code
 * lands; the flow table in `src/lib/otp.ts` owns all three, so nothing here can
 * be redirected by the address bar. What the tab is holding decides whether a code
 * is live: a reload keeps it, an expired one asks for a new code.
 */
export function VerifyForm({ flow, email }: VerifyFormProps) {
  const router = useRouter();
  const otp = useRef<OtpInputHandle>(null);

  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length: CODE_LENGTH }, () => "")
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** A rejected code is an event, not a state of the screen, so it interrupts. */
  const [rejection, setRejection] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [requestedAt, setRequestedAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const code = digits.join("");
  const expired = requestedAt === null;
  /** Describes the code group, so the boxes are reached knowing their state. */
  const stateId = "verify-state";

  // Read what the previous screen left for this tab, once.
  useEffect(() => {
    const held = readFlow();
    const live =
      held &&
      held.flow === flow.id &&
      held.email === email &&
      !isFlowExpired(held.requestedAt, Date.now());
    if (live) {
      setRequestedAt(held.requestedAt);
      return;
    }
    if (held && held.flow === flow.id && held.email === email) {
      setRequestedAt(held.requestedAt);
    }
    // A missing or expired code is a state, not a failure, so it is stated in the
    // subtext rather than raised as an error the user has to dismiss.
  }, [flow.id, email]);

  useEffect(() => {
    if (requestedAt === null) return;
    const tick = () => setSecondsLeft(resendSecondsLeft(requestedAt, Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [requestedAt]);

  function handleDigits(next: string[]) {
    setDigits(next);
    setInvalid(false);
    if (status) setStatus(null);
  }

  /** Closing the dialog hands the boxes back, focused, so a typo is easy to fix. */
  function dismissRejection() {
    setRejection(null);
    requestAnimationFrame(() => otp.current?.focusFirst());
  }

  async function sendCode() {
    setPending(true);
    setFormError(null);
    const result = await requestSignInCode(email);
    setPending(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setRequestedAt(result.data.requestedAt);
    writeFlow({
      flow: flow.id,
      email,
      requestedAt: result.data.requestedAt,
      token: result.data.token,
    });
    setStatus(`Code sent to ${email}.`);
  }

  async function handleResend() {
    if (requestedAt === null) return;
    setPending(true);
    setStatus(null);
    const result = await resendCode(requestedAt, Date.now());
    setPending(false);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }
    setRequestedAt(result.data.requestedAt);
    writeFlow({ flow: flow.id, email, requestedAt: result.data.requestedAt });
    setStatus(`Code resent to ${email}.`);
  }

  /**
   * The completed code is passed in when entry finishes on its own, because the
   * keystroke that completes it has not been committed to state yet.
   */
  async function submit(completed?: string) {
    const candidate = completed ?? code;
    if (pending) return;
    if (expired) {
      await sendCode();
      return;
    }
    if (!isCompleteCode(candidate)) return;

    setPending(true);
    setFormError(null);
    setStatus(null);
    const result = await verifyCode(candidate);
    setPending(false);

    if (!result.ok) {
      setInvalid(true);
      setRejection(result.message);
      return;
    }

    // A reset proves the address; it does not sign anyone in.
    if (flow.establishesSession) {
      writeSession(email);
      clearFlow();
    }
    router.replace(flow.destination);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className="flex flex-col gap-7"
    >
      <Link
        href="/login"
        onClick={() => clearFlow()}
        className="inline-flex w-fit items-center gap-1.5 font-medium text-[13.5px] text-muted-foreground transition-colors hover:text-ink"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
        Back to sign in
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="font-bold text-[26px] text-ink leading-[1.15] tracking-[-0.03em]">
          {flow.heading}
        </h1>
        <p id={stateId} className="text-[15px] text-muted-foreground leading-[1.6]">
          {expired ? (
            <>
              Your last code for <span className="text-ink">{email}</span> is no longer valid. Send
              a new one to continue.
            </>
          ) : (
            <>
              {flow.subtextLead}
              <span className="text-ink">{email}</span>
              {flow.subtextTrail}
            </>
          )}
        </p>
      </header>

      {formError ? <FormAlert message={formError} /> : null}

      <div className="flex flex-col gap-4">
        <OtpInput
          ref={otp}
          value={digits}
          onChange={handleDigits}
          onComplete={(completed) => void submit(completed)}
          invalid={invalid}
          disabled={pending || expired}
          describedBy={stateId}
        />

        <p className="text-[13.5px] text-muted-foreground">
          Didn't receive a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={pending || expired || secondsLeft > 0}
            className="font-medium text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink disabled:text-muted-foreground disabled:no-underline disabled:hover:decoration-transparent"
          >
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend"}
          </button>
        </p>

        {/* Feedback about the resend belongs next to the control that caused it. */}
        {status ? (
          <output className="block text-[13px] text-muted-foreground">{status}</output>
        ) : null}
      </div>

      <AuthSubmit
        label={expired ? "Send a new code" : "Verify"}
        pendingLabel={expired ? "Sending" : "Verifying"}
        pending={pending}
      />

      {process.env.NODE_ENV !== "production" ? (
        <p className="text-[12.5px] text-muted-foreground">
          Demo build: any six digits pass, 111111 is rejected.
        </p>
      ) : null}

      <Dialog
        open={rejection !== null}
        onOpenChange={(open) => {
          if (!open) dismissRejection();
        }}
      >
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-photo-scrim/60"
          className="gap-5 rounded-[20px] border border-hairline bg-surface-alt p-6 ring-0 sm:max-w-[380px]"
        >
          <DialogHeader className="gap-2.5">
            <DialogTitle className="font-bold text-[17px] text-ink leading-[1.25] tracking-[-0.02em]">
              {rejection}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-muted-foreground leading-[1.55]">
              Check the six digits from the email and try again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-col">
            <Button
              type="button"
              onClick={dismissRejection}
              className="h-11 w-full rounded-4xl bg-ink text-[15px] text-on-ink hover:bg-charcoal"
            >
              Try again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
