"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FormAlert } from "@/components/auth/form-alert";
import { setNewPassword } from "@/lib/auth";
import { clearFlow } from "@/lib/session";

const MIN_PASSWORD = 8;
/** Long enough to read the confirmation, short enough not to feel stalled. */
const HANDOFF_MS = 2600;

type FieldErrors = { password?: string; confirm?: string };

/**
 * The last step of a reset, reached only through a verified code.
 *
 * Success is a state rather than a silent navigation: the user has just proved
 * they hold the address and set a secret, and the one thing worth confirming is
 * that the secret took. The handoff to sign in follows on its own, and the button
 * is there for anyone who does not want to wait.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => router.replace("/login"), HANDOFF_MS);
    return () => window.clearTimeout(id);
  }, [done, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (password.length < MIN_PASSWORD) {
      nextErrors.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    if (confirm !== password) nextErrors.confirm = "Passwords do not match.";
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.password || nextErrors.confirm) return;

    setPending(true);
    const result = await setNewPassword(password);
    setPending(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    // The reset is spent: the next visit to the code screen starts over.
    clearFlow();
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-bold text-[26px] text-ink leading-[1.15] tracking-[-0.03em]">
            Password updated
          </h1>
          <p className="text-[15px] text-muted-foreground leading-[1.6]">
            Your password has been changed. You can now sign in with it.
          </p>
        </header>
        <Link
          href="/login"
          className="inline-flex h-12 w-full items-center justify-center rounded-4xl bg-ink font-medium text-[15px] text-on-ink transition-colors hover:bg-charcoal"
        >
          Back to sign in
        </Link>
        <output className="block text-[13px] text-muted-foreground">Taking you to sign in.</output>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
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
          Set a new password
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.6]">
          Choose a strong password for your account.
        </p>
      </header>

      {formError ? <FormAlert message={formError} /> : null}

      <div className="flex flex-col gap-5">
        <AuthField
          label="New password"
          name="password"
          reveal
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <AuthField
          label="Confirm password"
          name="confirm"
          reveal
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errors.confirm}
        />
      </div>

      <AuthSubmit label="Reset password" pendingLabel="Resetting" pending={pending} />
    </form>
  );
}
