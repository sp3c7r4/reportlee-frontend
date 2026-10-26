import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/* @info - The console is isolated by construction: a console module that imports a
   dashboard module would break the extraction to its own host, so the test fails on one. */

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("no console module imports a dashboard module", () => {
  const files = [...walk("src/components/console"), "src/lib/console.ts"];

  assert.ok(files.length > 1, "the console has modules to check");
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(
      /@\/components\/dashboard|@\/components\/reports|@\/components\/tasks/.test(
        source,
      ),
      false,
      `${file} imports a dashboard module`,
    );
  }
});

test("the console route group exists outside /dashboard", () => {
  const routes = walk("src/app/super-admin");
  assert.ok(routes.some((path) => path.endsWith("page.tsx")));
  assert.ok(routes.some((path) => path.endsWith("layout.tsx")));
});

test("the operator identity is a constant, not a Membership", async () => {
  const console_ = await import("../src/lib/console.ts");
  assert.equal(typeof console_.OPERATOR.name, "string");
  assert.equal("role" in console_.OPERATOR, false);
  assert.match(console_.OPERATOR.note, /not a Member/i);
});

test("a rename must use the creation rules and refuse reserved words", async () => {
  const { renameProblem } = await import("../src/lib/console.ts");
  assert.match(renameProblem("") ?? "", /address/i);
  assert.match(renameProblem("api") ?? "", /reserved/i);
  assert.equal(renameProblem("meridian-health"), null);
});

test("every audited action names a target", async () => {
  const { auditLine } = await import("../src/lib/console.ts");
  assert.match(auditLine("suspend", "Meridian Health Trust"), /Meridian/);
  assert.match(auditLine("open", "Meridian Health Trust"), /opened/i);
});
