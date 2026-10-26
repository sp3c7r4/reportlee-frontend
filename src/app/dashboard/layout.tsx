import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard/shell";
import {
  ACTIVE_MEMBERSHIP_ID,
  MEMBERSHIPS,
  USER,
  WORKSPACES,
} from "@/data/viewer";
import {
  parseSidebar,
  parseTheme,
  SIDEBAR_COOKIE,
  THEME_COOKIE,
} from "@/lib/theme";

export const metadata: Metadata = {
  title: "Dashboard | Reportlee",
  description: "Draft, review and track reports across every Space.",
};

/* @info - The stored theme is read on the server so the first paint is already right:
   reading it in the client instead makes the server render light and the client
   disagree, which React refuses to patch. With cacheComponents on, that request-time
   cookie read cannot prerender into a static shell, so this route is allowed to block
   on navigation. See Next 16 "Authentication with Cache Components". */
export const instant = false;

/* @info - The frame reads its sample data on the server and hands plain records to the
   client shell, so the switcher can hold the choice in memory without a store.
   ACTIVE_MEMBERSHIP_ID is the only thing that decides the starting role. */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stored = await cookies();
  const theme = parseTheme(stored.get(THEME_COOKIE)?.value);
  const collapsed = parseSidebar(stored.get(SIDEBAR_COOKIE)?.value);

  return (
    <DashboardShell
      user={USER}
      memberships={MEMBERSHIPS}
      workspaces={WORKSPACES}
      initialMembershipId={ACTIVE_MEMBERSHIP_ID}
      initialTheme={theme}
      initialCollapsed={collapsed}
    >
      {children}
    </DashboardShell>
  );
}
