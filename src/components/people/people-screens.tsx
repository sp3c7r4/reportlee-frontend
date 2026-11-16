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
import {
  ListSkeleton,
  LoadError,
  useApiLoad,
} from "@/components/people/use-api-load";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SAMPLE_NOW } from "@/data/reports";
import { ROLE_LABEL } from "@/data/viewer";
import type {
  ApiInvitation,
  ApiMember,
  ApiSpace,
  CreatedInvitation,
} from "@/lib/api-types";
import { recordAudit } from "@/lib/audit";
import {
  createInvitations,
  listInvitations,
  revokeInvitation,
} from "@/lib/invitations";
import { listMembers, type MemberPatch, updateMember } from "@/lib/members";
import type { Role } from "@/lib/nav";
import {
  archiveGuard,
  deactivateGuard,
  inviteRules,
  roleChangeGuard,
  seatUsage,
  spaceNameProblem,
  type Viewer,
} from "@/lib/people";
import { createSpace, listSpaces, updateSpace } from "@/lib/spaces-api";
import { cn } from "@/lib/utils";

/* @info - Every control here is tidy, not a guard: the server repeats each rule and its
   409 and 422 answers are shown as they come. The disabled states carry their sentence
   so nobody is left guessing. */

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

const NO_INVITATIONS: ApiInvitation[] = [];

