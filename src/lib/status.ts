/**
 * The status vocabulary: one label, one tone and one icon for every state a report
 * can be shown in, so the same report never reads differently on two screens.
 *
 * Plain data with no imports, so a Node test can load it without React or an icon
 * package. Labels are the product's words, not the database's: CONTEXT.md fixes
 * report status as pending, approved or rejected, and a submission as draft,
 * submitted, late or missing.
 */

/** The semantic tones the design tokens already define. No `info`: no state uses it. */
export type StatusTone = "neutral" | "warning" | "success" | "danger";

/**
 * Stable icon keys, mapped to a component where the pill renders. Keeping the key
 * here rather than the icon component is what lets this module stay import-free,
 * and the Record in the pill makes a missing mapping a compile error.
 */
export type StatusIcon =
  | "clock"
  | "check"
  | "cancel"
  | "file-edit"
  | "sent"
  | "alert"
  | "minus";

export type StatusEntry = {
  label: string;
  tone: StatusTone;
  icon: StatusIcon;
};

/** The reviewer's question: has anyone decided on this report yet? */
export type ReportStatus = "pending" | "approved" | "rejected";

/**
 * The author's question: did this report arrive for the period? Draft is an
 * author-only state. A person with only a draft is shown as missing to every
 * reviewer, so a reviewer never sees this word.
 */
export type SubmissionStatus = "draft" | "submitted" | "late" | "missing";

export const REPORT_STATUS: Record<ReportStatus, StatusEntry> = {
  pending: { label: "Pending", tone: "warning", icon: "clock" },
  approved: { label: "Approved", tone: "success", icon: "check" },
  rejected: { label: "Rejected", tone: "danger", icon: "cancel" },
};

export const SUBMISSION_STATUS: Record<SubmissionStatus, StatusEntry> = {
  draft: { label: "Draft", tone: "neutral", icon: "file-edit" },
  submitted: { label: "Submitted", tone: "success", icon: "sent" },
  late: { label: "Late", tone: "warning", icon: "alert" },
  missing: { label: "Missing", tone: "neutral", icon: "minus" },
};
