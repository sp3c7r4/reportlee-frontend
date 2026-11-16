"use client";

import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { use, useState } from "react";
import { DataPage } from "@/components/dashboard/page-wrappers";
import { useShell } from "@/components/dashboard/shell-context";
import {
  ListSkeleton,
  LoadError,
  useApiLoad,
} from "@/components/people/use-api-load";
import { Button } from "@/components/ui/button";
import type { KpiTemplateField } from "@/data/reports";
import { SAMPLE_NOW } from "@/data/reports";
import { ROLE_LABEL } from "@/data/viewer";
import type { ApiSpace } from "@/lib/api-types";
import { recordAudit } from "@/lib/audit";
import { listMembers } from "@/lib/members";
import { spaceNameProblem } from "@/lib/people";
import { canEditTemplate, mySpace, spaceById } from "@/lib/spaces";
import { listSpaces, updateSpace } from "@/lib/spaces-api";
import { cn } from "@/lib/utils";

/* @info - One Space, three tabs. Reports are not part of this slice, so every figure
   that needs them reads "Not available yet" rather than a sample number. */

type Tab = "reports" | "members" | "template";

const TABS: Array<[Tab, string]> = [
  ["reports", "Reports"],
  ["members", "Members"],
  ["template", "KPI template"],
];

const NOT_YET = "Not available yet";

