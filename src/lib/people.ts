import type { Role } from "./nav.ts";
import {
  INVITATION_DAYS,
  type Invitation,
  type RosterMember,
  type SpaceSummary,
} from "../data/members.ts";

/**
 * The rules of the people screens, with no React.
 *
 * Every blocked action returns a sentence, because a disabled control with no reason is
 * a dead end. None of this is access control: the server repeats all of it.
 */

export type Viewer = { membershipId: string; role: Role; space: string | null };

export type InviteRules = {
  roles: Role[];
  /** A Head may only invite into their own Space, so the picker is fixed. */
  fixedSpace: string | null;
  reason: string | null;
};

export function inviteRules(viewer: Viewer): InviteRules {
  if (viewer.role === "admin") {
    return {
      roles: ["staff", "head", "admin"],
      fixedSpace: null,
      reason: null,
    };
  }
  if (viewer.role === "head") {
    return {
      roles: ["staff"],
      fixedSpace: viewer.space,
      reason: null,
    };
  }
  return {
    roles: [],
    fixedSpace: null,
    reason: "Only an Admin or a Head of Space can invite people.",
  };
}

export type SeatUsage = {
  used: number;
  limit: number | null;
  remaining: number | null;
  atLimit: boolean;
};

/** A pending invitation reserves its seat: counting accepted members alone lets a
 * Starter Workspace sail past ten. */
export function seatUsage(input: {
  memberLimit: number | null;
  members: number;
  invitations: number;
}): SeatUsage {
  const used = input.members + input.invitations;
  if (input.memberLimit === null) {
    return { used, limit: null, remaining: null, atLimit: false };
  }
  const remaining = Math.max(0, input.memberLimit - used);
  return {
    used,
    limit: input.memberLimit,
    remaining,
    atLimit: remaining === 0,
  };
}

export function isExpired(sentAt: string, now: string): boolean {
  const limit = Date.parse(sentAt) + INVITATION_DAYS * 86_400_000;
  return Date.parse(now) >= limit;
}

export function expireInvitations(
  invitations: Invitation[],
  now: string,
): Invitation[] {
  return invitations.map((invitation) => ({
    ...invitation,
    expired: invitation.expired || isExpired(invitation.sentAt, now),
  }));
}

export type SetupState = {
  finished: boolean;
  missing: Array<"Space" | "Admin">;
  reason: string | null;
};

/** A Workspace is set up when it has at least one Space and one active Admin. */
export function setupState(input: {
  spaces: SpaceSummary[];
  admins: number;
  invitations: number;
}): SetupState {
  const missing: SetupState["missing"] = [];
  if (input.spaces.filter((space) => !space.archived).length === 0) {
    missing.push("Space");
  }
  if (input.admins < 1) missing.push("Admin");

  if (missing.length === 0) return { finished: true, missing, reason: null };

  return {
    finished: false,
    missing,
    reason:
      missing.length === 1
        ? `This Workspace still needs a ${missing[0]}.`
        : "This Workspace still needs a Space and an Admin.",
  };
}

export function spaceNameProblem(
  name: string,
  spaces: SpaceSummary[],
): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "Give the Space a name.";
  const clash = spaces.find(
    (space) => space.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return clash ? `${clash.name} is already a Space.` : null;
}

export type Guard = { allowed: boolean; reason: string | null };

const OK: Guard = { allowed: true, reason: null };

/** The guards that need to be explained beside the action they block. */
export function roleChangeGuard(input: {
  target: RosterMember;
  nextRole: Role;
  activeAdmins: number;
}): Guard {
  if (input.target.role === "admin" && input.nextRole !== "admin") {
    if (input.activeAdmins <= 1) {
      return {
        allowed: false,
        reason: "A Workspace needs at least one active Admin.",
      };
    }
  }
  return OK;
}

export function deactivateGuard(input: {
  target: RosterMember;
  activeAdmins: number;
}): Guard {
  if (input.target.role === "admin" && input.activeAdmins <= 1) {
    return {
      allowed: false,
      reason: "The last active Admin cannot be deactivated.",
    };
  }
  return OK;
}

export function archiveGuard(input: {
  space: SpaceSummary;
  members: number;
}): Guard {
  if (input.members > 0) {
    return {
      allowed: false,
      reason: "Move its members out before archiving this Space.",
    };
  }
  return OK;
}

export function appointHeadGuard(input: {
  space: SpaceSummary;
  nextHeadName: string;
  currentHeadName?: string;
}): Guard {
  if (input.space.headMembershipId && input.currentHeadName) {
    return {
      allowed: true,
      reason: `This replaces ${input.currentHeadName} with ${input.nextHeadName}.`,
    };
  }
  return OK;
}

export function moveSpaceReason(target: RosterMember): string | null {
  return target.role === "admin"
    ? "An Admin belongs to no Space. Choose a role first."
    : "Their earlier Reports keep the Space they were written in.";
}
