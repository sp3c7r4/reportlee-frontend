# Global identity with per-Workspace Membership

A User is a single global identity. Role, Space and active status live on a Membership, one per Workspace the User belongs to. A User signs in at a Workspace's own URL, or at the general login and picks a Workspace, and lands in their last-used Workspace.

ATR keeps role, department and isActive on User, which works because there is only one company. In a multi-tenant product that would force a person to hold the same role everywhere and make "deactivate" global. Separating them later means rewriting every foreign key and permission check.

Rejected: per-Workspace user accounts (a separate login for each Workspace, no switcher, duplicated profile data).

Consequence: every permission check is scoped by Membership, and every tenant-owned record carries a workspace_id.
