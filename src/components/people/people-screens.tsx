"use client";

import {
  ArchiveIcon,
  CheckmarkCircle02Icon,
  PlusSignIcon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataPage } from "@/components/dashboard/page-wrappers";
import { useShell } from "@/components/dashboard/shell-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CO_LEAGUE_ROSTER,
  INVITATIONS,
  type Invitation,
  type RosterMember,
  SPACES,
  type SpaceSummary,
} from "@/data/members";
import { SAMPLE_NOW } from "@/data/reports";
import { ROLE_LABEL } from "@/data/viewer";
import { recordAudit } from "@/lib/audit";
import type { Role } from "@/lib/nav";
import {
  archiveGuard,
  deactivateGuard,
  expireInvitations,
  inviteRules,
  roleChangeGuard,
  seatUsage,
  spaceNameProblem,
  type Viewer,
} from "@/lib/people";
import { cn } from "@/lib/utils";

/* @info - Every control here is tidy, not a guard: the server repeats each rule. The
   disabled states carry their sentence so nobody is left guessing. */

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PersonAvatar({ name }: { name: string }) {
  return (
    <Avatar className="size-8 shrink-0 rounded-md shadow-none after:rounded-md">
      <AvatarFallback className="rounded-md bg-surface-muted text-[10.5px] font-medium text-ink/70">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

const ACTION_TONE = {
  neutral: "bg-surface-muted text-ink/75 hover:bg-surface-muted/70",
  danger: "bg-destructive/10 text-destructive hover:bg-destructive/15",
  success: "bg-success/10 text-success hover:bg-success/15",
  info: "bg-info/10 text-info hover:bg-info/15",
} as const;

function RowAction({
  tone,
  onClick,
  disabled,
  title,
  children,
}: {
  tone: keyof typeof ACTION_TONE;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "min-h-11 whitespace-nowrap rounded-md px-2 text-[11.5px] font-medium disabled:opacity-40 sm:min-h-8",
        ACTION_TONE[tone],
      )}
    >
      {children}
    </button>
  );
}

type Filter = "all" | "staff" | "head" | "admin" | "invited";

