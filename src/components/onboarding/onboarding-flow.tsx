"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FormAlert } from "@/components/auth/form-alert";
import {
  type InviteRow,
  InviteStep,
} from "@/components/onboarding/invite-step";
import { SpaceStep } from "@/components/onboarding/space-step";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { useWorkspaceForm } from "@/components/onboarding/use-workspace-form";
import { WorkspaceStep } from "@/components/onboarding/workspace-step";
import { Button } from "@/components/ui/button";
import type { CreatedInvitation } from "@/lib/api-types";
import { hasLiveSession, SIMULATED_AUTH } from "@/lib/auth";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { createInvitations } from "@/lib/invitations";
import {
  invalidInviteIndexes,
  inviteFailure,
  nextStep,
  type OnboardingStepId,
  previousStep,
  STEPS,
  spaceFailureMessage,
  stepFromParam,
} from "@/lib/onboarding";
import { readSession } from "@/lib/session";
import { createSpace, listSpaces } from "@/lib/spaces-api";
import { getMemberships } from "@/lib/workspaces";

type OnboardingFlowProps = {
  /** From the address, already the only thing the URL is allowed to carry. */
  initialStep?: string;
};

type Entry = "loading" | "error" | "ready";

const EMPTY_INVITE: InviteRow = { email: "", role: "staff", spaceId: "" };

