import {
  CODE_ADMIN_CANNOT_AUTHOR,
  CODE_ALREADY_SUBMITTED,
  CODE_EDIT_WINDOW_CLOSED,
  CODE_INTERNAL,
  CODE_NO_SPACE,
  CODE_NOT_APPROVED,
  CODE_NOT_ASSIGNEE,
  CODE_NOT_AUTHOR,
  CODE_NOT_AUTHOR_CANNOT_DECIDE,
  CODE_NOT_FOUND,
  CODE_NOT_REVIEWER,
  CODE_NOT_SUBMITTED,
  CODE_PERIOD_CLOSED,
  CODE_PERIOD_NOT_OPEN,
  CODE_REPORT_APPROVED,
  CODE_REPORT_SEEN,
  CODE_REVIEWER_MUST_START,
  CODE_VIEW_NOT_ALLOWED,
  CODE_WORKSPACE_READ_ONLY,
} from "./api-types.ts";
import type { Role } from "./nav.ts";

/**
 * What the report screens say when the server refuses, and where a field error goes.
 * No React. The screens branch on `code`, never on the server's message text, so the
 * words below can change without touching a rule.
 */

const MESSAGE: Record<string, string> = {
  [CODE_PERIOD_CLOSED]:
    "This period is closed. Your draft is kept but can no longer be submitted.",
  [CODE_PERIOD_NOT_OPEN]: "This period has not opened yet.",
  [CODE_EDIT_WINDOW_CLOSED]:
    "The edit window has closed, so this report can no longer be changed.",
  [CODE_REPORT_APPROVED]: "This report is approved and cannot be edited.",
  [CODE_REPORT_SEEN]:
    "A reviewer has already opened this report, so it can no longer be deleted.",
  [CODE_WORKSPACE_READ_ONLY]:
    "This Workspace is read-only. You can read reports but not submit them.",
  [CODE_ALREADY_SUBMITTED]:
    "You have already submitted a report for this period.",
  [CODE_NOT_SUBMITTED]: "This report is still a draft. Submit it first.",
  [CODE_NOT_AUTHOR]: "Only the author can do that.",
  [CODE_ADMIN_CANNOT_AUTHOR]: "Admins review reports and do not submit them.",
  [CODE_NO_SPACE]: "You are not in a Space yet. Ask an Admin to add you.",
  [CODE_NOT_REVIEWER]: "Only a reviewer of this report can do that.",
  [CODE_NOT_AUTHOR_CANNOT_DECIDE]: "Nobody decides on their own report.",
  [CODE_NOT_APPROVED]: "Only an approved report can be reopened.",
  [CODE_REVIEWER_MUST_START]:
    "A reviewer starts the conversation. You can reply once they have.",
  [CODE_NOT_ASSIGNEE]:
    "Only the person it is assigned to can change this task.",
  [CODE_VIEW_NOT_ALLOWED]: "You cannot use this view.",
  [CODE_NOT_FOUND]: "That report is no longer available.",
  [CODE_INTERNAL]: "Something went wrong on our side. Try again.",
};

export function reportErrorMessage(failure: {
  code?: string;
  message: string;
}): string {
  return (failure.code ? MESSAGE[failure.code] : undefined) ?? failure.message;
}

export type SectionField =
  | "accomplishments"
  | "challenges"
  | "plans"
  | "colleagues"
  | "attachments"
  | "location";

export type GroupedFieldErrors = {
  sections: Partial<Record<SectionField, string>>;
  /** Row index to message, from keys like `kpis.2.value`. */
  kpiRows: Record<number, string>;
  /** A message about the KPI list as a whole, such as too many rows. */
  kpis?: string;
  /** Keys the form has no field for. Shown as one message, never dropped. */
  other: string[];
};

const SECTION_OF: Record<string, SectionField> = {
  accomplishments: "accomplishments",
  challenges: "challenges",
  plans: "plans",
  taggedMembershipIds: "colleagues",
  attachments: "attachments",
  location: "location",
};

/** A key is placed by its first dotted segment: `kpis.2.value` belongs to KPI row 2. */
export function groupFieldErrors(
  fields: Record<string, string> | undefined,
): GroupedFieldErrors {
  const grouped: GroupedFieldErrors = { sections: {}, kpiRows: {}, other: [] };
  for (const [key, message] of Object.entries(fields ?? {})) {
    const [head, second] = key.split(".");
    if (head === "kpis") {
      const index = Number(second);
      if (second !== undefined && Number.isInteger(index)) {
        grouped.kpiRows[index] ??= message;
      } else {
        grouped.kpis = message;
      }
      continue;
    }
    const section = SECTION_OF[head];
    if (section) grouped.sections[section] ??= message;
    else grouped.other.push(message);
  }
  return grouped;
}

export type SubmitBlock =
  | { kind: "admin"; title: string; body: string }
  | { kind: "readOnly"; title: string; body: string }
  | { kind: "noSpace"; title: string; body: string };

/** Why the editor is not shown at all. The server repeats every one of these rules. */
export function submitBlock(input: {
  role: Role;
  readOnly: boolean;
  hasSpace: boolean;
}): SubmitBlock | null {
  if (input.role === "admin") {
    return {
      kind: "admin",
      title: "Admins monitor reports",
      body: "Admins review reports and do not submit them. Open Review to see what is waiting.",
    };
  }
  if (input.readOnly) {
    return {
      kind: "readOnly",
      title: "This Workspace is read-only",
      body: "This Workspace is read-only. You can read reports but not submit them.",
    };
  }
  if (!input.hasSpace) {
    return {
      kind: "noSpace",
      title: "You are not in a Space yet",
      body: "A report needs a Space to go to. Ask an Admin to add you to one.",
    };
  }
  return null;
}
