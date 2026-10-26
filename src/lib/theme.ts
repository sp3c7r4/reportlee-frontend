/**
 * The shell's stored display preferences: the theme, and whether the sidebar is
 * collapsed.
 *
 * Both are cookies rather than client storage, so the server can render the shell
 * the way the reader left it on the first paint. Reading them on the client
 * instead would show a light frame with an open sidebar for one frame before
 * correcting itself.
 */

export const THEME_COOKIE = "reportlee-theme";
export const SIDEBAR_COOKIE = "reportlee-sidebar";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
/** The host the product is served from. The cookie is shared with every workspace subdomain. */
const COOKIE_DOMAIN = "reportlee.app";

export type Theme = "light" | "dark";

/** Anything that is not a stored `dark` is light: the product's default scene. */
export function parseTheme(value: string | undefined | null): Theme {
  return value === "dark" ? "dark" : "light";
}

/**
 * Scopes the cookie to the product and its workspace subdomains. The hostname is a
 * parameter rather than a read of the location, so the rule stays pure and testable,
 * and so local development on localhost never sets a domain the browser rejects.
 */
function domainAttribute(hostname?: string): string {
  if (!hostname) return "";
  const host = hostname.trim().toLowerCase().replace(/:\d+$/, "");
  return host === COOKIE_DOMAIN || host.endsWith(`.${COOKIE_DOMAIN}`)
    ? `; domain=${COOKIE_DOMAIN}`
    : "";
}

export function themeCookie(theme: Theme, hostname?: string): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax${domainAttribute(hostname)}`;
}

/** Anything that is not a stored `collapsed` is an open sidebar: the default scene. */
export function parseSidebar(value: string | undefined | null): boolean {
  return value === "collapsed";
}

/** The icon is all the button shows, so the label has to say what it does. */
export function sidebarToggleLabel(collapsed: boolean): string {
  return collapsed ? "Expand sidebar" : "Collapse sidebar";
}

export function sidebarCookie(collapsed: boolean): string {
  const value = collapsed ? "collapsed" : "open";
  return `${SIDEBAR_COOKIE}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