/**
 * The first-run flow: three steps, one route, the step in the address.
 *
 * The Workspace, its Spaces and the invitations are created through the API, one
 * call per step. A Space that was created stays created: a retry after a later row
 * failed sends only the rows that are left. The only things that survive a reload
 * are the step in the address and what the server already holds.
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

  const [stepId, setStepId] = useState<OnboardingStepId>(
    () => stepFromParam(initialStep).id,
  );
  const step = stepFromParam(stepId);
  const [entry, setEntry] = useState<Entry>("loading");
  /* @info - The Workspace the Spaces and invitations go into: the one just created, or
     the last one when the person returns here, and only when they are its Admin. */
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const form = useWorkspaceForm();
  const [spaces, setSpaces] = useState<string[]>([""]);
  const [createdRows, setCreatedRows] = useState<number[]>([]);
  const [spaceErrors, setSpaceErrors] = useState<Record<number, string>>({});
  const [spaceOptions, setSpaceOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [invites, setInvites] = useState<InviteRow[]>([EMPTY_INVITE]);
  const [invalidInvites, setInvalidInvites] = useState<number[]>([]);
  const [inviteErrors, setInviteErrors] = useState<Record<number, string>>({});
  const [sent, setSent] = useState<Record<number, CreatedInvitation> | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  /* @info - Convenience only: a visit with no session goes to sign in, and the server
     refuses every write anyway. Anyone signed in may create a Workspace, so the
     platform role plays no part here. The Memberships say which Workspace a return
     visit to the Spaces or Team step belongs to. */
  function enter() {
    if (SIMULATED_AUTH ? !readSession() : !hasLiveSession()) {
      router.replace("/login");
      return;
    }
    setEntry("loading");
    void getMemberships().then((result) => {
      if (!result.ok) {
        if (result.status === 401 && !hasLiveSession()) {
          router.replace("/login");
          return;
        }
        setEntry("error");
        return;
      }
      const { memberships, lastWorkspaceId } = result.data;
      const admin =
        memberships.find(
          (entryRow) =>
            entryRow.workspaceId === lastWorkspaceId &&
            entryRow.role === "admin",
        ) ?? memberships.find((entryRow) => entryRow.role === "admin");
      if (admin) setWorkspaceId(admin.workspaceId);
      setEntry("ready");
    });
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on arrival
  useEffect(enter, []);

  const allowed = entry === "ready";

  // A Space or Team step with no Workspace to put things in starts at the first step.
  useEffect(() => {
    if (allowed && !workspaceId && step.id !== "workspace") {
      setStepId("workspace");
      router.replace("/onboarding?step=workspace", { scroll: false });
    }
  }, [allowed, workspaceId, step.id, router]);

  // The Team step offers the Workspace's own Spaces to a Staff invitation.
  useEffect(() => {
    if (!allowed || !workspaceId || step.id !== "team") return;
    let cancelled = false;
    void listSpaces(workspaceId).then((result) => {
      if (cancelled || !result.ok) return;
      const open = result.data
        .filter((space) => !space.archived)
        .map((space) => ({ id: space.id, name: space.name }));
      setSpaceOptions(open);
      setInvites((rows) =>
        rows.map((row) =>
          row.spaceId || open.length === 0
            ? row
            : { ...row, spaceId: open[0].id },
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [allowed, workspaceId, step.id]);

  // The heading of a new step takes focus, so the flow is walkable by keyboard
  // without hunting for where the content moved to.
  useEffect(() => {
    if (allowed) heading.current?.focus();
  }, [allowed]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const fields = gsap.utils.toArray<HTMLElement>("[data-step-field]");
        const line = root.current?.querySelector<HTMLElement>(
          "[data-progress-line]",
        );
        const timeline = gsap.timeline();

        timeline.fromTo(
          panel.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" },
        );
        if (fields.length > 0) {
          timeline.fromTo(
            fields,
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: 0.45,
              stagger: 0.045,
              ease: "power3.out",
            },
            "-=0.38",
          );
        }
        if (line) {
          timeline.fromTo(
            line,
            { scaleX: Math.max(0.18, step.index / STEPS.length) },
            {
              scaleX: (step.index + 1) / STEPS.length,
              duration: 0.5,
              ease: "power3.out",
            },
            0,
          );
        }

        return () => {
          timeline.kill();
        };
      });
      return () => mm.revert();
    },
    { dependencies: [step.id, allowed], scope: root, revertOnUpdate: true },
  );

  function goTo(id: OnboardingStepId) {
    setStepId(id);
    setFormError(undefined);
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

  async function submitSpaces(id: string) {
    const rows = spaces.map((row) => row.trim());
    if (rows.every((row) => row === "")) {
      setFormError("Add at least one Space to continue.");
      return;
    }
    setPending(true);
    const errors: Record<number, string> = {};
    const created = [...createdRows];
    for (let index = 0; index < rows.length; index += 1) {
      if (rows[index] === "" || created.includes(index)) continue;
      const result = await createSpace(id, rows[index]);
      if (!result.ok) {
        errors[index] = spaceFailureMessage(result);
        break;
      }
      created.push(index);
    }
    setPending(false);
    setCreatedRows(created);
    setSpaceErrors(errors);
    if (Object.keys(errors).length === 0) advance();
  }

  async function submitTeam(id: string) {
    if (sent) {
      advance();
      return;
    }
    const rejected = invalidInviteIndexes(invites);
    setInvalidInvites(rejected);
    setInviteErrors({});
    if (rejected.length > 0) return;

    const filled = invites
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.email.trim() !== "");
    if (filled.length === 0) {
      advance();
      return;
    }
    const missing = filled.find(
      ({ row }) => row.role === "staff" && !row.spaceId,
    );
    if (missing) {
      setFormError("Add a Space first, so Staff have somewhere to join.");
      return;
    }

    setPending(true);
    const result = await createInvitations(
      id,
      filled.map(({ row }) => ({
        email: row.email.trim(),
        role: row.role,
        ...(row.role === "staff" ? { spaceId: row.spaceId } : {}),
      })),
    );
    setPending(false);
    if (!result.ok) {
      const { rows, form: message } = inviteFailure(
        result,
        filled.map(({ index }) => index),
      );
      setInviteErrors(rows);
      setFormError(message);
      return;
    }
    setSent(
      Object.fromEntries(
        filled.map(({ index }, position) => [index, result.data[position]]),
      ),
    );
  }

  async function handleSubmit() {
    if (pending || form.submitting) return;
    setFormError(undefined);

    if (step.id === "workspace") {
      const created = await form.submit();
      if (!created) return;
      setWorkspaceId(created.workspace.id);
      advance();
      return;
    }
    if (!workspaceId) return;
    if (step.id === "spaces") {
      await submitSpaces(workspaceId);
      return;
    }
    await submitTeam(workspaceId);
  }

  const previous = previousStep(step);

  if (entry === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="font-semibold text-[17px] text-ink">
          We could not load your account.
        </p>
        <Button type="button" onClick={enter}>
          Retry
        </Button>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <div className="h-6 w-40 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-11 animate-pulse rounded-xl bg-surface-muted" />
        <div className="h-11 animate-pulse rounded-xl bg-surface-muted" />
      </div>
    );
  }

  const teamSent = step.id === "team" && sent !== null;

  return (
    <div ref={root} className="flex flex-col gap-8">
      <StepIndicator current={step} />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
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
            <p className="text-[15px] text-muted-foreground leading-[1.6]">
              {step.supporting}
            </p>
          </div>

          {step.id === "workspace" ? (
            <div data-step-field className="flex flex-col gap-6">
              <WorkspaceStep
                orgName={form.name}
                slug={form.slug}
                slugTouched={form.slugTouched}
                slugStatus={form.status}
                nameError={form.errors.name}
                slugError={form.errors.slug}
                onOrgName={form.onName}
                onSlug={form.onSlug}
              />
              {form.errors.form ? (
                <FormAlert message={form.errors.form} />
              ) : null}
              {form.errors.verifyEmail ? (
                <Link href="/verify" className="text-[13px] underline">
                  Verify your email
                </Link>
              ) : null}
            </div>
          ) : null}

          {step.id === "spaces" ? (
            <div data-step-field className="flex flex-col gap-6">
              <SpaceStep
                rows={spaces}
                errors={spaceErrors}
                created={createdRows}
                onRow={(index, value) =>
                  setSpaces((rows) =>
                    rows.map((row, i) => (i === index ? value : row)),
                  )
                }
                onAdd={() => setSpaces((rows) => [...rows, ""])}
                onRemove={(index) => {
                  setSpaces((rows) => rows.filter((_, i) => i !== index));
                  setCreatedRows((done) =>
                    done
                      .filter((row) => row !== index)
                      .map((row) => (row > index ? row - 1 : row)),
                  );
                  setSpaceErrors({});
                }}
              />
            </div>
          ) : null}

          {step.id === "team" ? (
            <div data-step-field className="flex flex-col gap-6">
              <InviteStep
                rows={invites}
                spaces={spaceOptions}
                invalid={invalidInvites}
                errors={inviteErrors}
                sent={sent}
                onRow={(index, patch) =>
                  setInvites((rows) =>
                    rows.map((row, i) =>
                      i === index ? { ...row, ...patch } : row,
                    ),
                  )
                }
                onAdd={() =>
                  setInvites((rows) => [
                    ...rows,
                    { ...EMPTY_INVITE, spaceId: spaceOptions[0]?.id ?? "" },
                  ])
                }
                onRemove={(index) =>
                  setInvites((rows) => rows.filter((_, i) => i !== index))
                }
              />
            </div>
          ) : null}

          {formError && step.id !== "workspace" ? (
            <FormAlert message={formError} />
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <AuthSubmit
            label={teamSent ? "Go to dashboard" : step.continueLabel}
            pendingLabel="Working"
            pending={pending || form.submitting}
          />

          <div className="flex items-center justify-between gap-4">
            {previous &&
            !teamSent &&
            !(previous.id === "workspace" && workspaceId) ? (
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

            {step.skippable && !teamSent && workspaceId ? (
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
