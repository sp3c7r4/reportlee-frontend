"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { CO_LEAGUE_ROSTER, SPACES } from "@/data/members";
import { SAMPLE_NOW, SAMPLE_PERIOD, SAMPLE_REPORTS } from "@/data/reports";
import {
  clearRecent,
  type SearchHit,
  type SearchResults,
  type SearchViewer,
  recordSearch,
  recentSearches,
  search,
} from "@/lib/search";
import { cn } from "@/lib/utils";

/**
 * One search, two homes: the Ctrl K overlay and the full page read the same function,
 * so they cannot disagree about what a person may find. Nothing here is a guard; the
 * scope lives in `search`.
 */
export function SearchPanel({
  variant,
  onNavigate,
}: {
  variant: "overlay" | "page";
  onNavigate?: () => void;
}) {
  const { membership } = useShell();
  const viewer: SearchViewer = useMemo(
    () => ({
      membershipId: membership.id,
      role: membership.role,
      space: membership.space,
    }),
    [membership.id, membership.role, membership.space],
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(recentSearches(window.localStorage, membership.id));
  }, [membership.id]);

  useEffect(() => {
    if (query.trim() === "") {
      setResults(null);
      setError(null);
      return;
    }
    // Simulated GET /api/v1/search?q=: the scope is computed here and nowhere else.
    const timer = window.setTimeout(() => {
      try {
        setResults(
          search({
            q: query,
            viewer,
            reports: SAMPLE_REPORTS,
            roster: CO_LEAGUE_ROSTER,
            spaces: SPACES,
          }),
        );
        setError(null);
      } catch {
        setError("Search failed. Try again.");
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [query, viewer]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const flat = useMemo(() => {
    if (!results) return [] as SearchHit[];
    return [...results.reports, ...results.members, ...results.spaces];
  }, [results]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((current) => Math.min(flat.length - 1, current + 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => Math.max(0, current - 1));
      }
      if (event.key === "Enter" && flat[active]) {
        event.preventDefault();
        recordSearch(window.localStorage, membership.id, query, SAMPLE_NOW);
        onNavigate?.();
        window.location.assign(flat[active].href);
      }
    },
    [active, flat, membership.id, onNavigate, query],
  );

  const groups: Array<[string, SearchHit[]]> = results
    ? [
        ["Reports", results.reports],
        ["Members", results.members],
        ["Spaces", results.spaces],
      ]
    : [];

  const nothing = results !== null && flat.length === 0;

  return (
    <div className={cn("flex flex-col", variant === "page" && "gap-3")}>
      <label className="relative block">
        <span className="sr-only">Search Reports, people and Spaces</span>
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink/40"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search Reports, people and Spaces"
          className="min-h-11 w-full rounded-md border border-hairline bg-surface pr-3 pl-9 text-[13.5px] text-ink outline-none focus-visible:border-ink/30"
        />
      </label>

      {query.trim() === "" ? (
        <div className="mt-2">
          {recent.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] text-ink/50 uppercase tracking-wide">
                  Recent searches
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearRecent(window.localStorage, membership.id);
                    setRecent([]);
                  }}
                  className="text-[11.5px] text-ink/50 underline"
                >
                  Clear
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {recent.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="min-h-11 rounded-md border border-hairline px-2.5 text-[12px] text-ink/70 hover:bg-surface-muted"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12.5px] text-ink/50">
              Nothing searched yet. Scope follows your role: Staff find their
              own Reports, a Head their Space, an Admin the whole Workspace.
            </p>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-[12.5px] text-destructive">{error}</p>
      ) : null}

      {results === null && query.trim() !== "" ? (
        <p className="mt-2 text-[12.5px] text-ink/50">Searching…</p>
      ) : null}

      {nothing ? (
        <p className="mt-2 text-[13px] text-ink/60">
          Nothing matches “{query.trim()}”. Try a name or a Space.
        </p>
      ) : null}

      {flat.length > 0 ? (
        <div
          className={cn(
            "mt-2 flex flex-col gap-3",
            variant === "page" && "gap-4",
          )}
        >
          {groups.map(([label, hits]) =>
            hits.length === 0 ? null : (
              <section key={label}>
                <p className="text-[11.5px] text-ink/50 uppercase tracking-wide">
                  {label}
                </p>
                <ul className="mt-1 flex list-none flex-col gap-1 p-0">
                  {hits.map((hit) => {
                    const index = flat.indexOf(hit);
                    return (
                      <li key={`${label}-${hit.id}`}>
                        <Link
                          href={hit.href}
                          onClick={() => {
                            recordSearch(
                              window.localStorage,
                              membership.id,
                              query,
                              SAMPLE_NOW,
                            );
                            onNavigate?.();
                          }}
                          onMouseEnter={() => setActive(index)}
                          className={cn(
                            "flex min-h-11 items-center justify-between gap-3 rounded-md px-2.5 text-[13px] text-ink",
                            index === active
                              ? "bg-surface-muted"
                              : "hover:bg-surface-muted",
                          )}
                        >
                          <span className="min-w-0 truncate">{hit.title}</span>
                          <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-ink/50">
                            {hit.label ? (
                              <span className="rounded-md bg-ink/[0.08] px-1.5 py-0.5 text-ink/70">
                                {hit.label}
                              </span>
                            ) : null}
                            {hit.subtitle}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {variant === "overlay" && hits.length === 5 ? (
                  <Link
                    href={`/dashboard/search?q=${encodeURIComponent(query)}`}
                    className="mt-1 inline-flex min-h-11 items-center text-[12px] text-ink/60 underline"
                  >
                    See all matches
                  </Link>
                ) : null}
              </section>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/** The overlay the top bar opens with Ctrl K or Cmd K. */
export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    /* Same scrim as the dialog primitive: black at 80% with a soft blur, so the page
       behind recedes instead of turning near-white in the dark theme. */
    <div className="fixed inset-0 z-50 bg-black/80 p-4 pt-[10vh] supports-backdrop-filter:backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="mx-auto w-full max-w-[560px] rounded-xl border border-hairline bg-popover p-3"
      >
        <SearchPanel variant="overlay" onNavigate={onClose} />
        <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink/45">
          <span>Arrow keys to move, Enter to open</span>
          <Button
            variant="ghost"
            onClick={onClose}
            className="min-h-9 rounded-md px-2 text-[11.5px] text-ink/60"
          >
            Escape
          </Button>
        </div>
      </div>
    </div>
  );
}
