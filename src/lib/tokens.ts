/**
 * The access and refresh tokens of the signed-in person.
 *
 * @info - Module memory only. Never written to storage, a cookie or a URL, and
 * never logged. The price is that a full page reload signs the person out.
 */

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function hasTokens(): boolean {
  return accessToken !== null && refreshToken !== null;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
}
