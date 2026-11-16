"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ApiResult } from "@/lib/api";

export type Loaded<T> =
  | { state: "loading" }
  | { state: "error"; status: number; message: string }
  | { state: "ready"; data: T };

/**
 * One API read for a screen. `key` names what is being read (the Workspace id and
 * the call), so a different Workspace loads afresh. `reload()` refetches without
 * blanking the screen, and `reload(true)` goes back to the skeleton, for Retry.
 */
export function useApiLoad<T>(load: () => Promise<ApiResult<T>>, key: string) {
  const [value, setValue] = useState<Loaded<T>>({ state: "loading" });
  const [version, setVersion] = useState(0);
  const loader = useRef(load);
  loader.current = load;

  // biome-ignore lint/correctness/useExhaustiveDependencies: key and version are the triggers; the loader is read from a ref
  useEffect(() => {
    let cancelled = false;
    void loader.current().then((result) => {
      if (cancelled) return;
      setValue(
        result.ok
          ? { state: "ready", data: result.data }
          : { state: "error", status: result.status, message: result.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  // A new key starts from the skeleton, not from the last Workspace's rows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a key change resets
  useEffect(() => {
    setValue({ state: "loading" });
  }, [key]);

  const reload = useCallback((loud = false) => {
    if (loud) setValue({ state: "loading" });
    setVersion((current) => current + 1);
  }, []);

  const update = useCallback((change: (current: T) => T) => {
    setValue((current) =>
      current.state === "ready"
        ? { state: "ready", data: change(current.data) }
        : current,
    );
  }, []);

  return { value, reload, update };
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="mt-4 grid gap-2">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={index}
          className="h-14 animate-pulse rounded-lg bg-surface-muted"
        />
      ))}
    </div>
  );
}

/** A failed read: what happened and a way to act on it. */
export function LoadError({
  status,
  message,
  onRetry,
}: {
  status: number;
  message: string;
  onRetry: () => void;
}) {
  if (status === 404) {
    return (
      <div role="alert" className="mt-4 rounded-lg border border-hairline p-4">
        <p className="text-[13.5px] text-ink">
          This Workspace is not available to you.
        </p>
        <Link
          href="/dashboard"
          className="mt-1 inline-block text-[12.5px] underline"
        >
          Switch Workspace from the menu
        </Link>
      </div>
    );
  }
  return (
    <div role="alert" className="mt-4 rounded-lg border border-hairline p-4">
      <p className="text-[13.5px] text-ink">{message}</p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="mt-2 min-h-11 rounded-md px-3 text-[13px] sm:min-h-9"
      >
        Retry
      </Button>
    </div>
  );
}
