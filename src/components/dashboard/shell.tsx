"use client";

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SearchOverlay } from "@/components/search/search-panel";
import { Button } from "@/components/ui/button";
import type { Membership, User, Workspace } from "@/data/viewer";
import { hasLiveSession, SIMULATED_AUTH } from "@/lib/auth";
import { writeCookie } from "@/lib/cookies";
import { inviteReturnPath } from "@/lib/pending-invite";
import { clearSession, readSession } from "@/lib/session";
import { sidebarCookie, type Theme, themeCookie } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { getMemberships, setLastWorkspace } from "@/lib/workspaces";
import { ShellDrawer } from "./drawer";
import { SetupBanner } from "./setup-banner";
import { ShellContext, type ShellContextValue } from "./shell-context";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

type DashboardShellProps = {
  /** Read on the server from the cookie, so the first paint is already right. */
  initialTheme: Theme;
  initialCollapsed: boolean;
  children: React.ReactNode;
};

type Loaded = {
  user: User;
  memberships: Membership[];
  workspaces: Workspace[];
  activeWorkspaceId: string;
};

type Load =
  | { state: "loading" }
  | { state: "error" }
  | ({ state: "ready" } & Loaded);

/**
 * The signed-in frame.
 *
 * Three things worth knowing. The Memberships come from `GET /me/memberships`, and
 * the role and Space on screen come only from the active one, never from the address,
 * a cookie or storage. The theme is written for the shared parent domain, so it
 * survives a Workspace switch. And the session check is a convenience, not a guard:
 * it keeps a session-less visit from sitting in an empty frame, and the API is what
 * refuses a request.
 */
