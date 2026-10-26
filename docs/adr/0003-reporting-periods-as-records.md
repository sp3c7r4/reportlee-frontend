# Reporting periods are stored records generated from a Workspace schedule

A Workspace has one schedule (cadence, deadline, timezone). The system generates Reporting period records from it ahead of time. Every Report points to exactly one period, and each person has one Report per period. A person's status for a period (submitted, late, missing) is derived by comparing who was expected to report with who did. A schedule change applies from the next period onward and never rewrites existing periods or Reports.

ATR stores weekStart and weekEnd as free dates on each Report, so it cannot say who has not submitted. Reportlee needs enforceable deadlines, cadences other than weekly, and real data for the Assistant. Attaching Reports to periods after launch means backfilling every Report.

Rejected: free dates on each Report; a hard-coded weekly cadence; free-form schedule rules in v1.

Consequences: a period generator must run ahead of time and be safe to run twice; titles and labels say "Reporting period", not "week"; a per-Space schedule can be added later by letting a schedule point at a Space.
