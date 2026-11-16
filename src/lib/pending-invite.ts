/**
 * The invitation a signed-out visitor opened, remembered across the login screens.
 *
 * Session storage only, never a URL: the token must not travel through a `?next=`
 * parameter or a log. The storage is injected so this stays plain and testable.
 */

export const PENDING_INVITE_KEY = "reportlee.pendingInvite";

export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Letters, digits, hyphen and underscore, 20 to 100 long: the server's token shape. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

export function isInviteToken(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function setPendingInvite(store: KeyValueStore, token: string): void {
  if (!isInviteToken(token)) return;
  try {
    store.setItem(PENDING_INVITE_KEY, token);
  } catch {
    /* A full or blocked storage only costs the return trip after login. */
  }
}

/** The remembered token, or null when none is set or the value is not token shaped. */
export function getPendingInvite(store: KeyValueStore): string | null {
  try {
    const value = store.getItem(PENDING_INVITE_KEY);
    return isInviteToken(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingInvite(store: KeyValueStore): void {
  try {
    store.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* see above */
  }
}

/**
 * Where the dashboard shell sends someone who just signed in: back to the invitation
 * they came for, once. Null when there is nothing waiting.
 */
export function inviteReturnPath(store: KeyValueStore): string | null {
  const token = getPendingInvite(store);
  return token ? `/invite/${token}` : null;
}
