"use client";

import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import type { Membership, User, Workspace } from "@/data/viewer";
import type { Theme } from "@/lib/theme";

/**
 * What the parts of the frame share.
 *
 * The container exists because @base-ui/react portals to document.body by default,
 * which would put every menu and dialog outside the shell's theme class. Handing the
 * shell root to those portals keeps dark dark.
 */
export type ShellContextValue = {
  user: User;
  membership: Membership;
  workspace: Workspace;
  memberships: Membership[];
  workspaceFor: (membership: Membership) => Workspace;
  /** Switches Workspace through the API. A failure leaves the state as it was. */
  selectMembership: (id: string) => void;
  /** Adds a Workspace the person just created and makes it the active one. */
  addWorkspace: (workspace: Workspace, membership: Membership) => void;
  /** Loads the Memberships again, for a count the server has changed. */
  reload: () => void;
  portalContainer: HTMLElement | null;
  /** The page assigns the top bar's action slot, then portals into it. */
  assignActionSlot: (element: HTMLElement | null) => void;
  actionSlot: HTMLElement | null;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** The Ctrl K search overlay, opened from the rail or the shortcut. */
  openSearch: () => void;
  searchOpen: boolean;
  closeSearch: () => void;
  /** The rail is collapsed on desktop only. The drawer is always expanded. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const value = useContext(ShellContext);
  if (!value)
    throw new Error("useShell was called outside the dashboard shell");
  return value;
}

/** Fills the top bar's action slot from wherever the page happens to be. */
export function TopBarAction({ children }: { children: ReactNode }) {
  const { actionSlot } = useShell();
  return actionSlot ? createPortal(children, actionSlot) : null;
}
