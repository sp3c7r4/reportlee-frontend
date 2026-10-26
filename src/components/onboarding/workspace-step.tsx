"use client";

import { AuthField } from "@/components/auth/auth-field";
import { SLUG_DOMAIN } from "@/lib/onboarding";

type WorkspaceStepProps = {
  orgName: string;
  slug: string;
  /** True once the user has edited the slug, after which the name stops rewriting it. */
  slugTouched: boolean;
  error?: string;
  onOrgName: (value: string) => void;
  onSlug: (value: string) => void;
};

export function WorkspaceStep({
  orgName,
  slug,
  slugTouched,
  error,
  onOrgName,
  onSlug,
}: WorkspaceStepProps) {
  return (
    <>
      <AuthField
        label="Organisation name"
        name="organisation"
        autoComplete="organization"
        placeholder="Arthurite Integrated Group"
        value={orgName}
        onChange={(event) => onOrgName(event.target.value)}
        error={error}
      />

      <AuthField
        label="Workspace URL"
        name="slug"
        placeholder="arthurite"
        value={slug}
        onChange={(event) => onSlug(event.target.value)}
        hint={slugTouched ? "You set this, so it no longer follows the name." : undefined}
        suffix={`.${SLUG_DOMAIN}`}
      />
    </>
  );
}
