import type { RosterMember, SpaceSummary } from "../data/members";
import type { Report } from "../data/reports";
import type { Role } from "./nav";

/**
 * Search, with no React. One function decides scope, so the overlay and the full page
 * cannot disagree about what a person may find.
 *
 * The rule: nothing a person could not open through a normal screen. The single
 * exception is an author finding their own draft, labelled Draft.
 */

export type SearchViewer = { membershipId: string; role: Role; space: string | null };

export type SearchHit = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** Set on a draft, so the label is never guessed from the row. */
  label?: string;
  ownerMembershipId?: string;
  space?: string | null;
};

export type SearchResults = {
  reports: SearchHit[];
  members: SearchHit[];
  spaces: SearchHit[];
};

const LIMIT = 5;

const norm = (value: string) => value.toLowerCase();

const spaceOf = (roster: RosterMember[], membershipId: string) =>
  roster.find((member) => member.membershipId === membershipId)?.space ?? null;

export const RECENT_PREFIX = "reportlee.search.recent";

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function search(input: {
  q: string;
  viewer: SearchViewer;
  reports: Report[];
  roster: RosterMember[];
  spaces: SpaceSummary[];
}): SearchResults {
  const query = norm(input.q.trim());
  if (query === "") return { reports: [], members: [], spaces: [] };

  const reports: SearchHit[] = [];
  for (const report of input.reports) {
    const isOwn = report.authorMembershipId === input.viewer.membershipId;
    const isDraft = report.submissionStatus === "draft";
    // A draft is visible to its author alone; everybody else never sees one.
    if (isDraft && !isOwn) continue;
    if (!isOwn) {
      if (input.viewer.role === "staff") continue;
      if (input.viewer.role === "head") {
        if (spaceOf(input.roster, report.authorMembershipId) !== input.viewer.space) {
          continue;
        }
      }
    }

    const author =
      input.roster.find((member) => member.membershipId === report.authorMembershipId)
        ?.name ?? "A colleague";

    const text = `${author} ${report.accomplishments} ${report.challenges} ${report.plans}`;
    if (!norm(text).includes(query)) continue;

    reports.push({
      id: report.id,
      title: isDraft ? `${author}'s week` : `${author}, week of the ${report.periodId.slice(-2)}`,
      subtitle: isDraft ? "Not sent yet" : "Report",
      href: isDraft ? "/dashboard/reports/new" : `/dashboard/reports/${report.id}`,
      label: isDraft ? "Draft" : undefined,
      ownerMembershipId: report.authorMembershipId,
      space: spaceOf(input.roster, report.authorMembershipId),
    });
    if (reports.length === LIMIT) break;
  }

  const members: SearchHit[] = [];
  for (const member of input.roster) {
    if (!member.active) continue;
    if (!norm(member.name).includes(query)) continue;
    members.push({
      id: member.membershipId,
      title: member.name,
      // An address is an Admin's to see, the same rule the member table follows.
      subtitle:
        input.viewer.role === "admin"
          ? `${member.role === "admin" ? "Workspace Admin" : member.space ?? "No Space"}`
          : (member.space ?? "No Space"),
      href: input.viewer.role === "admin" ? "/dashboard/members" : "/dashboard/spaces",
      space: member.space,
    });
    if (members.length === LIMIT) break;
  }

  const spaces: SearchHit[] = [];
  for (const space of input.spaces) {
    if (space.archived) continue;
    if (!norm(space.name).includes(query)) continue;
    spaces.push({
      id: space.id,
      title: space.name,
      subtitle: "Space",
      href: `/dashboard/spaces/${space.id}`,
    });
    if (spaces.length === LIMIT) break;
  }

  return { reports, members, spaces };
}

export function recentSearches(storage: StorageLike, membershipId: string): string[] {
  try {
    const raw = storage.getItem(`${RECENT_PREFIX}.${membershipId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Newest first, deduplicated, capped at five. Per Membership, cleared at sign out. */
export function recordSearch(
  storage: StorageLike,
  membershipId: string,
  term: string,
  _now: string,
): string[] {
  const trimmed = term.trim();
  if (trimmed === "") return recentSearches(storage, membershipId);
  const next = [trimmed, ...recentSearches(storage, membershipId).filter((row) => row !== trimmed)].slice(
    0,
    5,
  );
  try {
    storage.setItem(`${RECENT_PREFIX}.${membershipId}`, JSON.stringify(next));
  } catch {
    /* a full store must not break a search */
  }
  return next;
}

export function clearRecent(storage: StorageLike, membershipId: string): void {
  try {
    storage.removeItem(`${RECENT_PREFIX}.${membershipId}`);
  } catch {
    /* nothing to clear */
  }
}
