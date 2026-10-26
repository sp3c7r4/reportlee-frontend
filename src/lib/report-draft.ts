import type {
  KpiEntry,
  ReportDraft,
  ReportingPeriod,
} from "../data/reports.ts";

/**
 * The report form's rules, with no React and no storage, so `node --test` can hold
 * them still. Everything here is a check the person can act on: the server repeats
 * them, and nothing in the UI may be described as a rule once it exists.
 */

export const ACCOMPLISHMENTS_MIN = 50;
export const SECTION_MAX = 5000;
/** Assumption: no document fixes the colleague cap. One constant changes it. */
export const COLLEAGUE_CAP = 5;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_FILES = 10;

export type FieldId =
  | "accomplishments"
  | "challenges"
  | "plans"
  | "kpis"
  | "colleagues"
  | "attachments";

export type DraftProblem = {
  field: FieldId;
  message: string;
};

export type KpiProblem = {
  index: number;
  field: "name" | "value";
  message: string;
};

export type KpiRowInput = {
  /** Stable identity for the row's React key. Never stored, never sent. */
  id?: string;
  name: string;
  unit: string;
  /** What the person typed. Never stored raw. */
  raw: string;
};

/**
 * The sections are rich text, so a draft holds HTML. Rules about length must read the
 * text a reviewer will read: counting tags would let 40 real characters through.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h[1-6])\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The same reduction, keeping the block boundaries as newlines, for a page that shows a
 * report as text. Nothing that survives here is markup: only characters.
 */
export function htmlToLines(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h[1-6]|\/blockquote)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

const NUMBER = /^-?\d+(\.\d+)?$/;

/** Blank is "not provided"; anything unparseable is refused, never coerced. */
export function normaliseKpiValue(
  raw: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (!NUMBER.test(trimmed)) {
    return { ok: false, message: "Enter a number, or leave it blank." };
  }
  return { ok: true, value: Number(trimmed) };
}

export function normaliseKpiRows(
  rows: KpiRowInput[],
): { ok: true; kpis: KpiEntry[] } | { ok: false; problems: KpiProblem[] } {
  const problems: KpiProblem[] = [];
  const kpis: KpiEntry[] = [];

  rows.forEach((row, index) => {
    if (row.name.trim() === "") {
      problems.push({
        index,
        field: "name",
        message: "Give the row a name, or remove it.",
      });
    }
    const value = normaliseKpiValue(row.raw);
    if (!value.ok) {
      problems.push({ index, field: "value", message: value.message });
      return;
    }
    kpis.push({ name: row.name.trim(), unit: row.unit, value: value.value });
  });

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, kpis };
}

/** Picking a colleague already on the list leaves one id, never two. */
export function selectColleague(
  ids: string[],
  membershipId: string,
): { ids: string[]; message?: string } {
  if (ids.includes(membershipId)) return { ids };
  if (ids.length >= COLLEAGUE_CAP) {
    return { ids, message: `You can tag up to ${COLLEAGUE_CAP} colleagues.` };
  }
  return { ids: [...ids, membershipId] };
}

export function removeColleague(ids: string[], membershipId: string): string[] {
  return ids.filter((id) => id !== membershipId);
}

export function submissionStatusFor(
  period: Pick<ReportingPeriod, "dueAt">,
  submittedAt: string,
): "submitted" | "late" {
  return Date.parse(submittedAt) > Date.parse(period.dueAt)
    ? "late"
    : "submitted";
}

/** Every reason submit is refused, each naming the card it belongs to. */
export function submitBlockers(
  draft: Pick<
    ReportDraft,
    "accomplishments" | "challenges" | "plans" | "kpis" | "taggedMembershipIds"
  >,
): DraftProblem[] {
  const problems: DraftProblem[] = [];

  if (htmlToText(draft.accomplishments).length < ACCOMPLISHMENTS_MIN) {
    problems.push({
      field: "accomplishments",
      message: `Write at least ${ACCOMPLISHMENTS_MIN} characters about what you got done.`,
    });
  }

  const sections: Array<[FieldId, string]> = [
    ["accomplishments", draft.accomplishments],
    ["challenges", draft.challenges],
    ["plans", draft.plans],
  ];
  for (const [field, html] of sections) {
    if (htmlToText(html).length > SECTION_MAX) {
      problems.push({
        field,
        message: `Keep this to ${SECTION_MAX.toLocaleString("en-GB")} characters.`,
      });
    }
  }

  if (draft.taggedMembershipIds.length > COLLEAGUE_CAP) {
    problems.push({
      field: "colleagues",
      message: `You can tag up to ${COLLEAGUE_CAP} colleagues.`,
    });
  }

  return problems;
}

/** How close a section is to the ceiling, for the counter's tone. */
export function sectionTone(length: number): "quiet" | "warning" {
  return length >= SECTION_MAX * 0.9 ? "warning" : "quiet";
}

const OFFICE = /\.(docx?|xlsx?|pptx?)$/i;
const IMAGE = /\.(png|jpe?g|gif|webp|heic|avif)$/i;

/**
 * Files are metadata only in this build: nothing is uploaded, so this check runs on
 * name, size and type and never reads the bytes.
 */
export function attachmentsRefusal(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  const named =
    IMAGE.test(file.name) ||
    /\.pdf$/i.test(file.name) ||
    OFFICE.test(file.name);
  const typed =
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.type.includes("officedocument") ||
    file.type === "application/msword" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.ms-powerpoint";

  if (!named && !typed) {
    return "Attach an image, a PDF or an Office document.";
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return "Each file must be 10 MB or smaller.";
  }
  return null;
}
