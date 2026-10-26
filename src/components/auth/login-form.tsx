"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FormAlert } from "@/components/auth/form-alert";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { signIn } from "@/lib/auth";
import { writeSession } from "@/lib/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

type FieldErrors = { email?: string; password?: string };

/**
 * Sign in with a password, with the other way in offered beneath it.
 *
 * The code route is its own screen rather than a tab here: it asks for less, so
 * it deserves its own heading and its own step, and the user who does not want it
 * never sees it. The button is a link, because that is what it does.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = "Enter a valid email address.";
    if (password.length < MIN_PASSWORD) {
      nextErrors.password = `Passwords are at least ${MIN_PASSWORD} characters.`;
    }
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.email || nextErrors.password) return;

    setPending(true);
    const result = await signIn(email.trim(), password);
    setPending(false);

    if (result.ok) {
      // The real API issues a session cookie; this build has none, so the simulated
      // session is what tells the frame someone is here.
      writeSession(email.trim());
      router.replace("/dashboard");
      return;
    }
    setFormError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <h1 className="font-bold text-[26px] text-ink leading-[1.15] tracking-[-0.03em]">
          Sign in
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Welcome back. Enter your details to continue.
        </p>
      </header>

      {formError ? <FormAlert message={formError} /> : null}

      <div className="flex flex-col gap-5">
        <AuthField
          label="Email address"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <AuthField
          label="Password"
          name="password"
          reveal
          autoComplete="current-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          action={
            <Link
              href="/forgot-password"
              className="font-medium text-ink/70 transition-colors hover:text-ink"
            >
              Forgot password?
            </Link>
          }
        />
      </div>

      <AuthSubmit label="Sign in" pendingLabel="Signing in" pending={pending} />

      <Link
        href="/login/otp"
        className="inline-flex h-12 w-full items-center justify-center rounded-4xl border border-hairline bg-surface-alt font-medium text-[15px] text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
      >
        Login with OTP
      </Link>

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