export function SpaceScreen({ id }: { id: string }) {
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

  const [tab, setTab] = useState<Tab>("reports");
  const [notice, setNotice] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (spaces.value.state === "loading" || members.value.state === "loading") {
    return (
      <DataPage>
        <ListSkeleton rows={3} />
      </DataPage>
    );
  }
  if (spaces.value.state === "error") {
    return (
      <DataPage>
        <LoadError
          status={spaces.value.status}
          message={spaces.value.message}
          onRetry={() => {
            spaces.reload(true);
            members.reload(true);
          }}
        />
      </DataPage>
    );
  }
  if (members.value.state === "error") {
    return (
      <DataPage>
        <LoadError
          status={members.value.status}
          message={members.value.message}
          onRetry={() => {
            spaces.reload(true);
            members.reload(true);
          }}
        />
      </DataPage>
    );
  }

  const space = spaceById(spaces.value.data, id);
  if (!space) {
    return (
      <DataPage>
        <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
          That Space could not be found.
        </h1>
        <p className="mt-2 text-[13px] text-ink/60">
          It may have been archived.{" "}
          <Link href="/dashboard/spaces" className="underline">
            Back to Spaces
          </Link>
        </p>
      </DataPage>
    );
  }

  const here = members.value.data.filter(
    (member) => member.spaceId === space.id,
  );
  const head = members.value.data.find(
    (member) => member.membershipId === space.headMembershipId,
  );
  const guard = canEditTemplate(
    {
      membershipId: membership.id,
      role: membership.role,
      space: membership.space,
    },
    space,
  );

  async function apply(
    patch: Parameters<typeof updateSpace>[2],
    done: string,
  ): Promise<string | null> {
    if (!space) return null;
    setBusy(true);
    const result = await updateSpace(workspace.id, space.id, patch);
    setBusy(false);
    if (!result.ok) {
      setNotice(result.message);
      spaces.reload();
      return result.message;
    }
    spaces.update((current) =>
      current.map((row) => (row.id === space.id ? result.data : row)),
    );
    // A Head change flips two roles, so the roster is read again.
    if ("headMembershipId" in patch) members.reload();
    recordAudit(window.localStorage, membership.id, {
      at: SAMPLE_NOW,
      actorMembershipId: membership.id,
      action: "settings.change",
      target: space.id,
      summary: done,
    });
    setNotice(done);
    return null;
  }

  return (
    <DataPage>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
              {space.name}
            </h1>
            {space.archived ? (
              <span className="rounded-md border border-hairline px-2 py-0.5 text-[11px] text-ink/50">
                Archived
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-ink/60">
            {head
              ? `Head of Space: ${head.name}`
              : "No Head, reviewed by Workspace Admins"}{" "}
            · {space.memberCount}{" "}
            {space.memberCount === 1 ? "member" : "members"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <Button
              variant="outline"
              onClick={() => setRenaming(space.name)}
              className="min-h-11 rounded-md px-3 text-[12.5px] sm:min-h-9"
            >
              Rename
            </Button>
          ) : null}
          <Link
            href="/dashboard/spaces"
            className="min-h-11 rounded-md border border-hairline px-3 text-[12.5px] text-ink/70 leading-[2.75] hover:bg-surface-muted sm:min-h-9 sm:leading-[2.25]"
          >
            All Spaces
          </Link>
        </div>
      </header>

      {renaming !== null ? (
        <RenameForm
          value={renaming}
          others={spaces.value.data.filter((row) => row.id !== space.id)}
          busy={busy}
          onChange={setRenaming}
          onCancel={() => setRenaming(null)}
          onSave={async (name) => {
            const refused = await apply({ name }, `${name} renamed`);
            if (!refused) setRenaming(null);
            return refused;
          }}
        />
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Submitted this period", "Pending review", "Approved", "Missing"].map(
          (label) => (
            <div
              key={label}
              className="rounded-lg border border-hairline px-3 py-2"
            >
              <dt className="text-[11.5px] text-ink/50 uppercase tracking-wide">
                {label}
              </dt>
              <dd className="mt-0.5 text-[13px] text-ink/60">{NOT_YET}</dd>
            </div>
          ),
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "min-h-11 rounded-md border px-3 text-[12.5px] sm:min-h-9",
              tab === key
                ? "border-ink bg-ink text-surface"
                : "border-hairline text-ink/70 hover:bg-surface-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {notice ? (
        <output className="block mt-3 rounded-md border border-hairline bg-surface-muted px-3 py-2 text-[12.5px] text-ink">
          {notice}
        </output>
      ) : null}

      {tab === "reports" ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
          <div className="bg-surface-muted px-3.5 py-2 font-medium text-[11.5px] text-ink/55 uppercase tracking-wide">
            Reports in {space.name}
          </div>
          <p className="border-hairline border-t px-3.5 py-6 text-center text-[13px] text-ink/60">
            {NOT_YET}
          </p>
        </div>
      ) : null}

      {tab === "members" ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-hairline">
          <div className="bg-surface-muted px-3.5 py-2 font-medium text-[11.5px] text-ink/55 uppercase tracking-wide">
            Members of {space.name}
          </div>
          {here.map((member) => {
            const isHead = member.membershipId === space.headMembershipId;
            return (
              <div
                key={member.membershipId}
                className="flex flex-wrap items-center justify-between gap-2 border-hairline border-t px-3.5 py-3"
              >
                <p className="text-[13.5px] text-ink">
                  {member.name}
                  {member.active ? null : (
                    <span className="ml-2 text-[11.5px] text-ink/45">
                      Deactivated
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[12px] text-ink/60">
                    {ROLE_LABEL[member.role]}
                  </p>
                  {isAdmin && member.active ? (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void apply(
                          {
                            headMembershipId: isHead
                              ? null
                              : member.membershipId,
                          },
                          isHead
                            ? `${member.name} is no longer Head of ${space.name}.`
                            : head
                              ? `${member.name} now heads ${space.name}, replacing ${head.name}.`
                              : `${member.name} now heads ${space.name}.`,
                        )
                      }
                      className="min-h-11 rounded-md px-3 text-[11.5px] sm:min-h-8"
                    >
                      {isHead ? "Remove as Head" : "Make Head"}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {here.length === 0 ? (
            <p className="border-hairline border-t px-3.5 py-6 text-center text-[13px] text-ink/60">
              Nobody is in this Space. A member joins one through Change Space.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "template" ? (
        <TemplateEditor
          key={`${space.id}:${JSON.stringify(space.kpiTemplate)}`}
          template={space.kpiTemplate}
          guard={guard}
          busy={busy}
          onSave={(next) =>
            apply(
              { kpiTemplate: next },
              "Saved. Reports started after this change use the new fields.",
            )
          }
        />
      ) : null}
    </DataPage>
  );
}

function RenameForm({
  value,
  others,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  value: string;
  others: ApiSpace[];
  busy: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: (name: string) => Promise<string | null>;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <form
      className="mt-3 flex flex-wrap items-start gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const trimmed = value.trim();
        const local = spaceNameProblem(trimmed, others);
        if (local) {
          setProblem(local);
          return;
        }
        setProblem(await onSave(trimmed));
      }}
    >
      <div className="min-w-0 flex-1">
        <input
          aria-label="Space name"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
        />
        {problem ? (
          <p role="alert" className="mt-1 text-[12.5px] text-destructive">
            {problem}
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        disabled={busy}
        className="min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
      >
        Save name
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        className="min-h-11 rounded-md px-3 text-[12.5px]"
      >
        Cancel
      </Button>
    </form>
  );
}

function TemplateEditor({
  template,
  guard,
  busy,
  onSave,
}: {
  template: KpiTemplateField[];
  guard: { allowed: boolean; reason: string | null };
  busy: boolean;
  onSave: (next: KpiTemplateField[]) => Promise<string | null>;
}) {
  const [rows, setRows] = useState<KpiTemplateField[]>(template);

  return (
    <section className="mt-4 rounded-lg border border-hairline p-4">
      <h2 className="font-medium text-[14px] text-ink">KPI template</h2>
      <p className="mt-1 text-[12.5px] text-ink/60">
        Suggested fields, prefilled when someone in this Space starts a Report.
        Never required, and a blank figure is "not provided", never zero.
      </p>
      {guard.allowed ? null : (
        <p className="mt-2 text-[12px] text-ink/50">{guard.reason}</p>
      )}

      <div className="mt-3 grid gap-2">
        {rows.map((row, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and edited in place
            key={index}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              aria-label={`KPI name ${index + 1}`}
              value={row.name}
              disabled={!guard.allowed}
              maxLength={60}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item, i) =>
                    i === index ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
              className="min-h-11 min-w-0 flex-1 rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
            />
            <input
              aria-label={`KPI unit ${index + 1}`}
              value={row.unit}
              disabled={!guard.allowed}
              maxLength={20}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item, i) =>
                    i === index ? { ...item, unit: event.target.value } : item,
                  ),
                )
              }
              className="min-h-11 w-28 rounded-md border border-transparent bg-surface-muted px-3 text-[13px] text-ink outline-none focus-visible:border-ink/30"
            />
            <button
              type="button"
              aria-label={`Remove KPI ${index + 1}`}
              disabled={!guard.allowed}
              onClick={() =>
                setRows((current) => current.filter((_, i) => i !== index))
              }
              className="grid size-11 place-items-center rounded-md bg-destructive/10 text-destructive disabled:opacity-40"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-ink/60">
          No fields. Reports in this Space start with an empty KPI table.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          disabled={!guard.allowed || rows.length >= 20}
          onClick={() =>
            setRows((current) => [...current, { name: "", unit: "count" }])
          }
          className="min-h-11 gap-1.5 rounded-md px-3 text-[12.5px] text-ink/75"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
          Add field
        </Button>
        <Button
          disabled={!guard.allowed || busy}
          onClick={() =>
            void onSave(rows.filter((row) => row.name.trim() !== ""))
          }
          className="min-h-11 rounded-md bg-ink px-3 text-[12.5px] text-surface"
        >
          Save template
        </Button>
      </div>
    </section>
  );
}

export function SpaceRoute({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params);
  return <SpaceScreen id={resolved.id} />;
}

/**
 * "My Space" for a Head: the Space they head, else the one on their Membership. The
 * drawer links here, so the destination resolves the person's own Space rather than a
 * fixed id.
 */
export function MySpaceScreen() {
  const { membership, workspace } = useShell();
  const spaces = useApiLoad(
    () => listSpaces(workspace.id),
    `spaces:${workspace.id}`,
  );

  if (spaces.value.state === "loading") {
    return (
      <DataPage>
        <ListSkeleton rows={3} />
      </DataPage>
    );
  }
  if (spaces.value.state === "error") {
    return (
      <DataPage>
        <LoadError
          status={spaces.value.status}
          message={spaces.value.message}
          onRetry={() => spaces.reload(true)}
        />
      </DataPage>
    );
  }

  const space =
    spaceById(spaces.value.data, membership.spaceId ?? "") ??
    mySpace(spaces.value.data, membership);

  if (!space) {
    return (
      <DataPage>
        <h1 className="font-bold text-[24px] text-ink tracking-[-0.03em]">
          No Space yet
        </h1>
        <p className="mt-2 text-[13px] text-ink/60">
          This Membership is not in a Space, so there is nothing to show.
        </p>
      </DataPage>
    );
  }

  return <SpaceScreen id={space.id} />;
}
