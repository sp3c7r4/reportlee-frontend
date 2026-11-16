# Live check: workspaces-people (local stack)

Date: 2026-11-16. Provenance: run by the builder step, not a fresh-context review.

## Setup
- NODE_ENV printed from the backend's .env.development: `development`. Database: Docker `app-db` on localhost:5434 (database `app`). Redis `app-cache` on 6379. Nothing non-local was touched.
- Backend started with `npm run start:dev` (left running on http://localhost:5000). Migration 0001 was already applied (workspaces, memberships, invitations tables present).
- Every request sent `Origin: http://localhost:3000`.
- Accounts: `dev-member@example.com` (creates the Workspace and becomes Admin), `dev-admin@example.com` (logged in, unused), plus three fake users inserted directly into the local `app` database with the dev member's password hash and `email_verified = true`: `live-head@example.com`, `live-staff@example.com`, `live-outsider@example.com`. `live-extra@example.com` was only invited (then revoked). No seed script or rebuild was run.
- Driver: a PowerShell script outside the repo. Tokens and the password lived in memory only. This file holds status codes and response shapes (JSON key names and value types), no values, no tokens, no invite links.
- The script ran twice. The first run had 3 failures that were wrong expectations in my script, not backend bugs (see "Findings"). The table below is the second, complete run: 90 rows, 0 failures. Ids in paths (5, 6, 7...) are local database ids.

## Result
90 of 90 checks matched the design. Labels "Memberships before workspace" and "outsider has none" ran on the second pass, so those users already had Memberships from the first run. The shape shown is correct either way.

| Check | Request | Expected | Status | Result | Response shape (types only) |
|---|---|---|---|---|---|
| No token | GET /me/memberships | 401 | 401 | PASS | error={message} |
| Memberships before workspace | GET /me/memberships | 200 | 200 | PASS | data={user:{id:str,name:str,email:str},memberships:[{id:str,userId:str,workspaceId:str,role:str,space:null,spaceId:null}],workspaces:[{id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool}],lastWorkspaceId:str} |
| Create: bad slug | POST /workspaces | 400 | 400 | PASS | error={slug} |
| Create: reserved slug | POST /workspaces | 400 | 400 | PASS | error={slug} |
| Create: unknown key | POST /workspaces | 400 | 400 | PASS |  |
| Slug available | GET /workspaces/slug-available?slug=<slug> | 200 | 200 | PASS | data={available:bool} |
| Create workspace | POST /workspaces | 201 | 201 | PASS | data={workspace:{id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool},membership:{id:str,userId:str,workspaceId:str,role:str,space:null,spaceId:null}} |
| Create: slug taken | POST /workspaces | 409 | 409 | PASS | error={message} |
| Slug taken -> unavailable | GET /workspaces/slug-available?slug=<slug> | 200 | 200 | PASS | data={available:bool,reason:str} |
| Slug param missing | GET /workspaces/slug-available | 400 | 400 | PASS | error={slug} |
| Get workspace (admin) | GET /workspaces/5 | 200 | 200 | PASS | data={id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool} |
| Get workspace (outsider) | GET /workspaces/5 | 404 | 404 | PASS | error={message} |
| Get workspace (bad id) | GET /workspaces/99999999999 | 400 | 400 | PASS | error={wsId} |
| Patch workspace (admin) | PATCH /workspaces/5 | 200 | 200 | PASS | data={id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool} |
| Patch workspace: slug rejected | PATCH /workspaces/5 | 400 | 400 | PASS |  |
| Patch workspace: empty body | PATCH /workspaces/5 | 400 | 400 | PASS |  |
| Patch workspace (outsider) | PATCH /workspaces/5 | 404 | 404 | PASS | error={message} |
| Create space A | POST /workspaces/5/spaces | 201 | 201 | PASS | data={id:str,name:str,headMembershipId:null,archived:bool,kpiTemplate:[],memberCount:num} |
| Create space B | POST /workspaces/5/spaces | 201 | 201 | PASS | data={id:str,name:str,headMembershipId:null,archived:bool,kpiTemplate:[],memberCount:num} |
| Create space: clash (case-insens.) | POST /workspaces/5/spaces | 409 | 409 | PASS | error={message} |
| Create space: empty name | POST /workspaces/5/spaces | 400 | 400 | PASS | error={name} |
| Create space (outsider) | POST /workspaces/5/spaces | 404 | 404 | PASS | error={message} |
| List spaces | GET /workspaces/5/spaces | 200 | 200 | PASS | data=[{id:str,name:str,headMembershipId:null,archived:bool,kpiTemplate:[],memberCount:num}] |
| List spaces (outsider) | GET /workspaces/5/spaces | 404 | 404 | PASS | error={message} |
| Demote last admin | PATCH /workspaces/5/members/9 | 409 | 409 | PASS | error={message} |
| Deactivate last admin | PATCH /workspaces/5/members/9 | 409 | 409 | PASS | error={message} |
| Invite: bad email | POST /workspaces/5/invitations | 400 | 400 | PASS | error={invitations.0.email} |
| Invite: unknown key | POST /workspaces/5/invitations | 400 | 400 | PASS | error={invitations.0} |
| Invite: admin with a space | POST /workspaces/5/invitations | 400 | 400 | PASS | error={message} |
| Invite: staff without a space | POST /workspaces/5/invitations | 400 | 400 | PASS | error={message} |
| Invite: outsider | POST /workspaces/5/invitations | 404 | 404 | PASS | error={message} |
| Invite head (admin invites) | POST /workspaces/5/invitations | 201 | 201 | PASS | data=[{id:str,email:str,role:str,space:str,spaceId:str,sentAt:str,invitedByMembershipId:str,expired:bool,inviteUrl:str}] |
| Invite staff (admin invites) | POST /workspaces/5/invitations | 201 | 201 | PASS | data=[{id:str,email:str,role:str,space:str,spaceId:str,sentAt:str,invitedByMembershipId:str,expired:bool,inviteUrl:str}] |
| Invite: duplicate pending | POST /workspaces/5/invitations | 409 | 409 | PASS | error={message} |
| List invitations (admin) | GET /workspaces/5/invitations | 200 | 200 | PASS | data=[{id:str,email:str,role:str,space:str,spaceId:str,sentAt:str,invitedByMembershipId:str,expired:bool}] |
| List invitations (outsider) | GET /workspaces/5/invitations | 404 | 404 | PASS | error={message} |
| Preview: bad token | POST /invitations/preview | 404 | 404 | PASS | error={message} |
| Preview: short token | POST /invitations/preview | 400 | 400 | PASS | error={token} |
| Preview: wrong user | POST /invitations/preview | 403 | 403 | PASS | error={message,code} code=INVITE_EMAIL_MISMATCH |
| Accept: wrong user | POST /invitations/accept | 403 | 403 | PASS | error={message,code} code=INVITE_EMAIL_MISMATCH |
| Preview (invitee) | POST /invitations/preview | 200 | 200 | PASS | data={workspaceName:str,role:str,spaceName:str,email:str} |
| Accept head invite | POST /invitations/accept | 200 | 200 | PASS | data={membership:{id:str,userId:str,workspaceId:str,role:str,space:str,spaceId:str},workspace:{id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool}} |
| Accept again (idempotent) | POST /invitations/accept | 200 | 200 | PASS | data={membership:{id:str,userId:str,workspaceId:str,role:str,space:str,spaceId:str},workspace:{id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool}} |
| Accept used token as other user | POST /invitations/accept | 404 | 404 | PASS | error={message} |
| Accept staff invite | POST /invitations/accept | 200 | 200 | PASS | data={membership:{id:str,userId:str,workspaceId:str,role:str,space:str,spaceId:str},workspace:{id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool}} |
| Preview accepted token (other) | POST /invitations/preview | 404 | 404 | PASS | error={message} |
| Roster (admin) | GET /workspaces/5/members | 200 | 200 | PASS | data=[{membershipId:str,name:str,role:str,space:str,spaceId:str,active:bool,joinedAt:str,email:str}] |
| Roster (staff) | GET /workspaces/5/members | 200 | 200 | PASS | data=[{membershipId:str,name:str,role:str,space:str,spaceId:str,active:bool,joinedAt:str}] |
| (check) staff roster has no email field | | | | PASS | |
| Roster (outsider) | GET /workspaces/5/members | 404 | 404 | PASS | error={message} |
| Staff patch workspace | PATCH /workspaces/5 | 403 | 403 | PASS | error={message} |
| Staff create space | POST /workspaces/5/spaces | 403 | 403 | PASS | error={message} |
| Staff list invitations | GET /workspaces/5/invitations | 403 | 403 | PASS | error={message} |
| Staff invites anyone | POST /workspaces/5/invitations | 403 | 403 | PASS | error={message} |
| Staff patch member | PATCH /workspaces/5/members/10 | 403 | 403 | PASS | error={message} |
| Head patch member | PATCH /workspaces/5/members/11 | 403 | 403 | PASS | error={message} |
| Head invites admin | POST /workspaces/5/invitations | 403 | 403 | PASS | error={message} |
| Head invites head | POST /workspaces/5/invitations | 403 | 403 | PASS | error={message} |
| Head invites staff in other space | POST /workspaces/5/invitations | 403 | 403 | PASS | error={message} |
| Head invites staff in own space | POST /workspaces/5/invitations | 201 | 201 | PASS | data=[{id:str,email:str,role:str,space:str,spaceId:str,sentAt:str,invitedByMembershipId:str,expired:bool,inviteUrl:str}] |
| Head edits own space template | PATCH /workspaces/5/spaces/7 | 200 | 200 | PASS | data={id:str,name:str,headMembershipId:str,archived:bool,kpiTemplate:[{name:str,unit:str}],memberCount:num} |
| Head renames own space | PATCH /workspaces/5/spaces/7 | 403 | 403 | PASS | error={message} |
| Head edits other space | PATCH /workspaces/5/spaces/8 | 403 | 403 | PASS | error={message} |
| Staff edits template | PATCH /workspaces/5/spaces/7 | 403 | 403 | PASS | error={message} |
| Head list invitations (own) | GET /workspaces/5/invitations | 200 | 200 | PASS | data=[{id:str,email:str,role:str,space:str,spaceId:str,sentAt:str,invitedByMembershipId:str,expired:bool}] |
| Head revoke own invitation | DELETE /workspaces/5/invitations/9 | 200 | 200 | PASS | data={id:str,status:str} |
| Revoke again | DELETE /workspaces/5/invitations/9 | 404 | 404 | PASS | error={message} |
| Staff revoke | DELETE /workspaces/5/invitations/8 | 403 | 403 | PASS | error={message} |
| Archive space with members | PATCH /workspaces/5/spaces/7 | 409 | 409 | PASS | error={message} |
| Member patch: foreign id | PATCH /workspaces/5/members/999999 | 404 | 404 | PASS | error={message} |
| Member patch: admin with space | PATCH /workspaces/5/members/11 | 400 | 400 | PASS | error={message} |
| Member patch: unknown key | PATCH /workspaces/5/members/11 | 400 | 400 | PASS |  |
| Promote staff to head (slot taken) | PATCH /workspaces/5/members/11 | 409 | 409 | PASS | error={message} |
| Set space head: staff member | PATCH /workspaces/5/spaces/7 | 200 | 200 | PASS | data={id:str,name:str,headMembershipId:str,archived:bool,kpiTemplate:[{name:str,unit:str}],memberCount:num} |
| Archive empty space B | PATCH /workspaces/5/spaces/8 | 200 | 200 | PASS | data={id:str,name:str,headMembershipId:null,archived:bool,kpiTemplate:[],memberCount:num} |
| Deactivate staff member | PATCH /workspaces/5/members/11 | 200 | 200 | PASS | data={membershipId:str,name:str,role:str,space:str,spaceId:str,active:bool,joinedAt:str,email:str} |
| Reactivate staff member | PATCH /workspaces/5/members/11 | 200 | 200 | PASS | data={membershipId:str,name:str,role:str,space:str,spaceId:str,active:bool,joinedAt:str,email:str} |
| Invite deactivated-state: existing active member | POST /workspaces/5/invitations | 409 | 409 | PASS | error={message} |
| Last workspace (member) | PUT /me/last-workspace | 200 | 200 | PASS | data={lastWorkspaceId:str} |
| Last workspace (outsider) | PUT /me/last-workspace | 404 | 404 | PASS | error={message} |
| Last workspace bad body | PUT /me/last-workspace | 400 | 400 | PASS | error={workspaceId} |
| Memberships after | GET /me/memberships | 200 | 200 | PASS | data={user:{id:str,name:str,email:str},memberships:[{id:str,userId:str,workspaceId:str,role:str,space:str,spaceId:str}],workspaces:[{id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool}],lastWorkspaceId:str} |
| Memberships (outsider has none) | GET /me/memberships | 200 | 200 | PASS | data={user:{id:str,name:str,email:str},memberships:[{id:str,userId:str,workspaceId:str,role:str,space:null,spaceId:null}],workspaces:[{id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool}],lastWorkspaceId:str} |
| Create second workspace (outsider) | POST /workspaces | 201 | 201 | PASS | data={workspace:{id:str,name:str,slug:str,memberCount:num,plan:str,memberLimit:num,aiFeatures:bool,timeZone:str,locationTagging:bool,readOnly:bool},membership:{id:str,userId:str,workspaceId:str,role:str,space:null,spaceId:null}} |
| Admin A reads workspace 2 | GET /workspaces/6 | 404 | 404 | PASS | error={message} |
| Admin A reads workspace 2 members | GET /workspaces/6/members | 404 | 404 | PASS | error={message} |
| Admin A lists spaces ws2 | GET /workspaces/6/spaces | 404 | 404 | PASS | error={message} |
| Create space in ws2 | POST /workspaces/6/spaces | 201 | 201 | PASS | data={id:str,name:str,headMembershipId:null,archived:bool,kpiTemplate:[],memberCount:num} |
| Patch foreign space via own ws | PATCH /workspaces/5/spaces/9 | 404 | 404 | PASS | error={message} |
| Revoke foreign invitation via other ws | DELETE /workspaces/6/invitations/8 | 404 | 404 | PASS | error={message} |


## Covered
- Happy paths: create Workspace (caller becomes Admin), slug check, get and patch Workspace, create, list and patch Spaces (rename, template, Head set, archive empty), roster, member deactivate and reactivate, invitation create, list, revoke, preview, accept, `/me/memberships`, `/me/last-workspace`.
- Wrong role 403: Staff and Head on Admin routes, Head inviting admin or head or staff into another Space, Staff inviting, Head renaming a Space, Head editing another Space's template, Staff revoking.
- Other workspace 404: an outsider and the Admin of another Workspace reading or writing Workspace, Spaces, members, invitations. A Space and an invitation id from another Workspace are 404 through either path.
- Bad body: invalid slug, reserved slug, empty name, bad email, unknown key, empty PATCH, short token, non-digit id, id over integer range. All 400.
- Invite flows: wrong-email user gets 403 with code `INVITE_EMAIL_MISMATCH`. Accept twice by the same user is 200. A used token for any other user is 404. Duplicate pending invite 409. Revoke twice 404.
- Last Admin: demote and deactivate both 409.
- Staff roster has no `email` field. Admin roster has it.

## Findings
1. Non-blocking, deviation from design.md: "Invite: admin with a space", "Invite: staff without a space" and "Member patch: admin with space" return 400 with `error: { message }`, not a field map keyed `invitations.N.spaceId` or `spaceId` as design.md says. The UI cannot place that error next to the field. Status is correct.
2. Non-blocking, probe artefact to confirm: for "unknown key" and "empty PATCH" 400s the script recorded no `error` shape, probably because the field-map key is an empty string (root of the body) which PowerShell's JSON parser rejects. Status 400 is correct (the design says tests assert status only). Not inspected by hand.
3. Script expectation errors, not backend bugs: a slug in upper case is rejected as invalid (400) before the taken check, so "slug taken" needs a lower-case repeat (409, passes). A used invite token presented by a different user is 404, as design.md step (c) comes before the email check (d).

## Not verified
- Browser pass of the changed frontend screens (onboarding, People, Spaces, workspace switcher, `/invite/<token>` page). No browser is available to this step. NOT VERIFIED.
- Invitation expiry after 7 days and the seat limit (10) over HTTP. Left to the backend vitest suites. NOT VERIFIED live.
- Invite email delivery. Invitations were queued; the mail output was not inspected.
- A deleted or suspended caller (401) and an unverified caller (403 `EMAIL_NOT_VERIFIED`) over HTTP.
- Backend log output for leaked emails, links or tokens was not read.
- Test rows (Workspaces "Live Check Co" and "Other Co", the three `live-*` users) remain in the local database.
