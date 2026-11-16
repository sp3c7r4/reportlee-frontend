"use client";

import { useEffect, useRef, useState } from "react";
import type { Membership, Workspace } from "@/lib/api-types";
import {
  isReservedSlug,
  type SlugStatus,
  slugify,
  slugLocalProblem,
  slugStatusFrom,
  type WorkspaceFormErrors,
  workspaceFailure,
} from "@/lib/onboarding";
import { checkSlug, createWorkspace } from "@/lib/workspaces";

const DEBOUNCE_MS = 400;

export type CreatedWorkspace = {
  workspace: Workspace;
  membership: Membership;
};

/**
 * The name and address of a new Workspace, shared by the first-run step and the
 * switcher's dialog. The address follows the name until it is edited. A debounced
 * server check says whether it is free, and the submit asks the server once.
 */
export function useWorkspaceForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState<SlugStatus>({ state: "idle" });
  const [errors, setErrors] = useState<WorkspaceFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    if (!slug) {
      setStatus({ state: "idle" });
      return;
    }
    const problem = slugLocalProblem(slug);
    if (problem) {
      setStatus({ state: "unavailable", message: problem });
      return;
    }
    setStatus({ state: "checking" });
    let stale = false;
    const timer = window.setTimeout(() => {
      void checkSlug(slug).then((result) => {
        if (!stale) setStatus(slugStatusFrom(result));
      });
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [slug]);

  function onName(value: string) {
    setName(value);
    setErrors((current) => ({ ...current, name: undefined, form: undefined }));
    if (!slugTouched) setSlug(slugify(value));
  }

  function onSlug(value: string) {
    setSlug(slugify(value));
    setSlugTouched(true);
    setErrors((current) => ({ ...current, slug: undefined, form: undefined }));
  }

  /** Resolves to the created Workspace, or null with the errors set on the form. */
  async function submit(): Promise<CreatedWorkspace | null> {
    if (sending.current) return null;
    const trimmed = name.trim();
    const local: WorkspaceFormErrors = {
      ...(trimmed ? {} : { name: "Give your workspace a name to continue." }),
      ...(!slug
        ? { slug: "Add a letter or a number so the address is not empty." }
        : isReservedSlug(slug)
          ? { slug: "That address is reserved. Choose another name." }
          : {}),
    };
    if (local.name || local.slug) {
      setErrors(local);
      return null;
    }

    sending.current = true;
    setSubmitting(true);
    setErrors({});
    const result = await createWorkspace({ name: trimmed, slug });
    sending.current = false;
    setSubmitting(false);
    if (!result.ok) {
      setErrors(workspaceFailure(result));
      return null;
    }
    return result.data;
  }

  return {
    name,
    slug,
    slugTouched,
    status,
    errors,
    submitting,
    onName,
    onSlug,
    submit,
  };
}
