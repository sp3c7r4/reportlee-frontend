"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FormAlert } from "@/components/auth/form-alert";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { requestSignInCode } from "@/lib/auth";
import { writeFlow } from "@/lib/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The way in without a password.
 *
 * One field, because a code sign-in needs nothing else, and then straight to the
 * screen that takes the code. The route back to the password form stays visible,
 * and so do the provider buttons, so choosing this way does not hide the others.
 */
export function OtpLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError(undefined);
    setFormError(null);
    setPending(true);
    const result = await requestSignInCode(email.trim());
    setPending(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    // The flow travels with the tab, so the code screen knows what it is checking.
    writeFlow({
      flow: "login",
      email: email.trim(),
      requestedAt: result.data.requestedAt,
      token: result.data.token,
    });
    router.replace(`/verify?flow=login&email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
      <Link
        href="/login"
        onClick={() => setEmail("")}
        className="inline-flex w-fit items-center gap-1.5 font-medium text-[13.5px] text-muted-foreground transition-colors hover:text-ink"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
        Back to sign in
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="font-bold text-[26px] text-ink leading-[1.15] tracking-[-0.03em]">
          Sign in with a code
        </h1>
        <p className="text-[15px] text-muted-foreground leading-[1.6]">
          We'll send you a six digit code. No password needed.
        </p>
      </header>

      {formError ? <FormAlert message={formError} /> : null}

      <AuthField
        label="Email address"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="you@company.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error}
      />

      <AuthSubmit label="Send code" pendingLabel="Sending" pending={pending} />

      <OAuthButtons />

      <p className="text-[14.5px] text-muted-foreground">
        Don't have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
