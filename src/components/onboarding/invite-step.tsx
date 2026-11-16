"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import type { CreatedInvitation } from "@/lib/api-types";
import { INVITE_LIMIT, type InviteRole } from "@/lib/onboarding";

export type InviteRow = { email: string; role: InviteRole; spaceId: string };

type InviteStepProps = {
  rows: InviteRow[];
  /** Spaces a Staff member can be invited into. */
  spaces: { id: string; name: string }[];
  /** Indexes the flow rejected on the last attempt. */
  invalid: number[];
  /** The server's message for a row. */
  errors: Record<number, string>;
  /** Set once the invitations went out: each row shows as sent with its link. */
  sent: Record<number, CreatedInvitation> | null;
  onRow: (index: number, patch: Partial<InviteRow>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

const ROLES: readonly { value: InviteRole; label: string }[] = [
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

const SELECT_CLASS =
  "h-11 w-full appearance-none rounded-[12px] border border-hairline bg-surface-alt px-3.5 text-[15px] text-ink transition-colors focus-visible:border-ink focus-visible:ring-0 focus-visible:outline-none";

/** A native select, styled to the field system: the platform does this better. */
function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  width,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  width: string;
  onChange: (value: T) => void;
}) {
  return (
    <div className={`flex ${width} shrink-0 flex-col gap-2`}>
      <label
        htmlFor={id}
        className="font-medium text-[13.5px] text-ink/80 leading-none"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={SELECT_CLASS}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The link is shown once, so the way to keep it is to copy it now. */
function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="font-medium text-[13.5px] text-ink underline underline-offset-2"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export function InviteStep({
  rows,
  spaces,
  invalid,
  errors,
  sent,
  onRow,
  onAdd,
  onRemove,
}: InviteStepProps) {
  if (sent) {
    return (
      <>
        {rows.map((row, index) =>
          sent[index] ? (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
              key={index}
              data-step-field
              className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-3.5 py-3"
            >
              <span className="min-w-0 truncate text-[14.5px] text-ink">
                {row.email.trim()}
                <span className="ml-2 text-[13px] text-ink/60">Sent</span>
              </span>
              <CopyLink url={sent[index].inviteUrl} />
            </div>
          ) : null,
        )}
        <p className="text-[13px] text-muted-foreground">
          Copy a link now if you want to share it yourself. It is not shown
          again.
        </p>
      </>
    );
  }

  const spaceOptions = spaces.map((space) => ({
    value: space.id,
    label: space.name,
  }));

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
                errors[index] ??
                (invalid.includes(index)
                  ? "That does not look like an email address."
                  : undefined)
              }
            />
          </div>
          <SelectField
            id={`invite-role-${index}`}
            label="Role"
            value={row.role}
            options={ROLES}
            width="w-[110px]"
            onChange={(role) => onRow(index, { role })}
          />
          {row.role === "staff" && spaceOptions.length > 0 ? (
            <SelectField
              id={`invite-space-${index}`}
              label="Space"
              value={row.spaceId}
              options={spaceOptions}
              width="w-[140px]"
              onChange={(spaceId) => onRow(index, { spaceId })}
            />
          ) : null}
          {index > 0 ? (
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove invitation ${index + 1}`}
              className="mb-[1px] grid size-11 shrink-0 place-items-center rounded-[12px] text-muted-foreground transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                strokeWidth={1.8}
                className="size-[18px]"
              />
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
