"use client";

import {
  Delete02Icon,
  File01Icon,
  Location01Icon,
  PlusSignIcon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopBarAction, useShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import type {
  Attachment,
  KpiTemplateField,
  Report,
  ReportDraft,
  ReportingPeriod,
  ReportLocation,
} from "@/data/reports";
import {
  type ApiMember,
  CODE_ALREADY_SUBMITTED,
  CODE_PERIOD_CLOSED,
} from "@/lib/api-types";
import { recordAudit } from "@/lib/audit";
import {
  gate,
  mergeDraft,
  requestSuggestion,
  type Suggestion,
} from "@/lib/drafting";
import { listMembers } from "@/lib/members";
import { pickSubmitPeriod } from "@/lib/periods";
import {
  ACCOMPLISHMENTS_MIN,
  ATTACHMENT_MAX_FILES,
  attachmentsRefusal,
  COLLEAGUE_CAP,
  type DraftProblem,
  type FieldId,
  htmlToText,
  type KpiProblem,
  type KpiRowInput,
  normaliseKpiRows,
  removeColleague,
  sectionTone,
  selectColleague,
  submitBlockers,
} from "@/lib/report-draft";
import {
  groupFieldErrors,
  reportErrorMessage,
  type SectionField,
  submitBlock,
} from "@/lib/report-errors";
import { draftBody, SUBMITTED_KEY, takeHandoff } from "@/lib/reports";
import {
  editBody,
  editReport,
  getCurrentPeriod,
  getDraft,
  getOpenPeriods,
  getReport,
  listMyReports,
  saveDraft,
  submitReport,
} from "@/lib/reports-api";
import { listSpaces } from "@/lib/spaces-api";
import { SUBMISSION_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { RichTextSection } from "./rich-text-section";

/* @info - The whole form is tidy, not guarded: the server decides who may submit. The
   blocked states below exist so nobody types a report into a form that will refuse it. */

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "failed"; message: string };

type Form = {
  accomplishments: string;
  challenges: string;
  plans: string;
  rows: KpiRowInput[];
  attachments: Attachment[];
  taggedMembershipIds: string[];
  location: ReportLocation | null;
};

type Counts = Record<"accomplishments" | "challenges" | "plans", number>;

function emptyForm(rows: KpiTemplateField[]): Form {
  return {
    accomplishments: "",
    challenges: "",
    plans: "",
    rows: rows.map((field, index) => ({
      ...field,
      id: `row-${index}`,
      raw: "",
    })),
    attachments: [],
    taggedMembershipIds: [],
    location: null,
  };
}

/* @info - Design: autosave 1500 ms after the last change. */
const debounceMs = 1500;

/** The editor stores HTML, so generated text becomes one escaped paragraph. */
function wrap(text: string): string {
  if (text.trim() === "") return "";
  return `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
}

const SECTION_LABEL: Record<
  "accomplishments" | "challenges" | "plans",
  string
> = {
  accomplishments: "Accomplishments",
  challenges: "Challenges",
  plans: "Next plans",
};

function draftFromForm(form: Form, base: ReportDraft): ReportDraft {
  const normalised = normaliseKpiRows(form.rows);
  return {
    ...base,
    accomplishments: form.accomplishments,
    challenges: form.challenges,
    plans: form.plans,
    kpis: normalised.ok ? normalised.kpis : base.kpis,
    attachments: form.attachments,
    taggedMembershipIds: form.taggedMembershipIds,
    location: form.location,
    updatedAt: new Date().toISOString(),
  };
}

function DraftWithAi({
  gate: state,
  busy,
  onDraft,
  pending,
  onReplace,
  onKeep,
  notice,
}: {
  gate: { allowed: boolean; reason: string | null };
  busy: boolean;
  onDraft: () => void;
  pending: boolean;
  onReplace: () => void;
  onKeep: () => void;
  notice: string | null;
}) {
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onDraft}
        disabled={!state.allowed || busy}
        title={state.reason ?? undefined}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-hairline px-3 text-[12.5px] text-ink/75 disabled:opacity-40"
      >
        <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
        {busy ? "Drafting…" : "Draft with AI"}
      </button>

      {state.allowed ? null : (
        <p className="mt-1 text-[11.5px] text-ink/50">{state.reason}</p>
      )}

      {pending ? (
        <div className="mt-2 rounded-md border border-hairline bg-surface-muted px-3 py-2">
          <p className="text-[12.5px] text-ink">
            The suggestion would replace text you typed. Replace it?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onKeep}
              className="min-h-9 rounded-md border border-hairline px-3 text-[12px] text-ink/70"
            >
              Keep my text
            </button>
            <button
              type="button"
              onClick={onReplace}
              className="min-h-9 rounded-md bg-ink px-3 text-[12px] text-surface"
            >
              Replace
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p className="mt-1 text-[11.5px] text-ink/55">{notice}</p>
      ) : null}
    </div>
  );
}

function formFromDraft(draft: ReportDraft): Form {
  return {
    accomplishments: draft.accomplishments,
    challenges: draft.challenges,
    plans: draft.plans,
    rows: draft.kpis.map((kpi, index) => ({
      id: `row-${index}-${kpi.name}`,
      name: kpi.name,
      unit: kpi.unit,
      raw: kpi.value === null ? "" : String(kpi.value),
    })),
    attachments: draft.attachments,
    taggedMembershipIds: draft.taggedMembershipIds,
    location: draft.location,
  };
}

function countsOf(form: Form): Counts {
  return {
    accomplishments: htmlToText(form.accomplishments).length,
    challenges: htmlToText(form.challenges).length,
    plans: htmlToText(form.plans).length,
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Loaded =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready" };

const FIELD_OF: Record<SectionField, FieldId | null> = {
  accomplishments: "accomplishments",
  challenges: "challenges",
  plans: "plans",
  colleagues: "colleagues",
  attachments: "attachments",
  location: null,
};

export function SubmitReport() {
  const { membership, workspace, user } = useShell();
  const router = useRouter();

  const [form, setForm] = useState<Form>(() => emptyForm([]));
  const [drafting, setDrafting] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<Suggestion | null>(
    null,
  );

  const draftGate = gate({
    plan: workspace.plan,
    aiEnabled: workspace.aiFeatures,
  });

  /** Sections arrive as text; the editor stores markup, so a paragraph is the safe shape. */
  const applySuggestion = (suggestion: Suggestion) => {
    setForm((current) => ({
      ...current,
      accomplishments: wrap(suggestion.accomplishments),
      challenges: wrap(suggestion.challenges),
      plans: wrap(suggestion.plans),
    }));
  };
  const [counts, setCounts] = useState<Counts>({
    accomplishments: 0,
    challenges: 0,
    plans: 0,
  });
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [period, setPeriod] = useState<ReportingPeriod | null>(null);
  const [base, setBase] = useState<ReportDraft | null>(null);
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);
  const [closed, setClosed] = useState(false);
  const [people, setPeople] = useState<ApiMember[]>([]);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [problems, setProblems] = useState<DraftProblem[]>([]);
  const [kpiProblems, setKpiProblems] = useState<KpiProblem[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [colleagueQuery, setColleagueQuery] = useState("");
  const [colleagueResults, setColleagueResults] = useState<ApiMember[] | null>(
    null,
  );
  const [colleagueNotice, setColleagueNotice] = useState<string | null>(null);
  const [geo, setGeo] = useState<"idle" | "asking" | "denied" | "failed">(
    "idle",
  );
  const [editTarget, setEditTarget] = useState<Report | null>(null);
  const [textToCopy, setTextToCopy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Form | null>(null);
  const kpiRef = useRef<HTMLDivElement | null>(null);
  const baseRef = useRef<ReportDraft | null>(null);
  /* @info - Only the newest save may write the indicator, so a slow old answer cannot
     say Saved over a newer failure. */
  const saveSeq = useRef(0);
  baseRef.current = base;

  const blocked = useMemo(
    () =>
      submitBlock({
        role: membership.role,
        readOnly: workspace.readOnly,
        hasSpace: membership.space !== null,
      }),
    [membership.role, membership.space, workspace.readOnly],
  );

  /** Puts a server field map next to the fields it names. */
  const showFieldErrors = useCallback(
    (fields: Record<string, string> | undefined) => {
      const grouped = groupFieldErrors(fields);
      const next: DraftProblem[] = [];
      const loose = [...grouped.other];
      for (const [section, message] of Object.entries(grouped.sections)) {
        const field = FIELD_OF[section as SectionField];
        if (field) next.push({ field, message });
        else loose.push(message);
      }
      if (grouped.kpis) loose.push(grouped.kpis);
      setProblems(next);
      setKpiProblems(
        Object.entries(grouped.kpiRows).map(([index, message]) => ({
          index: Number(index),
          field: "value" as const,
          message,
        })),
      );
      return loose.join(" ");
    },
    [],
  );

  /** One answer to every refused call: a field message, a reload, or a banner. */
  const refused = useCallback(
    (failure: {
      status: number;
      code?: string;
      message: string;
      fields?: Record<string, string>;
    }): string | null => {
      if (failure.code === CODE_ALREADY_SUBMITTED) {
        setReloadKey((current) => current + 1);
        return null;
      }
      if (failure.code === CODE_PERIOD_CLOSED) setClosed(true);
      if (failure.fields) {
        const loose = showFieldErrors(failure.fields);
        return loose || null;
      }
      return reportErrorMessage(failure);
    },
    [showFieldErrors],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey is the retry trigger
  useEffect(() => {
    if (blocked) return;
    let cancelled = false;

    const fail = (message: string) => {
      if (!cancelled) setLoaded({ state: "error", message });
    };

    void (async () => {
      setLoaded({ state: "loading" });
      setSubmittedReport(null);
      setEditTarget(null);
      setClosed(false);
      setBanner(null);
      setProblems([]);
      setKpiProblems([]);

      /* @info - The handoff is one shot: a second visit is the ordinary form. */
      const handoff = takeHandoff(window.localStorage, membership.id);
      const [spaces, members] = await Promise.all([
        listSpaces(workspace.id),
        listMembers(workspace.id),
      ]);
      if (cancelled) return;
      if (members.ok) {
        setPeople(
          members.data.filter(
            (person) => person.active && person.membershipId !== membership.id,
          ),
        );
      }
      const space = spaces.ok
        ? spaces.data.find(
            (row) =>
              (membership.spaceId && row.id === membership.spaceId) ||
              row.name === membership.space,
          )
        : undefined;
      const template = space?.kpiTemplate ?? [];

      if (handoff) {
        const found = await getReport(handoff);
        if (cancelled) return;
        if (!found.ok) {
          fail(reportErrorMessage(found));
          return;
        }
        const startForm = formFromDraft(found.data);
        setEditTarget(found.data);
        setBase(found.data);
        setForm(startForm);
        setCounts(countsOf(startForm));
        setSave({ kind: "idle" });
        setLoaded({ state: "ready" });
        return;
      }

      const [current, open, mine] = await Promise.all([
        getCurrentPeriod(workspace.id),
        getOpenPeriods(workspace.id),
        listMyReports(workspace.id, { limit: 100 }),
      ]);
      if (cancelled) return;
      if (!current.ok) return fail(reportErrorMessage(current));
      if (!mine.ok) return fail(reportErrorMessage(mine));

      const submittedIds = new Set(mine.data.map((report) => report.periodId));
      const chosen = pickSubmitPeriod(
        open.ok ? open.data : [],
        current.data,
        submittedIds,
      );
      if (!chosen) return fail("There is no open reporting period.");
      setPeriod(chosen);

      const already = mine.data.find((report) => report.periodId === chosen.id);
      if (already) {
        setSubmittedReport(already);
        setLoaded({ state: "ready" });
        return;
      }

      const draft = await getDraft(chosen.id);
      if (cancelled) return;
      if (!draft.ok) {
        const message = refused(draft);
        if (message) fail(message);
        return;
      }
      const fresh: ReportDraft = draft.data ?? {
        id: "",
        periodId: chosen.id,
        authorMembershipId: membership.id,
        accomplishments: "",
        challenges: "",
        plans: "",
        kpis: template.map((field) => ({ ...field, value: null })),
        attachments: [],
        taggedMembershipIds: [],
        location: null,
        submissionStatus: "draft",
        reviewStatus: "pending",
        updatedAt: new Date().toISOString(),
      };
      const startForm = formFromDraft(fresh);
      setBase(fresh);
      setForm(startForm);
      setCounts(countsOf(startForm));
      setSave(draft.data ? { kind: "saved" } : { kind: "idle" });
      setLoaded({ state: "ready" });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    blocked,
    membership.id,
    membership.space,
    membership.spaceId,
    refused,
    reloadKey,
    workspace.id,
  ]);

  /** Sends the draft. Never says Saved unless the server said so. */
  const persist = useCallback(
    async (next: Form) => {
      const current = baseRef.current;
      if (!current || editTarget || closed) return;
      const merged = draftFromForm(next, current);
      const seq = ++saveSeq.current;
      setSave({ kind: "saving" });
      const result = await saveDraft(draftBody(merged));
      if (seq !== saveSeq.current) return;
      if (result.ok) {
        setBase((was) => (was ? { ...was, id: result.data.id } : was));
        setSave({ kind: "saved" });
        setProblems([]);
        setKpiProblems([]);
        return;
      }
      const message = refused(result);
      setSave({
        kind: "failed",
        message: message ?? "Not saved. Retry",
      });
    },
    [closed, editTarget, refused],
  );

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      const next = pending.current;
      pending.current = null;
      void persist(next);
    }
  }, [persist]);

  const update = useCallback(
    (patch: Partial<Form>) => {
      setForm((current) => {
        const next = { ...current, ...patch };
        pending.current = next;
        if (!editTarget) setSave({ kind: "saving" });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          timer.current = null;
          pending.current = null;
          void persist(next);
        }, debounceMs);
        return next;
      });
    },
    [editTarget, persist],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const focusFirst = useCallback((field: FieldId) => {
    const selector =
      field === "kpis"
        ? null
        : `[aria-label="${SECTION_LABEL[field as keyof Counts]}"]`;
    const target = selector
      ? document.querySelector<HTMLElement>(selector)
      : kpiRef.current;
    target?.focus();
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const onSubmit = useCallback(async () => {
    if (submitting || !base) return;
    setBanner(null);

    const normalised = normaliseKpiRows(form.rows);
    if (!normalised.ok) {
      setKpiProblems(normalised.problems);
      setProblems([]);
      focusFirst("kpis");
      return;
    }
    setKpiProblems([]);

    const candidate = draftFromForm(form, base);
    const blockers = submitBlockers(candidate);
    if (blockers.length > 0) {
      setProblems(blockers);
      focusFirst(blockers[0].field);
      return;
    }
    setProblems([]);

    setSubmitting(true);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    pending.current = null;
    saveSeq.current += 1;

    if (editTarget) {
      const saved = await editReport(editTarget.id, editBody(candidate));
      if (!saved.ok) {
        const message = refused(saved);
        if (message) setBanner(message);
        setTextToCopy(
          [
            htmlToText(form.accomplishments),
            htmlToText(form.challenges),
            htmlToText(form.plans),
          ]
            .filter(Boolean)
            .join("\n\n"),
        );
        setSubmitting(false);
        return;
      }
      router.push(`/dashboard/reports/${editTarget.id}`);
      return;
    }

    /* @info - The last words are saved first, so what is submitted is what is on screen. */
    const draft = await saveDraft(draftBody(candidate));
    if (!draft.ok) {
      const message = refused(draft);
      if (message) setBanner(message);
      setSubmitting(false);
      return;
    }
    const result = await submitReport(draft.data.id);
    if (!result.ok) {
      const message = refused(result);
      if (message) setBanner(message);
      setSubmitting(false);
      return;
    }

    try {
      window.sessionStorage.setItem(
        SUBMITTED_KEY,
        JSON.stringify({
          periodLabel: period?.label ?? "",
          submissionStatus: result.data.submissionStatus,
          reportId: result.data.id,
        }),
      );
    } catch {
      /* @info - The confirmation is a nicety; blocked storage must not block the route. */
    }
    router.push("/dashboard");
  }, [base, editTarget, focusFirst, form, period, refused, router, submitting]);

  const setSection =
    (field: keyof Counts) => (html: string, characters: number) => {
      update({ [field]: html } as Partial<Form>);
      setCounts((current) => ({ ...current, [field]: characters }));
    };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setGeo("failed");
      return;
    }
    setGeo("asking");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
        setGeo("idle");
      },
      (error) => {
        setGeo(error.code === error.PERMISSION_DENIED ? "denied" : "failed");
      },
      { timeout: 10_000 },
    );
  };

  const problemsFor = (field: FieldId) =>
    problems.filter((problem) => problem.field === field);

  const saveLabel =
    save.kind === "saving"
      ? "Saving"
      : save.kind === "saved"
        ? "Saved just now"
        : save.kind === "failed"
          ? save.message
          : "";

  if (blocked) {
    return (
      <Shell>
        <StateCard title={blocked.title} body={blocked.body} />
      </Shell>
    );
  }

  if (loaded.state === "loading") {
    return (
      <Shell>
        <div aria-busy="true">
          <span className="sr-only">Loading</span>
          <div className="h-6 w-48 animate-pulse rounded bg-surface-muted" />
          <div className="mt-4 h-40 animate-pulse rounded-2xl bg-surface-muted" />
        </div>
      </Shell>
    );
  }

  if (loaded.state === "error") {
    return (
      <Shell>
        <div role="alert" className="flex flex-col gap-2">
          <h1 className="font-bold text-[22px] text-ink leading-[1.2] tracking-[-0.02em]">
            The report could not be loaded
          </h1>
          <p className="max-w-[60ch] text-[14px] text-ink/60 leading-[1.6]">
            {loaded.message}
          </p>
          <div>
            <Button
              onClick={() => setReloadKey((current) => current + 1)}
              className="min-h-11 rounded-xl"
            >
              Retry
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // An edit handoff bypasses this screen: the author is correcting a Report, not
  // starting a second one for the period.
  if (submittedReport && !editTarget) {
    return (
      <Shell>
        <div>
          <StateCard
            title="Your report for this period is in"
            body={`${period?.label ?? "This period"} was submitted. Open it to see what a reviewer has said.`}
          />
          <Link
            href={`/dashboard/reports/${submittedReport.id}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-ink px-3 text-[13px] text-surface"
          >
            Open report
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <TopBarAction>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={submitting || (closed && !editTarget)}
          className="hidden h-8 gap-1.5 rounded-2xl bg-ink px-3 text-surface md:inline-flex"
        >
          {submitting
            ? "Saving"
            : editTarget
              ? editTarget.reviewStatus === "rejected"
                ? "Resubmit"
                : "Save changes"
              : "Submit report"}
        </Button>
      </TopBarAction>

      <header className="flex flex-col gap-1.5">
        <h1 className="font-bold text-[24px] text-ink leading-[1.15] tracking-[-0.03em]">
          {editTarget ? "Edit report" : "Submit report"}
        </h1>
        <p className="max-w-[60ch] text-[14px] text-ink/60 leading-[1.6]">
          {period && !editTarget
            ? `${period.label}, due ${new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: workspace.timeZone,
              }).format(new Date(period.dueAt))} (${workspace.timeZone}). `
            : null}
          {editTarget
            ? "Nothing about the Report changes until you save."
            : `${user.name}, your draft saves as you type.`}
        </p>
      </header>

      {closed ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] text-ink"
        >
          {reportErrorMessage({
            code: CODE_PERIOD_CLOSED,
            message: "This period is closed.",
          })}
        </p>
      ) : null}

      {textToCopy ? (
        <div className="mt-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2">
          <p className="text-[13px] text-ink">
            Your text is still here. Copy it somewhere safe if you want to keep
            it.
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                .writeText(textToCopy)
                .then(() => setCopied(true));
            }}
            className="mt-2 min-h-11 rounded-xl border border-hairline px-3 text-[13px] text-ink"
          >
            {copied ? "Copied" : "Copy text"}
          </button>
        </div>
      ) : null}

      {banner ? (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-ink">
          {banner}
        </p>
      ) : null}

      <DraftWithAi
        gate={draftGate}
        busy={drafting}
        onDraft={async () => {
          setDrafting(true);
          try {
            const proposal = await requestSuggestion({
              periodLabel: period?.label ?? "",
              spaceName: membership.space,
            });
            const typed = {
              accomplishments: form.accomplishments,
              challenges: form.challenges,
              plans: form.plans,
            };
            const merged = mergeDraft(typed, proposal);
            if (merged.needsConfirm) {
              setPendingSuggestion(proposal);
              setDraftNotice(
                "You have already written something. Say yes before it is replaced.",
              );
            } else {
              applySuggestion(merged.sections);
              setDraftNotice(
                "Drafted. Nothing is sent until you press the action below.",
              );
            }
            recordAudit(window.localStorage, membership.id, {
              at: new Date().toISOString(),
              actorMembershipId: membership.id,
              action: "draft.requested",
              target: period?.id ?? "",
              summary: "Drafting requested",
            });
          } catch {
            setDraftNotice("Drafting failed. Nothing changed.");
          } finally {
            setDrafting(false);
          }
        }}
        pending={pendingSuggestion !== null}
        onReplace={() => {
          if (!pendingSuggestion) return;
          applySuggestion(pendingSuggestion);
          setPendingSuggestion(null);
          setDraftNotice("Replaced with the suggestion.");
        }}
        onKeep={() => {
          setPendingSuggestion(null);
          setDraftNotice("Kept your text.");
        }}
        notice={draftNotice}
      />

      <form
        className="mt-6 flex flex-col gap-4"
        onBlur={flush}
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <Section
          title="Accomplishments"
          hint={`At least ${ACCOMPLISHMENTS_MIN} characters.`}
          count={counts.accomplishments}
          problems={problemsFor("accomplishments")}
        >
          <RichTextSection
            label="Accomplishments"
            value={form.accomplishments}
            onChange={setSection("accomplishments")}
            onBlur={flush}
          />
        </Section>

        <Section
          title="Challenges"
          count={counts.challenges}
          problems={problemsFor("challenges")}
        >
          <RichTextSection
            label="Challenges"
            value={form.challenges}
            onChange={setSection("challenges")}
            onBlur={flush}
          />
        </Section>

        <Section
          title="Next plans"
          count={counts.plans}
          problems={problemsFor("plans")}
        >
          <RichTextSection
            label="Next plans"
            value={form.plans}
            onChange={setSection("plans")}
            onBlur={flush}
          />
        </Section>

        <Card title="KPIs">
          <div ref={kpiRef} tabIndex={-1} className="flex flex-col gap-2">
            {form.rows.map((row, index) => {
              const problem = kpiProblems.find(
                (entry) => entry.index === index,
              );
              return (
                <div
                  key={row.id ?? `${row.name}-${index}`}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input
                    aria-label={`KPI name ${index + 1}`}
                    value={row.name}
                    onChange={(event) => {
                      const rows = form.rows.map((entry, at) =>
                        at === index
                          ? { ...entry, name: event.target.value }
                          : entry,
                      );
                      update({ rows });
                    }}
                    placeholder="KPI name"
                    className="min-h-11 w-full min-w-0 rounded-xl border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30 sm:w-auto sm:flex-1"
                  />
                  <input
                    aria-label={`${row.name || "KPI"} value`}
                    value={row.raw}
                    onChange={(event) => {
                      const rows = form.rows.map((entry, at) =>
                        at === index
                          ? { ...entry, raw: event.target.value }
                          : entry,
                      );
                      update({ rows });
                    }}
                    inputMode="decimal"
                    placeholder="Not provided"
                    className="min-h-11 w-28 rounded-xl border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
                  />
                  <span className="w-16 text-[12px] text-ink/60">
                    {row.unit}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${row.name || "KPI row"}`}
                    onClick={() =>
                      update({
                        rows: form.rows.filter((_, at) => at !== index),
                      })
                    }
                    className="size-11 text-ink/45"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </Button>
                  {problem ? (
                    <p className="w-full text-[12px] text-destructive">
                      {problem.message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              update({
                rows: [
                  ...form.rows,
                  { id: `row-${Date.now()}`, name: "", unit: "count", raw: "" },
                ],
              })
            }
            className="mt-2 min-h-11 gap-1.5 text-[13px] text-ink/70"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
            Add KPI
          </Button>
        </Card>

        <Card title="Attachments">
          <p className="text-[12px] text-ink/60">
            Files are not uploaded in this build. Images, PDFs and Office
            documents, up to {ATTACHMENT_MAX_FILES} files of 10 MB each.
          </p>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-hairline border-dashed px-3 py-3 text-[13px] text-ink/70 hover:bg-surface-muted">
            <HugeiconsIcon icon={File01Icon} className="size-4" />
            Add files
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              aria-label="Attach files"
              className="sr-only"
              onChange={(event) => {
                const chosen = Array.from(event.target.files ?? []);
                const accepted: Attachment[] = [];
                const refusals: string[] = [];
                for (const file of chosen) {
                  if (
                    form.attachments.length + accepted.length >=
                    ATTACHMENT_MAX_FILES
                  ) {
                    refusals.push(
                      `You can attach up to ${ATTACHMENT_MAX_FILES} files.`,
                    );
                    break;
                  }
                  const refusal = attachmentsRefusal(file);
                  if (refusal) {
                    refusals.push(`${file.name}: ${refusal}`);
                    continue;
                  }
                  accepted.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploaded: false,
                  });
                }
                if (accepted.length > 0) {
                  update({ attachments: [...form.attachments, ...accepted] });
                }
                setBanner(refusals.length > 0 ? refusals.join(" ") : null);
                event.target.value = "";
              }}
            />
          </label>
          {form.attachments.length > 0 ? (
            <ul className="mt-3 flex list-none flex-col gap-2 p-0">
              {form.attachments.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-muted/60 px-3 py-2"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-ink/60">
                    <HugeiconsIcon icon={File01Icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">
                      {file.name}
                    </span>
                    <span className="block text-[11.5px] text-ink/50">
                      {formatSize(file.size)} · Not uploaded
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      update({
                        attachments: form.attachments.filter(
                          (_, at) => at !== index,
                        ),
                      })
                    }
                    className="size-11 shrink-0 text-ink/45"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        {problemsFor("attachments").map((problem) => (
          <p key={problem.message} className="text-[12.5px] text-destructive">
            {problem.message}
          </p>
        ))}

        <Card title="Colleagues">
          <p className="text-[12px] text-ink/60">
            Tag up to {COLLEAGUE_CAP} people. Search by name.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={colleagueQuery}
              onChange={(event) => setColleagueQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  runSearch();
                }
              }}
              aria-label="Search colleagues"
              placeholder="Type a name"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
            />
            <Button
              type="button"
              onClick={runSearch}
              className="min-h-11 gap-1.5 rounded-xl bg-ink px-3 text-surface"
            >
              <HugeiconsIcon icon={Search01Icon} className="size-4" />
              Search
            </Button>
          </div>
          {colleagueNotice ? (
            <p className="mt-2 text-[12px] text-warning">{colleagueNotice}</p>
          ) : null}
          {problemsFor("colleagues").map((problem) => (
            <p
              key={problem.message}
              className="mt-2 text-[12.5px] text-destructive"
            >
              {problem.message}
            </p>
          ))}
          {colleagueResults === null ? (
            <p className="mt-2 text-[12px] text-ink/50">
              Nobody is listed until you search.
            </p>
          ) : colleagueResults.length === 0 ? (
            <p className="mt-2 text-[12px] text-ink/50">
              No colleague matches that name.
            </p>
          ) : (
            <ul className="mt-2 flex list-none flex-col gap-1 p-0">
              {colleagueResults.map((person) => {
                const selected = form.taggedMembershipIds.includes(
                  person.membershipId,
                );
                return (
                  <li key={person.membershipId}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        const result = selectColleague(
                          form.taggedMembershipIds,
                          person.membershipId,
                        );
                        setColleagueNotice(result.message ?? null);
                        if (!result.message) {
                          update({ taggedMembershipIds: result.ids });
                        }
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2.5 text-left text-[13px]",
                        selected
                          ? "bg-ink/[0.06] text-ink"
                          : "text-ink/70 hover:bg-surface-muted",
                      )}
                    >
                      <span className="truncate">
                        {person.name}
                        {membership.role === "admin" ? (
                          <span className="ml-2 text-[12px] text-ink/50">
                            {person.email}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[12px] text-ink/50">
                        {person.space}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {form.taggedMembershipIds.length > 0 ? (
            <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0">
              {form.taggedMembershipIds.map((id) => {
                const person = people.find(
                  (entry) => entry.membershipId === id,
                );
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          taggedMembershipIds: removeColleague(
                            form.taggedMembershipIds,
                            id,
                          ),
                        })
                      }
                      className="min-h-11 rounded-full bg-surface-muted px-3 text-[12.5px] text-ink"
                    >
                      {person?.name ?? id} ×
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Card>

        {workspace.locationTagging ? (
          <Card title="Location">
            <p className="text-[12px] text-ink/60">
              Optional. Your browser asks for permission once, and the
              coordinates are saved with your report.
            </p>
            {form.location ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="tabular-nums text-[13px] text-ink">
                  {form.location.latitude.toFixed(5)},{" "}
                  {form.location.longitude.toFixed(5)}
                </span>
                <span className="text-[12px] text-ink/50">
                  within {Math.round(form.location.accuracy)} m
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ location: null })}
                  className="min-h-11 text-[13px] text-ink/70"
                >
                  Remove location
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={captureLocation}
                disabled={geo === "asking"}
                className="mt-3 min-h-11 gap-2 rounded-xl bg-ink px-3 text-surface"
              >
                <HugeiconsIcon icon={Location01Icon} className="size-4" />
                {geo === "asking"
                  ? "Getting your location"
                  : "Share my location"}
              </Button>
            )}
            {geo === "denied" ? (
              <p className="mt-2 text-[12.5px] text-destructive">
                Location permission was refused. You can still submit without
                it.
              </p>
            ) : null}
            {geo === "failed" ? (
              <p className="mt-2 text-[12.5px] text-destructive">
                Your location could not be read on this device.
              </p>
            ) : null}
          </Card>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <output aria-live="polite" className="text-[12.5px] text-ink/60">
            {saveLabel}
          </output>
          {save.kind === "failed" && !closed && !editTarget ? (
            <button
              type="button"
              onClick={() => void persist(form)}
              className="min-h-11 rounded-xl border border-hairline px-3 text-[12.5px] text-ink"
            >
              Retry
            </button>
          ) : null}
          {period && !editTarget && Date.now() > Date.parse(period.dueAt) ? (
            <span className="text-[12px] text-ink/45">
              {SUBMISSION_STATUS.late.label}
            </span>
          ) : null}
        </div>

        {/* The phone's copy of the one action: it arrives at the end of the page. */}
        <Button
          onClick={onSubmit}
          disabled={submitting || (closed && !editTarget)}
          className="h-12 w-full rounded-2xl bg-ink text-[15px] text-surface md:hidden"
        >
          {submitting
            ? "Saving"
            : editTarget
              ? editTarget.reviewStatus === "rejected"
                ? "Resubmit"
                : "Save changes"
              : "Submit report"}
        </Button>
      </form>
    </Shell>
  );

  function runSearch() {
    const needle = colleagueQuery.trim().toLowerCase();
    setColleagueResults(
      people
        .filter(
          (person) =>
            needle === "" || person.name.toLowerCase().includes(needle),
        )
        .slice(0, 6),
    );
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
      {children}
    </div>
  );
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-bold text-[22px] text-ink leading-[1.2] tracking-[-0.02em]">
        {title}
      </h1>
      <p className="max-w-[60ch] text-[14px] text-ink/60 leading-[1.6]">
        {body}
      </p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-4">
      <h2 className="font-medium text-[14px] text-ink">{title}</h2>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function Section({
  title,
  hint,
  count,
  problems,
  children,
}: {
  title: string;
  hint?: string;
  count: number;
  problems: DraftProblem[];
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium text-[14px] text-ink">{title}</h2>
        <span
          className={cn(
            "tabular-nums text-[12px]",
            sectionTone(count) === "warning" ? "text-warning" : "text-ink/45",
          )}
        >
          {count} / 5,000
        </span>
      </div>
      {hint ? <p className="mt-1 text-[12px] text-ink/60">{hint}</p> : null}
      <div className="mt-2">{children}</div>
      {problems.map((problem) => (
        <p
          key={problem.message}
          className="mt-2 text-[12.5px] text-destructive"
        >
          {problem.message}
        </p>
      ))}
    </section>
  );
}
