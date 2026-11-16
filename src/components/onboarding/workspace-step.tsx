"use client";

import { AuthField } from "@/components/auth/auth-field";
import { SLUG_DOMAIN, type SlugStatus } from "@/lib/onboarding";

type WorkspaceStepProps = {
  orgName: string;
  slug: string;
  /** True once the user has edited the slug, after which the name stops rewriting it. */
  slugTouched: boolean;
  slugStatus: SlugStatus;
  /** The server's word on the name or the address, shown beside the field. */
  nameError?: string;
  slugError?: string;
  onOrgName: (value: string) => void;
  onSlug: (value: string) => void;
};

function slugHint(status: SlugStatus, touched: boolean): string | undefined {
  if (status.state === "checking") return "Checking";
  if (status.state === "available") return "Available";
  return touched
    ? "You set this, so it no longer follows the name."
    : undefined;
}

export function WorkspaceStep({
  orgName,
  slug,
  slugTouched,
  slugStatus,
  nameError,
  slugError,
  onOrgName,
  onSlug,
}: WorkspaceStepProps) {
  const unavailable =
    slugStatus.state === "unavailable" ? slugStatus.message : undefined;

  return (
    <>
      <AuthField
        label="Organisation name"
        name="organisation"
        autoComplete="organization"
        placeholder="Arthurite Integrated Group"
        value={orgName}
        onChange={(event) => onOrgName(event.target.value)}
        error={nameError}
      />

      <AuthField
        label="Workspace URL"
        name="slug"
        placeholder="arthurite"
        value={slug}
        onChange={(event) => onSlug(event.target.value)}
        hint={slugHint(slugStatus, slugTouched)}
        error={slugError ?? unavailable}
        suffix={`.${SLUG_DOMAIN}`}
      />
    </>
  );
}
