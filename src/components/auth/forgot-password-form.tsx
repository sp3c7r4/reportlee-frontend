"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FormAlert } from "@/components/auth/form-alert";
import { requestPasswordReset } from "@/lib/auth";
import { writeFlow } from "@/lib/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
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
    const result = await requestPasswordReset(email.trim());
    setPending(false);

    if (result.ok) {
      // Straight to the code screen: the six digits are the next thing the user
      // needs, and a page telling them to go and read their email is a detour.
      writeFlow({
        flow: "reset",
        email: email.trim(),
        requestedAt: result.requestedAt ?? Date.now(),
      });
      router.replace(`/verify?flow=reset&email=${encodeURIComponent(email.trim())}`);
      return;
    }
    setFormError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
      <Link
        href="/login"
        className="inline-flex w-fit items-center gap-1.5 font-medium text-[13.5px] text-muted-foreground transition-colors hover:text-ink"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
        Back to sign in
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="font-bold text-[26px] text-ink leading-[1.15] tracking-[-0.03em]">
          Reset your password
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Tell us the email on the account and we will send a code to set a new one.
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

      <AuthSubmit label="Send reset code" pendingLabel="Sending" pending={pending} />
    </form>
  );
}
