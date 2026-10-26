"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { type InviteRow, InviteStep } from "@/components/onboarding/invite-step";
import { SpaceStep } from "@/components/onboarding/space-step";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { WorkspaceStep } from "@/components/onboarding/workspace-step";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import {
  cleanRows,
  invalidInviteIndexes,
  isReservedSlug,
  nextStep,
  type OnboardingStepId,
  previousStep,
  STEPS,
  slugify,
  stepFromParam,
} from "@/lib/onboarding";

type OnboardingFlowProps = {
  /** From the address, already the only thing the URL is allowed to carry. */
  initialStep?: string;
};

/**
 * The first-run flow: three steps, one route, the step in the address.
 *
 * Values stay in this component for the length of the visit. Nothing is stored
 * and nothing is sent, which is why no step claims anything was created, and why
 * the only thing worth surviving a reload is the step itself.
 *
 * The step change is the one authored moment on this surface: the incoming step
 * rises, its heading and fields follow in sequence, and the progress line grows to
 * the new position. All of it inside the reduced motion query, so a user who asked
 * for stillness gets the state change and nothing else.
 */
export function OnboardingFlow({ initialStep }: OnboardingFlowProps) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const [stepId, setStepId] = useState<OnboardingStepId>(() => stepFromParam(initialStep).id);
  const step = stepFromParam(stepId);

  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [spaces, setSpaces] = useState<string[]>([""]);
  const [invites, setInvites] = useState<InviteRow[]>([{ email: "", role: "staff" }]);
  const [orgError, setOrgError] = useState<string | undefined>();
  const [slugError, setSlugError] = useState<string | undefined>();
  const [invalidInvites, setInvalidInvites] = useState<number[]>([]);

  // The heading of a new step takes focus, so the flow is walkable by keyboard
  // without hunting for where the content moved to.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const fields = gsap.utils.toArray<HTMLElement>("[data-step-field]");
        const line = root.current?.querySelector<HTMLElement>("[data-progress-line]");
        const timeline = gsap.timeline();

        timeline.fromTo(
          panel.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }
        );
        if (fields.length > 0) {
          timeline.fromTo(
            fields,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.45, stagger: 0.045, ease: "power3.out" },
            "-=0.38"
          );
        }
        if (line) {
          timeline.fromTo(
            line,
            { scaleX: Math.max(0.18, step.index / STEPS.length) },
            { scaleX: (step.index + 1) / STEPS.length, duration: 0.5, ease: "power3.out" },
            0
          );
        }

        return () => {
          timeline.kill();
        };
      });
      return () => mm.revert();
    },
    { dependencies: [step.id], scope: root, revertOnUpdate: true }
  );

  function goTo(id: OnboardingStepId) {
    setStepId(id);
    router.replace(`/onboarding?step=${id}`, { scroll: false });
  }

  function advance() {
    const next = nextStep(step);
    if (!next) {
      router.push("/dashboard");
      return;
    }
    goTo(next.id);
  }

  function handleSubmit() {
    if (step.id === "workspace") {
      const name = orgName.trim();
      const address = slugify(slug);
      setOrgError(name ? undefined : "Give your workspace a name to continue.");
      setSlugError(
        !address
          ? "Add a letter or a number so the address is not empty."
          : isReservedSlug(address)
            ? "That address is reserved. Choose another name."
            : undefined
      );
      if (!name || !address || isReservedSlug(address)) return;
      setSlug(address);
    }

    if (step.id === "spaces") {
      setSpaces((rows) => {
        const cleaned = cleanRows(rows);
        return cleaned.length > 0 ? cleaned : rows;
      });
    }

    if (step.id === "team") {
      const rejected = invalidInviteIndexes(invites);
      setInvalidInvites(rejected);
      if (rejected.length > 0) return;
    }

    advance();
  }

  const previous = previousStep(step);

  return (
    <div ref={root} className="flex flex-col gap-8">
      <StepIndicator current={step} />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        noValidate
        className="flex flex-col gap-8"
      >
        <div ref={panel} className="flex flex-col gap-6">
          <div data-step-field className="flex flex-col gap-2">
            <h1
              ref={heading}
              tabIndex={-1}
              className="font-bold text-[26px] text-ink leading-[1.15] tracking-[-0.03em] focus-visible:outline-none"
            >
              {step.heading}
            </h1>
            <p className="text-[15px] text-muted-foreground leading-[1.6]">{step.supporting}</p>
          </div>

          {step.id === "workspace" ? (
            <div data-step-field className="flex flex-col gap-6">
              <WorkspaceStep
                orgName={orgName}
                slug={slug}
                slugTouched={slugTouched}
                error={orgError}
                onOrgName={(value) => {
                  setOrgName(value);
                  setOrgError(undefined);
                  if (!slugTouched) {
                    const derived = slugify(value);
                    setSlug(derived);
                    if (derived && !isReservedSlug(derived)) setSlugError(undefined);
                  }
                }}
                onSlug={(value) => {
                  const next = slugify(value);
                  setSlug(next);
                  setSlugTouched(true);
                  if (!isReservedSlug(next)) setSlugError(undefined);
                }}
              />
              {slugError ? (
                <p role="alert" className="-mt-3 text-[13px] text-destructive">
                  {slugError}
                </p>
              ) : null}
            </div>
          ) : null}

          {step.id === "spaces" ? (
            <div data-step-field className="flex flex-col gap-6">
              <SpaceStep
                rows={spaces}
                onRow={(index, value) =>
                  setSpaces((rows) => rows.map((row, i) => (i === index ? value : row)))
                }
                onAdd={() => setSpaces((rows) => [...rows, ""])}
                onRemove={(index) => setSpaces((rows) => rows.filter((_, i) => i !== index))}
              />
            </div>
          ) : null}

          {step.id === "team" ? (
            <div data-step-field className="flex flex-col gap-6">
              <InviteStep
                rows={invites}
                invalid={invalidInvites}
                onRow={(index, patch) =>
                  setInvites((rows) =>
                    rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
                  )
                }
                onAdd={() => setInvites((rows) => [...rows, { email: "", role: "staff" }])}
                onRemove={(index) => setInvites((rows) => rows.filter((_, i) => i !== index))}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <AuthSubmit label={step.continueLabel} pendingLabel="Working" pending={false} />

          <div className="flex items-center justify-between gap-4">
            {previous ? (
              <button
                type="button"
                onClick={() => goTo(previous.id)}
                className="font-medium text-[13.5px] text-muted-foreground transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            {step.skippable ? (
              <button
                type="button"
                onClick={advance}
                className="font-medium text-[13.5px] text-muted-foreground transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
              >
                Skip for now
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {/* The animation is not the only signal that the step changed. */}
      <output aria-live="polite" className="sr-only">
        Step {step.index + 1} of {STEPS.length}: {step.heading}
      </output>
    </div>
  );
}
