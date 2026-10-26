import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTheme, THEME_COOKIE, themeCookie } from "../src/lib/theme.ts";

/* @info - The cookie name and its scope are a contract with the browser: a wrong
   domain silently stops the choice following a person to a workspace subdomain,
   and no screen would look broken. */

test("the cookie is reportlee-theme", () => {
  assert.equal(THEME_COOKIE, "reportlee-theme");
});

test("no stored value, or an unknown one, resolves to light", () => {
  assert.equal(parseTheme(undefined), "light");
  assert.equal(parseTheme(null), "light");
  assert.equal(parseTheme(""), "light");
  assert.equal(parseTheme("system"), "light");
  assert.equal(parseTheme("light"), "light");
  assert.equal(parseTheme("dark"), "dark");
});

test("the cookie is readable everywhere and lasts", () => {
  const cookie = themeCookie("dark", "reportlee.app");
  assert.match(cookie, /^reportlee-theme=dark/);
  assert.match(cookie, /path=\//);
  assert.match(cookie, /samesite=lax/);
  assert.match(cookie, /max-age=31536000/);
});

test("the domain is set for the product host and its subdomains", () => {
  assert.match(themeCookie("dark", "reportlee.app"), /domain=reportlee\.app/);
  assert.match(
    themeCookie("dark", "acme.reportlee.app"),
    /domain=reportlee\.app/,
  );
});

test("the domain is never set for localhost or a look-alike host", () => {
  assert.doesNotMatch(themeCookie("dark", "localhost"), /domain=/);
  assert.doesNotMatch(themeCookie("dark", "localhost:3000"), /domain=/);
  assert.doesNotMatch(themeCookie("dark", "notreportlee.app"), /domain=/);
  assert.doesNotMatch(themeCookie("dark"), /domain=/);
});
