# Launch requirements

1. **AI provider agreement** states customer data is not used to train models.
2. **Terms and privacy policy** state that Reportlee staff can access Workspace data, and which AI provider processes Report content.
3. **Security baseline:** codes generated securely and stored hashed, rate limiting and temporary lockout, sessions ended on password reset, and a deactivated Membership blocking that Workspace at once.
4. **Audit log recorded from day one,** for every Workspace and for Super Admins.
5. **Attachments private:** short-lived links checked against Report access, malware scanning, and real deletion of removed files.
6. **Retention numbers confirmed** with whoever handles terms: 12 months for hidden Starter data, about 30 days' recovery after a Workspace is deleted.
7. **Billing provider chosen,** and checked against how it handles per-user pricing that changes mid-month. The billing layer stays replaceable.
8. **Interface text comes from one place.** "Space" and "Head of Space" are never typed directly into screens, emails or Assistant answers.
9. **Landing page copy fixes:** Done on 2026-10-26: three roles with Admins shown as monitors and never authoring, name changed to Reportlee, the "SSO Ready" chip removed, "API Reference" removed from the footer, "Start a Project" replaced with "Create a workspace", every "weekly" claim replaced with the real cadence story, and Department replaced with Space. Marketing claims (organization counts, logos, testimonials, "+38%") were left as is by decision. Still open: the pricing table promises SSO, SCIM and a dedicated environment, all of which sit in `ROADMAP.md` under Not v1.

## Defaults that can be changed

| Setting | Default |
|---|---|
| Edit window | 30 minutes |
| Trial | 30 days |
| Grace period after trial or failed payment | 14 days |
| Starter member limit | 10 |
| Starter report visibility | Last 30 days (older are hidden, kept up to 12 months) |
| Upload limits | 10 MB per file, 10 files per Report or comment |
| AI features | Off |
| Location tagging | Off (Team and up) |
