"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventContext, LeadDraft } from "@/data/leads";
import {
  captureLead,
  firstError,
  type LeadErrorField,
  validateLead,
} from "@/lib/leads";

/**
 * The public kiosk form. It owns the draft in memory, validates on submit, moves focus
 * to the first problem, posts through `captureLead`, and on success shows a thank-you
 * then resets to empty for the next person. It never renders any other lead's data.
 *
 * Every captured value is rendered only through React text nodes. There is no
 * `dangerouslySetInnerHTML` anywhere here.
 */

type FieldState = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  notes: string;
  consent: boolean;
};

const EMPTY: FieldState = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  notes: "",
  consent: false,
};

type Errors = Partial<Record<LeadErrorField, string>>;

function toDraft(fields: FieldState): LeadDraft {
  const trimmedEmail = fields.email.trim();
  return {
    fullName: fields.fullName.trim(),
    email: trimmedEmail ? trimmedEmail : null,
    // Phone is kept exactly as entered, never trimmed or reformatted.
    phone: fields.phone ? fields.phone : null,
    company: fields.company.trim() ? fields.company.trim() : null,
    jobTitle: fields.jobTitle.trim() ? fields.jobTitle.trim() : null,
    notes: fields.notes.trim() ? fields.notes.trim() : null,
    consent: {
      given: fields.consent,
      at: fields.consent ? new Date().toISOString() : "",
    },
  };
}

export function CaptureForm({
  token,
  context,
}: {
  token: string;
  context: EventContext;
}) {
  const [fields, setFields] = useState<FieldState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLElement>(null);

  const ids = {
    fullName: useId(),
    email: useId(),
    phone: useId(),
    company: useId(),
    jobTitle: useId(),
    notes: useId(),
    consent: useId(),
  };

  function set<K extends keyof FieldState>(key: K, value: FieldState[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function focusField(field: LeadErrorField) {
    const target =
      field === "fullName"
        ? nameRef.current
        : field === "email" || field === "contact"
          ? emailRef.current
          : field === "phone"
            ? phoneRef.current
            : field === "consent"
              ? consentRef.current
              : null;
    target?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const draft = toDraft(fields);
    const problems = validateLead(draft);

    if (problems.length > 0) {
      const next: Errors = {};
      for (const problem of problems) next[problem.field] = problem.message;
      setErrors(next);
      const first = firstError(problems);
      if (first) focusField(first.field);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await captureLead(token, draft);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    // Kiosk reset: clear every field, untick consent, nothing carries over.
    setFields(EMPTY);
    setDone(true);
  }

  if (done) {
    return (
      <ThankYou
        eventName={context.eventName}
        onReset={() => {
          setDone(false);
          nameRef.current?.focus();
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.fullName}>Full name</Label>
        <Input
          id={ids.fullName}
          ref={nameRef}
          value={fields.fullName}
          onChange={(event) => set("fullName", event.target.value)}
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={
            errors.fullName ? `${ids.fullName}-error` : undefined
          }
        />
        {errors.fullName ? (
          <FieldError id={`${ids.fullName}-error`}>
            {errors.fullName}
          </FieldError>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.email}>Email</Label>
        <Input
          id={ids.email}
          ref={emailRef}
          type="email"
          value={fields.email}
          onChange={(event) => set("email", event.target.value)}
          autoComplete="email"
          aria-invalid={Boolean(errors.email || errors.contact)}
          aria-describedby={
            errors.email || errors.contact ? `${ids.email}-error` : undefined
          }
        />
        {errors.email || errors.contact ? (
          <FieldError id={`${ids.email}-error`}>
            {errors.email ?? errors.contact}
          </FieldError>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.phone}>Phone</Label>
        <Input
          id={ids.phone}
          ref={phoneRef}
          type="tel"
          value={fields.phone}
          onChange={(event) => set("phone", event.target.value)}
          autoComplete="tel"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.company}>Company</Label>
        <Input
          id={ids.company}
          value={fields.company}
          onChange={(event) => set("company", event.target.value)}
          autoComplete="organization"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.jobTitle}>Job title</Label>
        <Input
          id={ids.jobTitle}
          value={fields.jobTitle}
          onChange={(event) => set("jobTitle", event.target.value)}
          autoComplete="organization-title"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.notes}>Notes</Label>
        <textarea
          id={ids.notes}
          value={fields.notes}
          onChange={(event) => set("notes", event.target.value)}
          rows={3}
          className="w-full min-w-0 rounded-2xl border border-input bg-input/30 px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id={ids.consent}
            ref={consentRef}
            checked={fields.consent}
            onCheckedChange={(checked) => set("consent", checked)}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={
              errors.consent ? `${ids.consent}-error` : undefined
            }
            className="mt-0.5"
          />
          <Label htmlFor={ids.consent} className="leading-snug font-normal">
            I agree to be contacted by {context.workspaceName} about this event
            and related follow up.
          </Label>
        </div>
        {errors.consent ? (
          <FieldError id={`${ids.consent}-error`}>{errors.consent}</FieldError>
        ) : null}
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={submitting} className="mt-1">
        {submitting ? "Saving..." : "Submit"}
      </Button>
    </form>
  );
}

function FieldError({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <p id={id} className="text-sm text-destructive">
      {children}
    </p>
  );
}

function ThankYou({
  eventName,
  onReset,
}: {
  eventName: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <h2 className="font-heading text-xl font-medium tracking-tight">
        Thank you
      </h2>
      <p className="max-w-sm text-sm/relaxed text-muted-foreground">
        Your details are in. Someone from the team will be in touch after{" "}
        {eventName}.
      </p>
      <Button type="button" variant="outline" onClick={onReset}>
        Add another
      </Button>
    </div>
  );
}
