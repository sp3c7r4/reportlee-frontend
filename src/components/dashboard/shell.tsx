"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Membership,
  membershipById,
  type User,
  type Workspace,
} from "@/data/viewer";
import { writeCookie } from "@/lib/cookies";
import { readSession } from "@/lib/session";
import { sidebarCookie, type Theme, themeCookie } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ShellDrawer } from "./drawer";
import { SearchOverlay } from "@/components/search/search-panel";
import { SetupBanner } from "./setup-banner";
import { ShellContext, type ShellContextValue } from "./shell-context";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";
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
 * session check is a convenience for a build with no backend, not a guard: it keeps a
 * session-less visit from sitting in an empty frame, and nothing more.
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

  // Convenience only, not a guard. There is no backend, so the simulated session in
  // sessionStorage is all that says anyone is here.
  useEffect(() => {
    if (!readSession()) router.replace("/login");
  }, [router]);

  // Read once after paint: a ref callback would run on every render and flicker the
  // overlays between containers.
  useEffect(() => {
    setPortalContainer(rootRef.current);
  }, []);

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

  const value: ShellContextValue = {
    user,
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
            <main
              id="main"
              tabIndex={-1}
              className="min-w-0 flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
            >
              {children}
            </main>
          </div>
        </div>

        <TabBar />

        <ShellDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </ShellContext.Provider>
  );
}
