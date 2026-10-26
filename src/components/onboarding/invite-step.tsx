"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AuthField } from "@/components/auth/auth-field";
import { INVITE_LIMIT, type InviteRole } from "@/lib/onboarding";

export type InviteRow = { email: string; role: InviteRole };

type InviteStepProps = {
  rows: InviteRow[];
  /** Indexes the flow rejected on the last attempt. */
  invalid: number[];
  onRow: (index: number, patch: Partial<InviteRow>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

const ROLES: readonly { value: InviteRole; label: string }[] = [
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

/** A native select, styled to the field system: the platform does this better. */
function RoleField({
  index,
  value,
  onChange,
}: {
  index: number;
  value: InviteRole;
  onChange: (role: InviteRole) => void;
}) {
  const id = `invite-role-${index}`;
  return (
    <div className="flex w-[132px] shrink-0 flex-col gap-2">
      <label htmlFor={id} className="font-medium text-[13.5px] text-ink/80 leading-none">
        Role
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as InviteRole)}
        className="h-11 w-full appearance-none rounded-[12px] border border-hairline bg-surface-alt px-3.5 text-[15px] text-ink transition-colors focus-visible:border-ink focus-visible:ring-0 focus-visible:outline-none"
      >
        {ROLES.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function InviteStep({ rows, invalid, onRow, onAdd, onRemove }: InviteStepProps) {
  return (
    <>
      {rows.map((row, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and reordering is removal plus re-add
        <div key={index} data-step-field className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <AuthField
              label={index === 0 ? "Email address" : `Email ${index + 1}`}
              name={`invite-${index}`}
              type="email"
              autoComplete="off"
              placeholder="teammate@arthurite.com"
              value={row.email}
              onChange={(event) => onRow(index, { email: event.target.value })}
              error={
                invalid.includes(index) ? "That does not look like an email address." : undefined
              }
            />
          </div>
          <RoleField index={index} value={row.role} onChange={(role) => onRow(index, { role })} />
          {index > 0 ? (
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove invitation ${index + 1}`}
              className="mb-[1px] grid size-11 shrink-0 place-items-center rounded-[12px] text-muted-foreground transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.8} className="size-[18px]" />
            </button>
          ) : null}
        </div>
      ))}

      {rows.length < INVITE_LIMIT ? (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex w-fit items-center gap-1.5 font-medium text-[13.5px] text-ink transition-colors hover:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
          Add another person
        </button>
      ) : null}
    </>
  );
}
