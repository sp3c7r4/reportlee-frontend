/**
 * The one place a cookie is written.
 *
 * The Cookie Store API is still not in Safari, so document.cookie is the only cross
 * browser way to set a preference the server reads on the next request, and it is the
 * web's least type safe corner: a value carrying a stray semicolon quietly becomes a
 * different cookie. Everything that writes one goes through here, which is also why the
 * design detector's objection to the API is answered once rather than per call site.
 */
export function writeCookie(value: string): void {
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API has no Safari support
  document.cookie = value;
}
