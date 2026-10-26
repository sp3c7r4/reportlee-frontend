import type { RosterMember } from "../data/members.ts";
import type { Membership } from "../data/viewer.ts";
import type { Notification } from "./notifications.ts";

/**
 * State changes become events for exactly the people they concern.
 *
 * Two rules live here because two screens must agree with them: a decision belongs to
 * the author, and a new Report belongs to whoever must review it. That second question
 * is `reviewersFor`, which the review queue uses too, so the queue and the notification
 * cannot name different people.
 */

export type ChangeInput = {
  kind: "decision" | "comment" | "submitted" | "task" | "tag";
  authorMembershipId: string;
  actorMembershipId: string;
  reportId: string;
  at: string;
  reason?: string;
  body?: string;
  space?: string;
  members?: RosterMember[];
  reviewerMembershipIds?: string[];
  taggedMembershipIds?: string[];
};

export type EmittedEvent = {
  membershipId: string;
  title: string;
  body: string;
  href: string;
  at: string;
};

/**
 * Who reviews a Space: its Head, or every Admin when the Space has none. Staff are
 * never reviewers, and an Admin is never missing from a queue that has no Head.
 */
export function reviewersFor(input: {
  space: string;
  members: RosterMember[];
}): string[] {
  const active = input.members.filter((member) => member.active !== false);
  const head = active.find(
    (member) => member.role === "head" && member.space === input.space,
  );
  if (head) return [head.membershipId];
  return active
    .filter((member) => member.role === "admin")
    .map((member) => member.membershipId);
}

export function eventsFor(change: ChangeInput): EmittedEvent[] {
  const base = { at: change.at };
  const reportHref = `/dashboard/reports/${change.reportId}`;

  switch (change.kind) {
    case "decision":
      return [
        {
          ...base,
          membershipId: change.authorMembershipId,
          title: change.reason
            ? "A Report needs another look"
            : "A Report was decided",
          body: change.reason ?? "Your reviewer has decided on your Report.",
          href: reportHref,
        },
      ];
    case "comment": {
      // The other side of the conversation hears about it, never the speaker.
      if (change.actorMembershipId !== change.authorMembershipId) {
        return [
          {
            ...base,
            membershipId: change.authorMembershipId,
            title: "A reviewer commented",
            body: change.body ?? "There is a new comment on your Report.",
            href: reportHref,
          },
        ];
      }
      return (change.reviewerMembershipIds ?? []).map((membershipId) => ({
        ...base,
        membershipId,
        title: "The author replied",
        body: change.body ?? "There is a new reply on a Report you review.",
        href: reportHref,
      }));
    }
    case "submitted": {
      if (!change.space || !change.members) return [];
      return reviewersFor({ space: change.space, members: change.members }).map(
        (membershipId) => ({
          ...base,
          membershipId,
          title: "A Report needs review",
          body: "A Report for this period is waiting on you.",
          href: "/dashboard/review",
        }),
      );
    }
    case "task":
      return [
        {
          ...base,
          membershipId: change.authorMembershipId,
          title: "A task was assigned to you",
          body: change.body ?? "A reviewer added a follow-up task.",
          href: "/dashboard/tasks",
        },
      ];
    case "tag":
      // A tag grants no access and asks nothing: telling somebody is noise.
      return [];
  }
}

/** Convenience for turning an emitted event into the stored notification shape. */
export function asNotification(event: EmittedEvent, id: string): Notification {
  return {
    id,
    kind: "decision",
    title: event.title,
    body: event.body,
    at: event.at,
    read: false,
    href: event.href,
  };
}

export function activeMembers(
  members: Membership[],
  names: Record<string, string> = {},
): RosterMember[] {
  return members.map((member) => ({
    membershipId: member.id,
    name: names[member.id] ?? member.id,
    role: member.role,
    space: member.space,
    active: true,
  }));
}
