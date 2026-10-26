"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isReservedSlug, SLUG_DOMAIN, slugify } from "@/lib/onboarding";
import { useShell } from "./shell-context";

/**
 * Create workspace, simulated. It validates like the real thing so the field states
 * can be seen, and it stores nothing: there is no backend, and pretending otherwise
 * would be a lie the next screen inherits.
 */
export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { portalContainer } = useShell();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewed, setPreviewed] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = slugify(slug || name);

    if (!candidate) {
      setError("Enter a name or a URL.");
      return;
    }
    if (isReservedSlug(candidate)) {
      setError("That address is used by Reportlee itself. Choose another.");
      return;
    }

    setError(null);
    setPreviewed(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={portalContainer}>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            A name and an address, nothing else. This is a preview: nothing is
            created or saved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Arthurite Integrated Group"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-url">Workspace URL</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="workspace-url"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="arthurite"
                autoComplete="off"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "workspace-url-error" : undefined}
              />
              <span className="text-[12.5px] text-ink/45">.{SLUG_DOMAIN}</span>
            </div>
            {error ? (
              <p
                id="workspace-url-error"
                className="text-[12.5px] text-destructive"
              >
                {error}
              </p>
            ) : null}
          </div>

          <p className="rounded-xl bg-surface-muted p-3 text-[12px] text-ink/60 leading-[1.5]">
            30 days of Team features, then Starter. The workspace URL is fixed
            once created.
          </p>

          <output className="text-[12.5px] text-ink/60">
            {previewed ? "Preview only: nothing was created." : ""}
          </output>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create workspace</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
