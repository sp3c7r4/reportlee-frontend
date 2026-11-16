import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard/shell";
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

/* @info - The server reads only the theme and sidebar cookies. Memberships need the
   access token, which lives in browser memory, so the client shell loads them. */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const stored = await cookies();
  const theme = parseTheme(stored.get(THEME_COOKIE)?.value);
  const collapsed = parseSidebar(stored.get(SIDEBAR_COOKIE)?.value);

  return (
    <DashboardShell initialTheme={theme} initialCollapsed={collapsed}>
      {children}
    </DashboardShell>
  );
}
