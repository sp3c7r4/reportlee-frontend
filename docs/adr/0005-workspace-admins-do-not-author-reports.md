# Workspace Admins monitor and do not author Reports

Only Staff and Heads of Space submit Reports. A Workspace Admin monitors the whole Workspace and is never reviewed. A Head of Space's Reports are reviewed by Admins, and a Space with no Head has its Reports reviewed by Admins.

ATR lets Admins submit Reports, and the code lets them approve their own. Allowing that here would need a rule for who reviews an Admin, then a role above Admin, then a rule for that role. Admins in practice are executives who monitor, not reporters.

Rejected: Admins review each other's Reports (breaks with one Admin); an Owner role above Admin (moves the problem up a level); Admins approve their own (a review by yourself is not a review).

Consequences: Admins are excluded from "expected to report" counts; analytics and Submission status ignore Admins; migrating ATR means keeping Admin-authored Reports as read-only history.
