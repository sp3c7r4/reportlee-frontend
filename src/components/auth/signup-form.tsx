"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FormAlert } from "@/components/auth/form-alert";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { signUp } from "@/lib/auth";
import { writeFlow } from "@/lib/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

type FieldErrors = { firstName?: string; lastName?: string; email?: string; password?: string };

export function SignupForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!firstName.trim()) nextErrors.firstName = "Enter your first name.";
    if (!lastName.trim()) nextErrors.lastName = "Enter your last name.";
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = "Enter a valid email address.";
    if (password.length < MIN_PASSWORD) {
      nextErrors.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.firstName || nextErrors.lastName || nextErrors.email || nextErrors.password) {
      return;
    }

    setPending(true);
    const result = await signUp({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
    });
    setPending(false);

    if (result.ok) {
      // Confirm the address on the screen built for it, with the code screen
      // carrying the flow that asked for the code.
      writeFlow({
        flow: "signup",
        email: email.trim(),
        requestedAt: result.requestedAt ?? Date.now(),
      });
      router.replace(`/verify?flow=signup&email=${encodeURIComponent(email.trim())}`);
      return;
    }
    setFormError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <h1 className="font-bold text-[26px] text-ink leading-[1.15] tracking-[-0.03em]">
          Create your account
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Set up a workspace for your team in a minute.
        </p>
      </header>

      {formError ? <FormAlert message={formError} /> : null}

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <AuthField
            label="First name"
            name="firstName"
            autoComplete="given-name"
            placeholder="Amaka"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            error={errors.firstName}
          />
          <AuthField
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            placeholder="Obi"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            error={errors.lastName}
          />
        </div>
        <AuthField
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <AuthField
          label="Password"
          name="password"
          reveal
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
      </div>

      <AuthSubmit label="Create account" pendingLabel="Creating account" pending={pending} />

      <OAuthButtons />

      <p className="text-[14.5px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