export function DashboardShell({
  initialTheme,
  initialCollapsed,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [notice, setNotice] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /* @info - Convenience only, not a guard: the API answering 401 is the real check.
     Simulated, the sessionStorage record is all that says anyone is here. Live, the
     in-memory token pair must exist and the Memberships call must answer. Until it
     does the frame shows a skeleton, so no Workspace data flashes for a signed-out
     visit. */
  const loadMemberships = useCallback(() => {
    const leave = () => {
      clearSession();
      router.replace("/login");
    };
    if (SIMULATED_AUTH ? !readSession() : !hasLiveSession()) {
      leave();
      return () => {};
    }
    setLoad({ state: "loading" });
    let cancelled = false;
    void getMemberships().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        // A dead session clears the pair; a network failure or a 5xx keeps it.
        if (result.status === 401 && !hasLiveSession()) {
          leave();
          return;
        }
        setLoad({ state: "error" });
        return;
      }
      /* @info - Someone who opened an invitation while signed out comes back to it once,
         before the empty-Workspace redirect below can take them to onboarding. */
      const returnTo = inviteReturnPath(window.sessionStorage);
      if (returnTo) {
        router.replace(returnTo);
        return;
      }
      const { user, memberships, workspaces, lastWorkspaceId } = result.data;
      if (memberships.length === 0) {
        router.replace("/onboarding");
        return;
      }
      const active =
        memberships.find((entry) => entry.workspaceId === lastWorkspaceId) ??
        memberships[0];
      setLoad({
        state: "ready",
        user,
        memberships,
        workspaces,
        activeWorkspaceId: active.workspaceId,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => loadMemberships(), [loadMemberships]);

  const ready = load.state === "ready";
  // Read once the frame is painted: a ref callback would run on every render and
  // flicker the overlays between containers.
  useEffect(() => {
    if (ready) setPortalContainer(rootRef.current);
  }, [ready]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function setTheme(next: Theme) {
    setThemeState(next);
    if (typeof window !== "undefined") {
      writeCookie(themeCookie(next, window.location.hostname));
    }
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    // Remembered on the device, so the rail opens the way it was left.
    writeCookie(sidebarCookie(next));
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (load.state !== "ready") {
    return (
      <div
        className={cn(
          "min-h-dvh bg-surface text-ink",
          theme === "dark" && "dark",
        )}
      >
        {load.state === "error" ? (
          <div
            role="alert"
            className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center"
          >
            <p className="font-semibold text-[17px]">
              We could not load your Workspaces.
            </p>
            <p className="text-[14px] text-ink/60">
              Check your connection and try again.
            </p>
            <Button type="button" onClick={loadMemberships}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex min-h-dvh" aria-busy="true">
            <span className="sr-only">Loading your Workspaces</span>
            <div className="hidden w-[260px] shrink-0 flex-col gap-3 border-hairline border-r p-4 lg:flex">
              <div className="h-11 animate-pulse rounded-xl bg-surface-muted" />
              <div className="h-8 animate-pulse rounded-lg bg-surface-muted" />
              <div className="h-8 animate-pulse rounded-lg bg-surface-muted" />
              <div className="h-8 animate-pulse rounded-lg bg-surface-muted" />
            </div>
            <div className="flex-1 p-6">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-muted" />
              <div className="mt-6 h-40 animate-pulse rounded-2xl bg-surface-muted" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const { user, memberships, workspaces, activeWorkspaceId } = load;
  const workspaceFor = (candidate: Membership): Workspace =>
    workspaces.find((entry) => entry.id === candidate.workspaceId) ??
    workspaces[0];
  const membership =
    memberships.find((entry) => entry.workspaceId === activeWorkspaceId) ??
    memberships[0];
  const workspace = workspaceFor(membership);

  async function selectMembership(id: string) {
    const option = memberships.find((entry) => entry.id === id);
    if (!option || option.workspaceId === activeWorkspaceId) return;
    const result = await setLastWorkspace(option.workspaceId);
    if (!result.ok) {
      setNotice("Could not switch Workspace. Try again.");
      return;
    }
    setLoad((current) =>
      current.state === "ready"
        ? { ...current, activeWorkspaceId: option.workspaceId }
        : current,
    );
  }

  /* @info - A Workspace the person has just created: the server already made it the
     last one, so the frame only needs to learn it exists. */
  function addWorkspace(created: Workspace, createdMembership: Membership) {
    setLoad((current) =>
      current.state === "ready"
        ? {
            ...current,
            memberships: [...current.memberships, createdMembership],
            workspaces: [...current.workspaces, created],
            activeWorkspaceId: created.id,
          }
        : current,
    );
  }

  const value: ShellContextValue = {
    user,
    membership,
    workspace,
    memberships,
    workspaceFor,
    selectMembership,
    addWorkspace,
    reload: loadMemberships,
    portalContainer,
    assignActionSlot: setActionSlot,
    actionSlot,
    theme,
    setTheme,
    collapsed,
    toggleCollapsed,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
    searchOpen,
  };

  return (
    <ShellContext.Provider value={value}>
      <div
        ref={rootRef}
        data-slot="dashboard-shell"
        className={cn(
          // `dark` re-declares the surface, ink and hairline tokens, so the one class
          // carries the theme for the frame and for every portal rendered inside it.
          "min-h-dvh bg-surface text-ink tabular-nums",
          theme === "dark" && "dark",
        )}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-[13px] focus:text-surface"
        >
          Skip to content
        </a>

        <div className="flex min-h-dvh">
          <aside
            className={cn(
              "hidden shrink-0 border-hairline border-r transition-[width] duration-300 ease-out motion-reduce:transition-none lg:block",
              collapsed ? "w-[76px]" : "w-[260px]",
            )}
          >
            <div className="sticky top-0 h-dvh">
              <Sidebar />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <SetupBanner />

            <TopBar />
            <main id="main" tabIndex={-1} className="min-w-0 flex-1">
              {children}
            </main>
          </div>
        </div>

        <output
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 empty:hidden"
        >
          {notice ? (
            <span className="block rounded-xl bg-ink px-3.5 py-2.5 text-[13px] text-surface shadow-float">
              {notice}
            </span>
          ) : null}
        </output>

        <ShellDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </ShellContext.Provider>
  );
}
