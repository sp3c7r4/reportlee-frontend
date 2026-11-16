"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FormAlert } from "@/components/auth/form-alert";
import { useWorkspaceForm } from "@/components/onboarding/use-workspace-form";
import { WorkspaceStep } from "@/components/onboarding/workspace-step";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShell } from "./shell-context";

/**
 * Create workspace. The same two fields and the same calls as the first-run step.
 * On success the new Workspace becomes the active one and the person goes on to add
 * its Spaces.
 */
export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { portalContainer, addWorkspace } = useShell();
  const form = useWorkspaceForm();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await form.submit();
    if (!created) return;
    addWorkspace(created.workspace, created.membership);
    onOpenChange(false);
    router.push("/onboarding?step=spaces");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            A name and an address, nothing else. You will be its Admin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <WorkspaceStep
            orgName={form.name}
            slug={form.slug}
            slugTouched={form.slugTouched}
            slugStatus={form.status}
            nameError={form.errors.name}
            slugError={form.errors.slug}
            onOrgName={form.onName}
            onSlug={form.onSlug}
          />

          <p className="rounded-xl bg-surface-muted p-3 text-[12px] text-ink/60 leading-[1.5]">
            The workspace URL is fixed once created.
          </p>

          {form.errors.form ? <FormAlert message={form.errors.form} /> : null}
          {form.errors.verifyEmail ? (
            <Link href="/verify" className="text-[13px] underline">
              Verify your email
            </Link>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <div className="min-w-40">
              <AuthSubmit
                label="Create workspace"
                pendingLabel="Creating"
                pending={form.submitting}
              />
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
