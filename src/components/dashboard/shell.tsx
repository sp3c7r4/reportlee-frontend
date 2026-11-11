"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchOverlay } from "@/components/search/search-panel";
import {
  type Membership,
  membershipById,
  type User,
  type Workspace,
} from "@/data/viewer";
import { fetchMe, hasLiveSession, SIMULATED_AUTH } from "@/lib/auth";
import { writeCookie } from "@/lib/cookies";
import { clearSession, readSession } from "@/lib/session";
import { sidebarCookie, type Theme, themeCookie } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ShellDrawer } from "./drawer";
import { SetupBanner } from "./setup-banner";
import { ShellContext, type ShellContextValue } from "./shell-context";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

type DashboardShellProps = {
  user: User;
  memberships: Membership[];
  workspaces: Workspace[];
  initialMembershipId: string;
  /** Read on the server from the cookie, so the first paint is already right. */
  initialTheme: Theme;
  initialCollapsed: boolean;
  children: React.ReactNode;
};

/**
 * The signed-in frame.
 *
 * Three things worth knowing. The Workspace choice is React state seeded from one
 * constant, so a reload forgets it and nothing stored can choose a role. The theme is
 * written for the shared parent domain, so it survives a Workspace switch. And the
 * session check is a convenience, not a guard: it keeps a session-less visit from
 * sitting in an empty frame, and the API is what refuses a request.
 */
export function DashboardShell({
  user,
  memberships,
  workspaces,
  initialMembershipId,
  initialTheme,
  initialCollapsed,
  children,
}: DashboardShellProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(initialMembershipId);
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
     in-memory token pair must exist and /auth/me must answer, and until it does the
     frame renders nothing, so sample data never flashes for a signed-out visit. */
  const [ready, setReady] = useState(SIMULATED_AUTH);
  /* @info - Only name and email are overlaid: the sample records key on the sample
     user id, so swapping it would empty every "mine" view. */
  const [identity, setIdentity] = useState<Pick<User, "name" | "email"> | null>(
    null,
  );
  useEffect(() => {
    if (SIMULATED_AUTH) {
      if (!readSession()) router.replace("/login");
      return;
    }
    const leave = () => {
      clearSession();
      router.replace("/login");
    };
    if (!hasLiveSession()) {
      leave();
      return;
    }
    let cancelled = false;
    void fetchMe().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        // A dead session clears the pair; a network failure keeps it.
        if (!hasLiveSession()) {
          leave();
          return;
        }
        setReady(true);
        return;
      }
      const { email, name, role } = result.data;
      setIdentity({ email, name: name || email });
      // The sample Memberships stay; the mapped role only picks the starting one.
      setActiveId(role === "admin" ? "mem_admin" : "mem_staff");
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Read once the frame is painted: a ref callback would run on every render and
  // flicker the overlays between containers.
  useEffect(() => {
    if (ready) setPortalContainer(rootRef.current);
  }, [ready]);

  const membership = useMemo(() => membershipById(activeId), [activeId]);
  const workspaceFor = useMemo(
    () => (candidate: Membership) =>
      workspaces.find((entry) => entry.id === candidate.workspaceId) ??
      workspaces[0],
    [workspaces],
  );
  const workspace = workspaceFor(membership);

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

  if (!ready) return null;

  const value: ShellContextValue = {
    user: identity ? { ...user, ...identity } : user,
    membership,
    workspace,
    memberships,
    workspaceFor,
    selectMembership: setActiveId,
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

        <ShellDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </ShellContext.Provider>
  );
}
