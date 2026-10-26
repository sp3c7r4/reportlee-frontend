"use client";

import {
  Delete02Icon,
  File01Icon,
  Location01Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopBarAction, useShell } from "@/components/dashboard/shell-context";
import { SPACES } from "@/data/members";
import { templateFor } from "@/lib/spaces";
import { Button } from "@/components/ui/button";
import {
  type Attachment,
  COLLEAGUES,
  type Colleague,
  type Report,
  type ReportDraft,
  type ReportLocation,
  SAMPLE_KPI_TEMPLATE,
  SAMPLE_NOW,
  SAMPLE_PERIOD,
  SAMPLE_REPORTS,
  SUBMISSION_WINDOW_MS,
} from "@/data/reports";
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
  submissionStatusFor,
  submitBlockers,
} from "@/lib/report-draft";
import {
  clearDraftsFor,
  clearEditCopy,
  draftKey,
  hiddenReportIds,
  readDraft,
  readEditCopy,
  SUBMITTED_KEY,
  saveReport,
  submitReport,
  takeHandoff,
  writeDraft,
  writeEditCopy,
} from "@/lib/reports";
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

function emptyForm(spaceName: string | null): Form {
  const rows = templateFor(spaceName, SPACES) ?? SAMPLE_KPI_TEMPLATE;
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

const debounceMs = 600;

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

export function SubmitReport() {
  const { membership, workspace, user } = useShell();
  const router = useRouter();

  const [form, setForm] = useState<Form>(() => emptyForm(membership.space));
  const [counts, setCounts] = useState<Counts>({
    accomplishments: 0,
    challenges: 0,
    plans: 0,
  });
  const [base, setBase] = useState<ReportDraft | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [problems, setProblems] = useState<DraftProblem[]>([]);
  const [kpiProblems, setKpiProblems] = useState<KpiProblem[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [staleElsewhere, setStaleElsewhere] = useState(false);
  const [colleagueQuery, setColleagueQuery] = useState("");
  const [colleagueResults, setColleagueResults] = useState<Colleague[] | null>(
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

  const key = draftKey(membership.id, SAMPLE_PERIOD.id);

  const openPeriod = useMemo(() => {
    const now = Date.parse(SAMPLE_NOW);
    const closesAt = Date.parse(SAMPLE_PERIOD.dueAt) + SUBMISSION_WINDOW_MS;
    return now >= Date.parse(SAMPLE_PERIOD.startsAt) && now <= closesAt;
  }, []);

  const hidden = useMemo(
    () =>
      typeof window === "undefined"
        ? []
        : hiddenReportIds(window.localStorage, membership.id),
    [membership.id],
  );

  /**
   * Already submitted is a fact about this Membership's own Reports, and it respects the
   * hidden set: deleting a Report frees the period, so there is never a link to a Report
   * the page would then call not found.
   */
  const ownSubmitted = SAMPLE_REPORTS.filter(
    (report) =>
      report.authorMembershipId === membership.id &&
      !hidden.includes(report.id),
  );
  const alreadySubmitted = openPeriod && ownSubmitted.length > 0;

  const blocked = useMemo(() => {
    if (membership.role === "admin") {
      return {
        title: "Admins monitor Reports",
        body: "Workspace Admins review Reports and don't submit them. Open Review to see what is waiting.",
      };
    }
    if (!openPeriod) {
      return {
        title: "No report is open",
        body: `The ${SAMPLE_PERIOD.label.toLowerCase()} period is closed. The next one opens on a schedule the Workspace sets.`,
      };
    }
    if (workspace.readOnly) {
      return {
        title: "This Workspace is read-only",
        body: "Reports can be read but not written while the Workspace is read-only.",
      };
    }
    if (membership.space === null) {
      return {
        title: "This Workspace is still being set up",
        body: "You are not in a Space yet, so a Report has nowhere to go. A Workspace Admin can add you to one.",
      };
    }
    return null;
  }, [membership.role, membership.space, openPeriod, workspace.readOnly]);

  const load = useCallback(() => {
    if (blocked) return;

    // A handoff is consumed once; a second visit is the ordinary form.
    const handoff = takeHandoff(window.localStorage, membership.id);
    const target = handoff
      ? (SAMPLE_REPORTS.find((report) => report.id === handoff) ?? null)
      : null;

    if (target) {
      setEditTarget(target);
      const copy = readEditCopy(window.localStorage, membership.id, target.id);
      const startForm = copy ? formFromDraft(copy) : formFromDraft(target);
      setBase(copy ?? target);
      setForm(startForm);
      setCounts(countsOf(startForm));
      if (copy) setSave({ kind: "saved" });
      return;
    }

    if (alreadySubmitted) return;
    const existing = readDraft(window.localStorage, key);
    const fresh: ReportDraft = {
      id: `draft_${membership.id}_${SAMPLE_PERIOD.id}`,
      periodId: SAMPLE_PERIOD.id,
      authorMembershipId: membership.id,
      accomplishments: "",
      challenges: "",
      plans: "",
      kpis: (templateFor(membership.space, SPACES) ?? SAMPLE_KPI_TEMPLATE).map(
        (field) => ({ ...field, value: null }),
      ),
      attachments: [],
      taggedMembershipIds: [],
      location: null,
      submissionStatus: "draft",
      reviewStatus: "pending",
      updatedAt: SAMPLE_NOW,
    };
    const draft = existing ?? fresh;
    const nextForm = existing
      ? formFromDraft(existing)
      : emptyForm(membership.space);
    setBase(draft);
    setForm(nextForm);
    setCounts(countsOf(nextForm));
    if (existing) setSave({ kind: "saved" });
  }, [alreadySubmitted, blocked, key, membership.id]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    (next: Form) => {
      if (!base) return;
      const merged = draftFromForm(next, base);
      const result = editTarget
        ? writeEditCopy(
            window.localStorage,
            membership.id,
            editTarget.id,
            merged,
          )
        : writeDraft(window.localStorage, key, merged);
      setBase(merged);
      setSave(
        result.ok
          ? { kind: "saved" }
          : { kind: "failed", message: result.message },
      );
    },
    [base, editTarget, key, membership.id],
  );

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      persist(pending.current);
      pending.current = null;
    }
  }, [persist]);

  const update = useCallback(
    (patch: Partial<Form>) => {
      setForm((current) => {
        const next = { ...current, ...patch };
        pending.current = next;
        setSave({ kind: "saving" });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          timer.current = null;
          persist(next);
          pending.current = null;
        }, debounceMs);
        return next;
      });
    },
    [persist],
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

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) return;
      try {
        const other = JSON.parse(event.newValue) as ReportDraft;
        if (base && Date.parse(other.updatedAt) > Date.parse(base.updatedAt)) {
          setStaleElsewhere(true);
        }
      } catch {
        /* @info - A malformed value is not worth a message; the save path is untouched. */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [base, key]);

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

    const candidate: ReportDraft = {
      ...draftFromForm(form, base),
      submissionStatus: submissionStatusFor(SAMPLE_PERIOD, SAMPLE_NOW),
    };
    const blockers = submitBlockers(candidate);
    if (blockers.length > 0) {
      setProblems(blockers);
      focusFirst(blockers[0].field);
      return;
    }
    setProblems([]);

    setSubmitting(true);

    if (editTarget) {
      // The window is checked again here: it can close between pressing Edit and saving.
      const saved = await saveReport(
        window.localStorage,
        membership.id,
        editTarget,
        candidate,
        SAMPLE_NOW,
      );
      if (!saved.success) {
        setBanner(saved.error.message);
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
      clearEditCopy(window.localStorage, membership.id, editTarget.id);
      router.push(`/dashboard/reports/${editTarget.id}`);
      return;
    }

    const result = await submitReport(
      window.localStorage,
      membership.id,
      candidate,
    );
    if (!result.success) {
      setBanner(result.error.message);
      setSubmitting(false);
      return;
    }

    // Only a successful submit clears the draft.
    clearDraftsFor(window.localStorage, membership.id);
    try {
      window.sessionStorage.setItem(
        SUBMITTED_KEY,
        JSON.stringify({
          periodLabel: SAMPLE_PERIOD.label,
          submissionStatus: candidate.submissionStatus,
          reportId: result.data.id,
        }),
      );
    } catch {
      /* @info - The confirmation is a nicety; blocked storage must not block the route. */
    }
    router.push("/dashboard");
  }, [base, editTarget, focusFirst, form, membership.id, router, submitting]);

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

  // An edit handoff bypasses this screen: the author is correcting a Report, not
  // starting a second one for the period.
  if (alreadySubmitted && !editTarget) {
    return (
      <Shell>
        <div>
          <StateCard
            title="Your report for this period is in"
            body={`${SAMPLE_PERIOD.label} was submitted. Open it to see what a reviewer has said.`}
          />
          <Link
            href={`/dashboard/reports/${ownSubmitted[0]?.id ?? ""}`}
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
          disabled={submitting}
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
          {SAMPLE_PERIOD.label} · due{" "}
          {new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: workspace.timeZone,
          }).format(new Date(SAMPLE_PERIOD.dueAt))}{" "}
          ({workspace.timeZone}).{" "}
          {editTarget
            ? "Nothing about the Report changes until you save."
            : `${user.name}, your draft saves as you type.`}
        </p>
      </header>

      {staleElsewhere ? (
        <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] text-ink">
          This draft was updated in another tab. Reload before you keep typing,
          or your changes here will be the older copy.
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
                const person = COLLEAGUES.find(
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
              coordinates stay on this device in this build.
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
          <span className="text-[12px] text-ink/45">
            {
              SUBMISSION_STATUS[submissionStatusFor(SAMPLE_PERIOD, SAMPLE_NOW)]
                .label
            }
          </span>
        </div>

        {/* The phone's copy of the one action: it arrives at the end of the page. */}
        <Button
          onClick={onSubmit}
          disabled={submitting}
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
    if (needle === "") {
      setColleagueResults(COLLEAGUES.slice(0, 6));
      return;
    }
    setColleagueResults(
      COLLEAGUES.filter((person) =>
        person.name.toLowerCase().includes(needle),
      ).slice(0, 6),
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