export function MembersScreen() {
  const { membership, workspace } = useShell();
  const isAdmin = membership.role === "admin";
  const canInvite = membership.role !== "staff";
  const viewer: Viewer = {
    membershipId: membership.id,
    role: membership.role,
    space: membership.space,
  };
  const rules = inviteRules(viewer);

  const members = useApiLoad(
    () => listMembers(workspace.id),
    `members:${workspace.id}`,
  );
  const invitations = useApiLoad(
    () =>
      canInvite
        ? listInvitations(workspace.id)
        : Promise.resolve({
            ok: true as const,
            status: 200,
            data: NO_INVITATIONS,
          }),
    `invitations:${workspace.id}:${canInvite}`,
  );
  const spaces = useApiLoad(
    () =>
      isAdmin
        ? listSpaces(workspace.id)
        : Promise.resolve({
            ok: true as const,
            status: 200,
            data: [] as ApiSpace[],
          }),
    `spaces:${workspace.id}:${isAdmin}`,
  );

  const [filter, setFilter] = useState<Filter>("all");
  const [inviting, setInviting] = useState(false);
  const [moving, setMoving] = useState<{
    member: ApiMember;
    makeStaff: boolean;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const roster = members.value.state === "ready" ? members.value.data : [];
  const pendingList =
    invitations.value.state === "ready" ? invitations.value.data : [];
  const spaceList = spaces.value.state === "ready" ? spaces.value.data : [];

  const activeMembers = roster.filter((member) => member.active);
  const activeAdmins = activeMembers.filter(
    (member) => member.role === "admin",
  ).length;
  const seats = seatUsage({
    memberLimit: workspace.memberLimit,
    members: activeMembers.length,
    invitations: pendingList.filter((invitation) => !invitation.expired).length,
  });

  const rows = useMemo(() => {
    const people = roster.filter((member) => {
      if (filter === "all") return true;
      if (filter === "invited") return false;
      return member.role === filter;
    });
    const invites =
      filter === "all" || filter === "invited" ? pendingList : NO_INVITATIONS;
    return { people, invites };
  }, [filter, pendingList, roster]);

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

  async function change(
    member: ApiMember,
    patch: MemberPatch,
    done: string,
    action: Parameters<typeof recordAudit>[2]["action"],
    summary: string,
  ) {
    setBusy(member.membershipId);
    setRowErrors((current) => ({ ...current, [member.membershipId]: "" }));
    const result = await updateMember(workspace.id, member.membershipId, patch);
    setBusy(null);
    if (!result.ok) {
      // The server's word is the rule. Show it on the row and refetch the roster.
      setRowErrors((current) => ({
        ...current,
        [member.membershipId]: result.message,
      }));
      members.reload();
      return;
    }
    members.update((list) =>
      list.map((row) =>
        row.membershipId === member.membershipId ? result.data : row,
      ),
    );
    audit(action, member.membershipId, summary);
    setNotice(done);
    setMoving(null);
  }

  async function revoke(invitation: ApiInvitation) {
    const result = await revokeInvitation(workspace.id, invitation.id);
    if (!result.ok && result.status !== 404) {
      setNotice(result.message);
      return;
    }
    // A 404 means it is already gone: refetch quietly rather than complain.
    invitations.reload();
    if (result.ok) {
      audit("invitation.revoked", invitation.id, "Revoked");
      setNotice(`Invitation to ${invitation.email} revoked. Its seat is free.`);
    }
  }

  const loading =
    members.value.state === "loading" || invitations.value.state === "loading";
  const alone =
    members.value.state === "ready" &&
    activeMembers.length <= 1 &&
    pendingList.length === 0;

  return (
    <DataPage>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
            Members
          </h1>
          {members.value.state === "ready" ? (
            <p className="mt-1 text-[13px] text-ink/60">
              {activeMembers.length} active
              {isAdmin
                ? ` · ${
                    seats.limit === null
                      ? "no member limit on this plan"
                      : `${seats.used} of ${seats.limit} seats used, pending invitations included`
                  }`
                : ""}
            </p>
          ) : null}
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

      {isAdmin && seats.atLimit ? (
        <p className="mt-2 text-[12.5px] text-warning">
          This plan is full.{" "}
          <Link href="/dashboard/settings/billing" className="underline">
            Upgrade to add more people
          </Link>
          .
        </p>
      ) : null}

      {members.value.state === "error" ? (
        <LoadError
          status={members.value.status}
          message={members.value.message}
          onRetry={() => {
            members.reload(true);
            invitations.reload();
          }}
        />
      ) : null}

      {loading && members.value.state !== "error" ? <ListSkeleton /> : null}

      {invitations.value.state === "error" &&
      members.value.state === "ready" ? (
        <p role="alert" className="mt-3 text-[12.5px] text-destructive">
          We could not load the invitations.{" "}
          <button
            type="button"
            onClick={() => invitations.reload(true)}
            className="underline"
          >
            Retry
          </button>
        </p>
      ) : null}

      {members.value.state === "ready" &&
      invitations.value.state !== "loading" ? (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["staff", "Staff"],
                ["head", "Heads"],
                ["admin", "Admins"],
                ["invited", "Invited"],
              ] as Array<[Filter, string]>
            )
              .filter(([key]) => key !== "invited" || canInvite)
              .map(([key, label]) => (
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

          {isAdmin ? null : (
            <p className="mt-3 text-[12px] text-ink/50">
              Only an Admin can change roles, Spaces or access.
            </p>
          )}

          {notice ? (
            <output className="block mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
              {notice}
            </output>
          ) : null}

          {alone ? (
            <div className="mt-4 rounded-lg border border-hairline border-dashed p-6 text-center">
              <p className="text-[13.5px] text-ink">
                You are the only member. Invite your team.
              </p>
              {canInvite ? (
                <Button
                  onClick={() => setInviting(true)}
                  className="mt-3 min-h-11 rounded-md bg-ink px-3 text-[13px] text-surface sm:min-h-9"
                >
                  Invite members
                </Button>
              ) : null}
            </div>
          ) : (
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
                    {isAdmin ? (
                      <TableHead className="h-9 w-auto text-right sm:w-[300px] text-[11.5px] text-ink/55 uppercase tracking-wide">
                        Actions
                      </TableHead>
                    ) : null}
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
                    const working = busy === member.membershipId;

                    return (
                      <TableRow
                        key={member.membershipId}
                        className="border-hairline"
                      >
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
                                {member.email ? `${member.email} · ` : ""}
                                {member.space ?? "No Space"}
                              </p>
                              {rowErrors[member.membershipId] ? (
                                <p
                                  role="alert"
                                  className="mt-0.5 text-[11.5px] text-destructive"
                                >
                                  {rowErrors[member.membershipId]}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden px-3.5 py-2.5 text-[12.5px] text-ink/70 sm:table-cell">
                          {ROLE_LABEL[member.role]}
                        </TableCell>

                        {isAdmin ? (
                          <TableCell className="px-3.5 py-2.5">
                            <div className="flex flex-wrap items-center justify-start gap-1 sm:justify-end">
                              <RowAction
                                tone="neutral"
                                disabled={working || member.role === "admin"}
                                title={
                                  member.role === "admin"
                                    ? "An Admin belongs to no Space."
                                    : "Change the Space this person reports into."
                                }
                                onClick={() =>
                                  setMoving({ member, makeStaff: false })
                                }
                              >
                                Change Space
                              </RowAction>

                              <RowAction
                                tone={
                                  member.role === "admin" ? "neutral" : "info"
                                }
                                disabled={working || !demote.allowed}
                                title={demote.reason ?? undefined}
                                onClick={() => {
                                  if (member.role === "admin") {
                                    // Staff must belong to a Space, so pick one first.
                                    setMoving({ member, makeStaff: true });
                                    return;
                                  }
                                  void change(
                                    member,
                                    { role: "admin" },
                                    `${member.name} is now an Admin and belongs to no Space.`,
                                    "role.change",
                                    `${ROLE_LABEL[member.role]} to ${ROLE_LABEL.admin}`,
                                  );
                                }}
                              >
                                {member.role === "admin"
                                  ? "Make Staff"
                                  : "Make Admin"}
                              </RowAction>

                              <RowAction
                                tone={member.active ? "danger" : "success"}
                                disabled={
                                  working || !deactivate.allowed || isSelf
                                }
                                title={
                                  deactivate.reason ??
                                  (isSelf
                                    ? "You cannot deactivate yourself."
                                    : undefined)
                                }
                                onClick={() =>
                                  void change(
                                    member,
                                    { active: !member.active },
                                    member.active
                                      ? `${member.name} was deactivated. Their Reports stay attributed.`
                                      : `${member.name} is active again.`,
                                    member.active
                                      ? "member.deactivated"
                                      : "member.reactivated",
                                    member.active
                                      ? "Deactivated"
                                      : "Reactivated",
                                  )
                                }
                              >
                                {member.active ? "Deactivate" : "Reactivate"}
                              </RowAction>
                            </div>
                          </TableCell>
                        ) : null}
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

                      {isAdmin ? (
                        <TableCell className="px-3.5 py-2.5">
                          <div className="flex items-center justify-end">
                            <RowAction
                              tone="danger"
                              onClick={() => void revoke(invitation)}
                            >
                              Revoke
                            </RowAction>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}

                  {rows.people.length === 0 && rows.invites.length === 0 ? (
                    <TableRow className="border-hairline hover:bg-transparent">
                      <TableCell
                        colSpan={isAdmin ? 3 : 2}
                        className="py-6 text-center text-[13px] text-ink/60"
                      >
                        Nobody matches this filter.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      ) : null}

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              {isAdmin
                ? seats.limit === null
                  ? "This plan has no member limit."
                  : `${seats.used} of ${seats.limit} seats are used, pending invitations included.`
                : "The invitation expires in seven days."}
            </DialogDescription>
          </DialogHeader>
          <InviteForm
            key={inviting ? "open" : "closed"}
            roles={rules.roles}
            fixedSpace={
              rules.fixedSpace && membership.spaceId
                ? { id: membership.spaceId, name: rules.fixedSpace }
                : null
            }
            spaces={spaceList.filter((space) => !space.archived)}
            atLimit={isAdmin && seats.atLimit}
            onSend={(row) =>
              createInvitations(workspace.id, [row]).then((result) => {
                if (result.ok) {
                  audit(
                    "invitation.sent",
                    row.email,
                    `${ROLE_LABEL[row.role]} invitation`,
                  );
                  invitations.reload();
                }
                return result;
              })
            }
            onDone={() => setInviting(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={moving !== null}
        onOpenChange={(open) => !open && setMoving(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {moving?.makeStaff ? "Make Staff" : "Change Space"}
            </DialogTitle>
            <DialogDescription>
              {moving?.makeStaff
                ? `Staff belong to a Space. Choose where ${moving.member.name} reports.`
                : `This moves ${moving?.member.name} into another Space. It is not a transfer of their Reports: everything they already wrote stays in ${moving?.member.space ?? "no Space"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            {spaceList
              .filter((space) => !space.archived)
              .map((space) => (
                <button
                  key={space.id}
                  type="button"
                  aria-pressed={moving?.member.spaceId === space.id}
                  onClick={() => {
                    if (!moving) return;
                    const { member, makeStaff } = moving;
                    void change(
                      member,
                      makeStaff
                        ? { role: "staff", spaceId: space.id }
                        : { spaceId: space.id },
                      makeStaff
                        ? `${member.name} is now Staff in ${space.name}.`
                        : `${member.name} now reports into ${space.name}. Earlier Reports stay where they were written.`,
                      makeStaff ? "role.change" : "space.change",
                      makeStaff
                        ? `${ROLE_LABEL.admin} to ${ROLE_LABEL.staff}`
                        : `${member.space} to ${space.name}`,
                    );
                  }}
                  className={cn(
                    "min-h-11 rounded-md border px-3 text-left text-[13px]",
                    moving?.member.spaceId === space.id
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
            {spaceList.filter((space) => !space.archived).length === 0 ? (
              <p className="text-[12.5px] text-ink/60">
                There are no Spaces yet. Create one first.
              </p>
            ) : null}
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

type InviteSend = (row: {
  email: string;
  role: Role;
  spaceId?: string | null;
}) => ReturnType<typeof createInvitations>;

function InviteForm({
  roles,
  fixedSpace,
  spaces,
  atLimit,
  onSend,
  onDone,
}: {
  roles: Role[];
  fixedSpace: { id: string; name: string } | null;
  spaces: ApiSpace[];
  atLimit: boolean;
  onSend: InviteSend;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(roles[0] ?? "staff");
  const [spaceId, setSpaceId] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [emailProblem, setEmailProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  const needsSpace = role !== "admin" && fixedSpace === null;
  const chosenSpace = spaceId || spaces[0]?.id || "";

  async function send() {
    setProblem(null);
    setEmailProblem(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setEmailProblem("Enter an email address.");
      return;
    }
    if (needsSpace && !chosenSpace) {
      setProblem("Create a Space first, so they have somewhere to join.");
      return;
    }
    setSending(true);
    const result = await onSend({
      email: email.trim(),
      role,
      ...(fixedSpace
        ? { spaceId: fixedSpace.id }
        : needsSpace
          ? { spaceId: chosenSpace }
          : {}),
    });
    setSending(false);
    if (!result.ok) {
      const field = result.fields?.["invitations.0.email"];
      if (field) setEmailProblem(field);
      else setProblem(result.message);
      return;
    }
    setCreated(result.data[0] ?? null);
  }

  if (created) {
    return (
      <>
        <output className="block text-[13px] text-ink">
          Invitation sent to {created.email}. It expires in seven days.
        </output>
        <p className="text-[12px] text-ink/50">
          Copy the link now if you want to share it yourself. It is not shown
          again.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(created.inviteUrl);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            className="min-h-11 rounded-md px-3 text-[13px]"
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            onClick={onDone}
            className="min-h-11 rounded-md bg-ink px-3 text-[13px] text-surface"
          >
            Done
          </Button>
        </DialogFooter>
      </>
    );
  }

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
        aria-invalid={emailProblem ? true : undefined}
        className="min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
      />
      {emailProblem ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {emailProblem}
        </p>
      ) : null}

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

      {needsSpace ? (
        <div>
          <label
            className="block text-[12px] text-ink/60"
            htmlFor="invite-space"
          >
            Space
          </label>
          <select
            id="invite-space"
            value={chosenSpace}
            onChange={(event) => setSpaceId(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
          >
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <p className="text-[12px] text-ink/50">
        {fixedSpace
          ? `A Head of Space invites Staff into ${fixedSpace.name} only.`
          : "The invitation expires in seven days."}
      </p>

      {problem ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {problem}
        </p>
      ) : null}

      <DialogFooter>
        <Button
          disabled={atLimit || sending}
          onClick={() => void send()}
          className="min-h-11 rounded-md bg-ink px-3 text-[13px] text-surface"
        >
          {atLimit ? "Plan is full" : sending ? "Sending" : "Send invitation"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function SpacesScreen() {
  const { membership, workspace } = useShell();
  const isAdmin = membership.role === "admin";
  const spaces = useApiLoad(
    () => listSpaces(workspace.id),
    `spaces:${workspace.id}`,
  );
  const members = useApiLoad(
    () => listMembers(workspace.id),
    `members:${workspace.id}`,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const list = spaces.value.state === "ready" ? spaces.value.data : [];
  const roster = members.value.state === "ready" ? members.value.data : [];

  async function setArchived(space: ApiSpace, archived: boolean) {
    setBusy(space.id);
    const result = await updateSpace(workspace.id, space.id, { archived });
    setBusy(null);
    if (!result.ok) {
      setNotice(result.message);
      spaces.reload();
      return;
    }
    spaces.update((current) =>
      current.map((row) => (row.id === space.id ? result.data : row)),
    );
    if (archived) {
      recordAudit(window.localStorage, membership.id, {
        at: SAMPLE_NOW,
        actorMembershipId: membership.id,
        action: "space.archived",
        target: space.id,
        summary: `${space.name} archived`,
      });
    }
    setNotice(
      archived
        ? `${space.name} archived. Its Reports stay readable.`
        : `${space.name} restored.`,
    );
  }

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
        {isAdmin ? (
          <Button
            onClick={() => setCreating(true)}
            className="min-h-11 gap-1.5 rounded-md bg-ink px-3 text-[13px] text-surface sm:min-h-9"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            Create space
          </Button>
        ) : null}
      </header>

      {spaces.value.state === "loading" ? <ListSkeleton rows={3} /> : null}
      {spaces.value.state === "error" ? (
        <LoadError
          status={spaces.value.status}
          message={spaces.value.message}
          onRetry={() => {
            spaces.reload(true);
            members.reload();
          }}
        />
      ) : null}

      {notice ? (
        <output className="block mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          {notice}
        </output>
      ) : null}

      {spaces.value.state === "ready" && list.length === 0 ? (
        <div className="mt-4 rounded-lg border border-hairline border-dashed p-6 text-center">
          <p className="text-[13.5px] text-ink">No Spaces yet.</p>
          {isAdmin ? (
            <Button
              onClick={() => setCreating(true)}
              className="mt-3 min-h-11 rounded-md bg-ink px-3 text-[13px] text-surface sm:min-h-9"
            >
              Create space
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((space) => {
          const head = roster.find(
            (member) => member.membershipId === space.headMembershipId,
          );
          const archive = archiveGuard({ space, members: space.memberCount });

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
                {space.memberCount}{" "}
                {space.memberCount === 1 ? "member" : "members"}
              </p>

              {isAdmin ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <RowAction
                      tone="neutral"
                      disabled={
                        space.archived || !archive.allowed || busy === space.id
                      }
                      title={archive.reason ?? undefined}
                      onClick={() => void setArchived(space, true)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon
                          icon={ArchiveIcon}
                          className="size-3.5"
                        />
                        Archive
                      </span>
                    </RowAction>
                    {space.archived ? (
                      <RowAction
                        tone="success"
                        disabled={busy === space.id}
                        onClick={() => void setArchived(space, false)}
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
                </>
              ) : null}
            </section>
          );
        })}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create space</DialogTitle>
            <DialogDescription>
              A Space groups the people who report together. Move people in from
              Members, then appoint a Head from the Space page. Until then, its
              Reports go to the Workspace Admins.
            </DialogDescription>
          </DialogHeader>
          <CreateSpaceForm
            key={creating ? "open" : "closed"}
            spaces={list}
            onCreate={async (name) => {
              const result = await createSpace(workspace.id, name);
              if (!result.ok) return result.message;
              spaces.update((current) => [...current, result.data]);
              recordAudit(window.localStorage, membership.id, {
                at: SAMPLE_NOW,
                actorMembershipId: membership.id,
                action: "space.created",
                target: name,
                summary: `${name} created`,
              });
              setCreating(false);
              setNotice(
                `${name} created. Appoint a Head so its Reports have an owner.`,
              );
              return null;
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
  spaces: ApiSpace[];
  /** Resolves to the server's message when it refused, or null when it worked. */
  onCreate: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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

      {problem ? (
        <p role="alert" className="text-[12.5px] text-destructive">
          {problem}
        </p>
      ) : null}

      <DialogFooter>
        <Button
          disabled={sending}
          onClick={async () => {
            const nameError = spaceNameProblem(name, spaces);
            if (nameError) {
              setProblem(nameError);
              return;
            }
            setSending(true);
            const refused = await onCreate(name.trim());
            setSending(false);
            setProblem(refused);
          }}
          className="min-h-11 rounded-md bg-ink px-3 text-[13px] text-surface"
        >
          {sending ? "Creating" : "Create space"}
        </Button>
      </DialogFooter>
    </>
  );
}
