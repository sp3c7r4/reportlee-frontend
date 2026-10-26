# Shared Postgres database with Row-Level Security per Workspace

All Workspaces share one Postgres database. Every tenant-owned table carries a workspace_id. Isolation is enforced twice: a central data-access layer adds the Workspace filter to every query, and Row-Level Security policies reject rows from any other Workspace. Each request sets the current Workspace on its database connection first. Users are global and are not under RLS.

A missed filter is the most likely way one company's data reaches another, and search and the Assistant are the likeliest places for it. RLS means a forgotten filter returns nothing instead of leaking. A shared database avoids per-tenant migrations and cost.

Rejected: a database per Workspace (migrations run per tenant, cross-tenant features need plumbing); application filtering only (one bug bypasses it); RLS only (harder to read and debug).

Consequences:
- Every database call must set the current Workspace first. Connection pooling must guarantee the setting cannot carry over between requests, and background jobs must set it too.
- Listing a person's Workspaces reads Memberships across tenants before any Workspace is set. This needs one narrow, audited exception.
- Super Admin access is a separate, larger exception (see ADR 0004).
- Every tenant table needs a test that tries to read another tenant's data and expects nothing back.
- A dedicated database for a large customer stays possible, because isolation is already expressed through workspace_id.
