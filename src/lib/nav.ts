import {
  Analytics01Icon,
  CheckmarkCircle02Icon,
  DashboardSquare01Icon,
  File01Icon,
  Folder01Icon,
  Grid02Icon,
  Home01Icon,
  Menu01Icon,
  Search01Icon,
  Settings02Icon,
  SparklesIcon,
  Task01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

/**
 * The signed-in navigation, for one role at a time.
 *
 * Two lists, because they are genuinely different: the sidebar is grouped by what a
 * person is doing, and the phone tab bar is five destinations plus Menu. Deriving one
 * from the other is how you get Staff a Reports tab instead of My reports.
 *
 * Hiding an item is tidiness, not access control. Nothing here decides whether a
 * person may open a page; the server does that once it exists.
 */

export type Role = "staff" | "head" | "admin";

/** The only group labels the design allows. A sixth would mean the design changed. */
export type NavGroupLabel = "Work" | "Review" | "People" | "Insight" | "Manage";

export type NavItem = {
  label: string;
  href: string;
  icon: IconSvgElement;
  /** Disabled by a Workspace setting rather than by the role. The shell greys it. */
  disabledBy?: "ai";
};

export type NavGroup = {
  label: NavGroupLabel;
  items: NavItem[];
};

export type NavTab = {
  label: string;
  href?: string;
  icon: IconSvgElement;
  /** The Menu tab opens the drawer instead of navigating. */
  opens?: "drawer";
  /** Same rule as the rail rows: the tab stays visible, greyed, with its reason. */
  disabledBy?: "ai";
};

export type Nav = {
  groups: NavGroup[];
  tabs: NavTab[];
};

const HOME = { label: "Home", href: "/dashboard", icon: Home01Icon } as const;
const HOME_STAFF = HOME;
const HOME_HEAD = HOME;
const OVERVIEW: NavItem = {
  label: "Overview",
  href: "/dashboard",
  icon: DashboardSquare01Icon,
};

const NAV: Record<Role, Nav> = {
  staff: {
    groups: [
      {
        label: "Work",
        items: [
          HOME_STAFF,
          { label: "My reports", href: "/dashboard/reports", icon: File01Icon },
          { label: "Tasks", href: "/dashboard/tasks", icon: Task01Icon },
        ],
      },
      {
        label: "Insight",
        items: [
          {
            label: "My record",
            href: "/dashboard/my-record",
            icon: Analytics01Icon,
          },
        ],
      },
    ],
    tabs: [
      { label: "Home", href: "/dashboard", icon: Home01Icon },
      { label: "Reports", href: "/dashboard/reports", icon: File01Icon },
      { label: "Tasks", href: "/dashboard/tasks", icon: Task01Icon },
      { label: "Search", href: "/dashboard/search", icon: Search01Icon },
      { label: "Menu", icon: Menu01Icon, opens: "drawer" },
    ],
  },
  head: {
    groups: [
      {
        label: "Work",
        items: [
          HOME_HEAD,
          { label: "My reports", href: "/dashboard/reports", icon: File01Icon },
          { label: "Tasks", href: "/dashboard/tasks", icon: Task01Icon },
        ],
      },
      {
        label: "Review",
        items: [
          {
            label: "Review",
            href: "/dashboard/review",
            icon: CheckmarkCircle02Icon,
          },
        ],
      },
      {
        label: "People",
        items: [
          { label: "My Space", href: "/dashboard/space", icon: Folder01Icon },
        ],
      },
      {
        label: "Insight",
        items: [
          {
            label: "Space analytics",
            href: "/dashboard/analytics",
            icon: Analytics01Icon,
          },
        ],
      },
    ],
    tabs: [
      { label: "Home", href: "/dashboard", icon: Home01Icon },
      {
        label: "Review",
        href: "/dashboard/review",
        icon: CheckmarkCircle02Icon,
      },
      { label: "Reports", href: "/dashboard/reports", icon: File01Icon },
      { label: "Search", href: "/dashboard/search", icon: Search01Icon },
      { label: "Menu", icon: Menu01Icon, opens: "drawer" },
    ],
  },
  admin: {
    groups: [
      {
        label: "Work",
        items: [
          OVERVIEW,
          { label: "Tasks", href: "/dashboard/tasks", icon: Task01Icon },
        ],
      },
      {
        label: "Review",
        items: [
          {
            label: "Review",
            href: "/dashboard/review",
            icon: CheckmarkCircle02Icon,
          },
        ],
      },
      {
        label: "People",
        items: [
          { label: "Spaces", href: "/dashboard/spaces", icon: Grid02Icon },
          { label: "Members", href: "/dashboard/members", icon: UserGroupIcon },
        ],
      },
      {
        label: "Insight",
        items: [
          {
            label: "Analytics",
            href: "/dashboard/analytics",
            icon: Analytics01Icon,
          },
          {
            label: "Assistant",
            href: "/dashboard/assistant",
            icon: SparklesIcon,
            disabledBy: "ai",
          },
        ],
      },
      {
        label: "Manage",
        items: [
          {
            label: "Settings",
            href: "/dashboard/settings",
            icon: Settings02Icon,
          },
        ],
      },
    ],
    tabs: [
      { label: "Home", href: "/dashboard", icon: Home01Icon },
      {
        label: "Review",
        href: "/dashboard/review",
        icon: CheckmarkCircle02Icon,
      },
      { label: "Spaces", href: "/dashboard/spaces", icon: Grid02Icon },
      {
        label: "Assistant",
        href: "/dashboard/assistant",
        icon: SparklesIcon,
        disabledBy: "ai",
      },
      { label: "Menu", icon: Menu01Icon, opens: "drawer" },
    ],
  },
};

export function navFor(role: Role): Nav {
  return NAV[role];
}

/** Routes that exist but are not destinations in the rail (a form, not a place). */
const PAGE_LABELS: Record<string, string> = {
  "/dashboard/reports/new": "Submit report",
};

/** The label a page can show for itself, taken from the same table the sidebar uses. */
export function labelForPath(role: Role, pathname: string): string | null {
  for (const group of NAV[role].groups) {
    for (const item of group.items) {
      if (item.href === pathname) return item.label;
    }
  }
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  // A single Report or Space is not a destination in the rail, but it still needs a name.
  if (pathname.startsWith("/dashboard/reports/")) return "Report";
  if (pathname.startsWith("/dashboard/spaces/")) return "Space";
  return null;
}
