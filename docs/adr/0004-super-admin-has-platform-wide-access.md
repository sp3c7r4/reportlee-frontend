# Super Admin has platform-wide access, with every action audited

A Super Admin is a Reportlee operator who is not a member of any Workspace and has full access across all Workspaces, including Report content. Super Admin screens use a separate privileged database role that bypasses Row-Level Security. Normal application code and the Assistant never use it. Every Super Admin action, including each time one opens a Workspace's content, is written to an audit log.

Support, recovery and operations are simpler when one operator can see and fix anything, and a Workspace whose Admins are locked out needs a rescue path. The cost is that "even we can't read your Reports" cannot be promised, so terms and privacy documents must say that Reportlee staff can access Workspace data.

Rejected: an operator limited to Workspace-level records with time-limited, Admin-granted support access (stronger privacy, slower support); no operator role (fixes made directly in the database, nothing audited).

Consequences: the privileged role is the highest-value credential in the system and stays out of everyday code paths; the audit log is required; more Super Admins can be invited later.