export function MembersScreen() {
  const { membership, workspace, user } = useShell();
  const viewer: Viewer = {
    membershipId: membership.id,
    role: membership.role,
    space: membership.space,
  };
  const rules = inviteRules(viewer);

  const [members, setMembers] = useState<RosterMember[]>(CO_LEAGUE_ROSTER);
  const [invitations, setInvitations] = useState<Invitation[]>(
    expireInvitations(INVITATIONS, SAMPLE_NOW),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [inviting, setInviting] = useState(false);
  const [moving, setMoving] = useState<RosterMember | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeAdmins = members.filter(
    (member) => member.role === "admin" && member.active,
  ).length;
  const pending = invitations.filter(
    (invitation) => !invitation.expired,
  ).length;
  const seats = seatUsage({
    memberLimit: workspace.memberLimit,
    members: members.filter((member) => member.active).length,
    invitations: pending,
  });

  const rows = useMemo(() => {
    const people = members.filter((member) => {
      if (filter === "all") return true;
      if (filter === "invited") return false;
      return member.role === filter;
    });
    const invites = filter === "all" || filter === "invited" ? invitations : [];
    return { people, invites };
  }, [filter, invitations, members]);

  const audit = (
    action: Parameters<typeof recordAudit>[2]["action"],
    target: string,
    summary: string,
  ) => {
    recordAudit(window.localStorage, membership.id, {
      at: SAMPLE_NOW,
      actorMembershipId: membership.id,
      action,
      target,
      summary,
    });
  };

  return (
    <DataPage>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            Members
          </h1>
          <p className="mt-1 text-[13px] text-ink/60">
            {members.filter((member) => member.active).length} active ·{" "}
            {seats.limit === null
              ? "no member limit on this plan"
              : `${seats.used} of ${seats.limit} seats used, pending invitations included`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={() => setInviting(true)}
            disabled={rules.roles.length === 0}
            className="min-h-11 gap-1.5 rounded-md bg-ink px-3 text-[13px] text-surface sm:min-h-9"
          >
            <HugeiconsIcon icon={UserAdd01Icon} className="size-4" />
            Invite members
          </Button>
          {rules.reason ? (
            <p className="max-w-[240px] text-right text-[11.5px] text-ink/50">
              {rules.reason}
            </p>
          ) : null}
        </div>
      </header>

      {seats.atLimit ? (
        <p className="mt-2 text-[12.5px] text-warning">
          This plan is full.{" "}
          <Link href="/dashboard/settings/billing" className="underline">
            Upgrade to add more people
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(
          [
            ["all", "All"],
            ["staff", "Staff"],
            ["head", "Heads"],
            ["admin", "Admins"],
            ["invited", "Invited"],
          ] as Array<[Filter, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={cn(
              "min-h-11 rounded-md border px-3 text-[12.5px] sm:min-h-9",
              filter === key
                ? "border-ink bg-ink text-surface"
                : "border-hairline text-ink/70 hover:bg-surface-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {notice ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
        <Table className="sm:table-fixed">
          <TableHeader className="bg-surface-muted">
            <TableRow className="border-hairline hover:bg-transparent">
              <TableHead className="h-9 text-[11.5px] text-ink/55 uppercase tracking-wide">
                Member
              </TableHead>
              <TableHead className="hidden h-9 w-[132px] text-[11.5px] text-ink/55 uppercase tracking-wide sm:table-cell">
                Role
              </TableHead>
              <TableHead className="h-9 w-auto text-right sm:w-[300px] text-[11.5px] text-ink/55 uppercase tracking-wide">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.people.map((member) => {
              const isSelf = member.membershipId === membership.id;
              const demote = roleChangeGuard({
                target: member,
                nextRole: member.role === "admin" ? "staff" : "admin",
                activeAdmins,
              });
              const deactivate = deactivateGuard({
                target: member,
                activeAdmins,
              });

              return (
                <TableRow key={member.membershipId} className="border-hairline">
                  <TableCell className="px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PersonAvatar name={member.name} />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] text-ink">
                          {member.name}
                          {isSelf ? (
                            <span className="ml-2 text-[11.5px] text-ink/45">
                              You
                            </span>
                          ) : null}
                          {member.active ? null : (
                            <span className="ml-2 text-[11.5px] text-ink/45">
                              Deactivated
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11.5px] text-ink/50">
                          {member.space ?? "No Space"}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden px-3.5 py-2.5 text-[12.5px] text-ink/70 sm:table-cell">
                    {ROLE_LABEL[member.role]}
                  </TableCell>

                  <TableCell className="px-3.5 py-2.5">
                    <div className="flex flex-wrap items-center justify-start gap-1 sm:justify-end">
                      <RowAction
                        tone="neutral"
                        disabled={member.role === "admin"}
                        title={
                          member.role === "admin"
                            ? "An Admin belongs to no Space."
                            : "Change the Space this person reports into."
                        }
                        onClick={() => setMoving(member)}
                      >
                        Change Space
                      </RowAction>

                      <RowAction
                        tone={member.role === "admin" ? "neutral" : "info"}
                        disabled={!demote.allowed}
                        title={demote.reason ?? undefined}
                        onClick={() => {
                          const nextRole: Role =
                            member.role === "admin" ? "staff" : "admin";
                          setMembers((current) =>
                            current.map((row) =>
                              row.membershipId === member.membershipId
                                ? {
                                    ...row,
                                    role: nextRole,
                                    space:
                                      nextRole === "admin" ? null : row.space,
                                  }
                                : row,
                            ),
                          );
                          audit(
                            "role.change",
                            member.membershipId,
                            `${ROLE_LABEL[member.role]} to ${ROLE_LABEL[nextRole]}`,
                          );
                          setNotice(
                            nextRole === "admin"
                              ? `${member.name} is now an Admin and belongs to no Space.`
                              : `${member.name} is now Staff.`,
                          );
                        }}
                      >
                        {member.role === "admin" ? "Make Staff" : "Make Admin"}
                      </RowAction>

                      <RowAction
                        tone={member.active ? "danger" : "success"}
                        disabled={!deactivate.allowed || isSelf}
                        title={
                          deactivate.reason ??
                          (isSelf
                            ? "You cannot deactivate yourself."
                            : undefined)
                        }
                        onClick={() => {
                          setMembers((current) =>
                            current.map((row) =>
                              row.membershipId === member.membershipId
                                ? { ...row, active: !row.active }
                                : row,
                            ),
                          );
                          audit(
                            member.active
                              ? "member.deactivated"
                              : "member.reactivated",
                            member.membershipId,
                            member.active ? "Deactivated" : "Reactivated",
                          );
                          setNotice(
                            member.active
                              ? `${member.name} was deactivated. Their Reports stay attributed.`
                              : `${member.name} is active again.`,
                          );
                        }}
                      >
                        {member.active ? "Deactivate" : "Reactivate"}
                      </RowAction>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {rows.invites.map((invitation) => (
              <TableRow
                key={invitation.id}
                className="border-hairline bg-surface-muted/30 hover:bg-surface-muted/40"
              >
                <TableCell className="px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border border-hairline border-dashed text-[11px] text-ink/45">
                      ?
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-ink">
                        {invitation.email}
                      </p>
                      <p className="truncate text-[11.5px] text-ink/50">
                        {invitation.expired
                          ? "Invitation expired"
                          : "Invited, 7 day window"}
                        {" · "}
                        {invitation.space ?? "No Space"}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden px-3.5 py-2.5 text-[12.5px] text-ink/70 sm:table-cell">
                  {ROLE_LABEL[invitation.role]}
                </TableCell>

                <TableCell className="px-3.5 py-2.5">
                  <div className="flex items-center justify-end">
                    <RowAction
                      tone="danger"
                      onClick={() => {
                        setInvitations((current) =>
                          current.filter((row) => row.id !== invitation.id),
                        );
                        audit("invitation.revoked", invitation.id, "Revoked");
                        setNotice(
                          `Invitation to ${invitation.email} revoked. Its seat is free.`,
                        );
                      }}
                    >
                      Revoke
                    </RowAction>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {rows.people.length === 0 && rows.invites.length === 0 ? (
              <TableRow className="border-hairline hover:bg-transparent">
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-[13px] text-ink/60"
                >
                  Nobody matches this filter.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              {seats.limit === null
                ? "This plan has no member limit."
                : `${seats.used} of ${seats.limit} seats are used, pending invitations included.`}
            </DialogDescription>
          </DialogHeader>
          <InviteForm
            roles={rules.roles}
            fixedSpace={rules.fixedSpace}
            atLimit={seats.atLimit}
            requester={user.name}
            onInvite={(email, role) => {
              setInvitations((current) => [
                {
                  id: `inv_${current.length + 3}`,
                  email,
                  role,
                  space:
                    rules.fixedSpace ?? (role === "admin" ? null : "Platform"),
                  sentAt: SAMPLE_NOW,
                  invitedByMembershipId: membership.id,
                  expired: false,
                },
                ...current,
              ]);
              audit("invitation.sent", email, `${ROLE_LABEL[role]} invitation`);
              setInviting(false);
              setNotice(
                `Invitation sent to ${email}. It expires in seven days.`,
              );
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={moving !== null}
        onOpenChange={(open) => !open && setMoving(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Space</DialogTitle>
            <DialogDescription>
              This moves {moving?.name} into another Space. It is not a transfer
              of their Reports: everything they already wrote stays in{" "}
              {moving?.space ?? "no Space"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            {SPACES.filter((space) => !space.archived).map((space) => (
              <button
                key={space.id}
                type="button"
                aria-pressed={moving?.space === space.name}
                onClick={() => {
                  if (!moving) return;
                  setMembers((current) =>
                    current.map((row) =>
                      row.membershipId === moving.membershipId
                        ? { ...row, space: space.name }
                        : row,
                    ),
                  );
                  audit(
                    "space.change",
                    moving.membershipId,
                    `${moving.space} to ${space.name}`,
                  );
                  setNotice(
                    `${moving.name} now reports into ${space.name}. Earlier Reports stay where they were written.`,
                  );
                  setMoving(null);
                }}
                className={cn(
                  "min-h-11 rounded-md border px-3 text-left text-[13px]",
                  moving?.space === space.name
                    ? "border-ink bg-surface-muted text-ink"
                    : "border-hairline text-ink/75 hover:bg-surface-muted",
                )}
              >
                {space.name}
                {space.headMembershipId ? null : (
                  <span className="ml-2 text-[11.5px] text-ink/45">
                    No Head
                  </span>
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMoving(null)}
              className="min-h-11 rounded-md px-3 text-[13px]"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataPage>
  );
}

function InviteForm({
  roles,
  fixedSpace,
  atLimit,
  requester,
  onInvite,
}: {
  roles: Role[];
  fixedSpace: string | null;
  atLimit: boolean;
  requester: string;
  onInvite: (email: string, role: Role) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(roles[0] ?? "staff");
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <>
      <label className="block text-[12px] text-ink/60" htmlFor="invite-email">
        Email address
      </label>
      <input
        id="invite-email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="name@example.com"
        className="min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
      />

      <div>
        <p className="text-[12px] text-ink/60">Role</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {roles.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={role === option}
              onClick={() => setRole(option)}
              className={cn(
                "min-h-11 rounded-md border px-3 text-[12.5px]",
                role === option
                  ? "border-ink bg-ink text-surface"
                  : "border-hairline text-ink/70",
              )}
            >
              {ROLE_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-ink/50">
        {fixedSpace
          ? `A Head of Space invites Staff into ${fixedSpace} only.`
          : `${requester} is inviting. The invitation expires in seven days.`}
      </p>

      {problem ? (
        <p className="text-[12.5px] text-destructive">{problem}</p>
      ) : null}

      <DialogFooter>
        <Button
          disabled={atLimit}
          onClick={() => {
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
              setProblem("Enter an email address.");
              return;
            }
            onInvite(email.trim(), role);
          }}
          className="min-h-11 rounded-md bg-ink px-3 text-[13px] text-surface"
        >
          {atLimit ? "Plan is full" : "Send invitation"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function SpacesScreen() {
  const { membership } = useShell();
  const [spaces, setSpaces] = useState<SpaceSummary[]>(SPACES);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <DataPage>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            Spaces
          </h1>
          <p className="mt-1 text-[13px] text-ink/60">
            Each Space reports on its own. A Space with no Head sends its
            Reports to Admins.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="min-h-11 gap-1.5 rounded-md bg-ink px-3 text-[13px] text-surface sm:min-h-9"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
          Create space
        </Button>
      </header>

      {notice ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {spaces.map((space) => {
          const membersHere = CO_LEAGUE_ROSTER.filter(
            (member) => member.space === space.name && member.active,
          );
          const head = CO_LEAGUE_ROSTER.find(
            (member) => member.membershipId === space.headMembershipId,
          );
          const archive = archiveGuard({ space, members: membersHere.length });

          return (
            <section
              key={space.id}
              className={cn(
                "rounded-lg border border-hairline p-4",
                space.archived && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-medium text-[14px] text-ink">
                    <Link
                      href={`/dashboard/spaces/${space.id}`}
                      className="hover:underline"
                    >
                      {space.name}
                    </Link>
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-ink/50">
                    {head ? (
                      <>
                        <PersonAvatar name={head.name} />
                        {head.name}
                      </>
                    ) : (
                      "No Head, reviewed by Admins"
                    )}
                  </p>
                </div>
                {space.archived ? (
                  <span className="rounded-md border border-hairline px-2 py-0.5 text-[11px] text-ink/50">
                    Archived
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-[12.5px] text-ink/60">
                {membersHere.length}{" "}
                {membersHere.length === 1 ? "member" : "members"}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <RowAction
                  tone="neutral"
                  disabled={space.archived || !archive.allowed}
                  title={archive.reason ?? undefined}
                  onClick={() => {
                    setSpaces((current) =>
                      current.map((row) =>
                        row.id === space.id ? { ...row, archived: true } : row,
                      ),
                    );
                    recordAudit(window.localStorage, membership.id, {
                      at: SAMPLE_NOW,
                      actorMembershipId: membership.id,
                      action: "space.archived",
                      target: space.id,
                      summary: `${space.name} archived`,
                    });
                    setNotice(
                      `${space.name} archived. Its Reports stay readable.`,
                    );
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <HugeiconsIcon icon={ArchiveIcon} className="size-3.5" />
                    Archive
                  </span>
                </RowAction>
                {space.archived ? (
                  <RowAction
                    tone="success"
                    onClick={() => {
                      setSpaces((current) =>
                        current.map((row) =>
                          row.id === space.id
                            ? { ...row, archived: false }
                            : row,
                        ),
                      );
                      setNotice(`${space.name} restored.`);
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        className="size-3.5"
                      />
                      Restore
                    </span>
                  </RowAction>
                ) : null}
              </div>
              {archive.allowed || space.archived ? null : (
                <p className="mt-2 text-[11.5px] text-ink/45">
                  {archive.reason}
                </p>
              )}
            </section>
          );
        })}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create space</DialogTitle>
            <DialogDescription>
              A Space groups the people who report together. Naming a Head is
              optional: without one, its Reports go to the Workspace Admins.
            </DialogDescription>
          </DialogHeader>
          <CreateSpaceForm
            spaces={spaces}
            onCreate={(name, headMembershipId) => {
              setSpaces((current) => [
                ...current,
                {
                  id: `sp_${current.length + 1}`,
                  name,
                  headMembershipId,
                  archived: false,
                  kpiTemplate: [],
                },
              ]);
              recordAudit(window.localStorage, membership.id, {
                at: SAMPLE_NOW,
                actorMembershipId: membership.id,
                action: "space.created",
                target: name,
                summary: `${name} created`,
              });
              setCreating(false);
              setNotice(
                headMembershipId
                  ? `${name} created with its Head.`
                  : `${name} created. Appoint a Head so its Reports have an owner.`,
              );
            }}
          />
        </DialogContent>
      </Dialog>
    </DataPage>
  );
}

function CreateSpaceForm({
  spaces,
  onCreate,
}: {
  spaces: SpaceSummary[];
  onCreate: (name: string, headMembershipId: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [head, setHead] = useState<string>("");
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <>
      <label className="block text-[12px] text-ink/60" htmlFor="space-name">
        Space name
      </label>
      <input
        id="space-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Logistics"
        className="min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
      />

      <div>
        <label className="block text-[12px] text-ink/60" htmlFor="space-head">
          Head of Space <span className="text-ink/40">(optional)</span>
        </label>
        <select
          id="space-head"
          value={head}
          onChange={(event) => setHead(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
        >
          <option value="">No Head for now</option>
          {CO_LEAGUE_ROSTER.filter(
            (member) => member.active && member.role !== "admin",
          ).map((member) => (
            <option key={member.membershipId} value={member.membershipId}>
              {member.name} ({ROLE_LABEL[member.role]}
              {member.space ? `, ${member.space}` : ""})
            </option>
          ))}
        </select>
      </div>

      {problem ? (
        <p className="text-[12.5px] text-destructive">{problem}</p>
      ) : null}

      <DialogFooter>
        <Button
          onClick={() => {
            const nameError = spaceNameProblem(name, spaces);
            if (nameError) {
              setProblem(nameError);
              return;
            }
            onCreate(name.trim(), head === "" ? null : head);
          }}
          className="min-h-11 rounded-md bg-ink px-3 text-[13px] text-surface"
        >
          Create space
        </Button>
      </DialogFooter>
    </>
  );
}
