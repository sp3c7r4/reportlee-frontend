/**
 * Invitation calls. The invite token travels only in the body of the two calls that
 * need it, never in a URL, a log or a query string.
 */

import { type ApiResult, apiCall } from "./api.ts";
import type {
  ApiInvitation,
  CreatedInvitation,
  InvitationPreview,
  Membership,
  Workspace,
} from "./api-types.ts";
import type { Role } from "./nav.ts";

const base = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/invitations`;

export function listInvitations(
  workspaceId: string,
): Promise<ApiResult<ApiInvitation[]>> {
  return apiCall(
    "GET",
    base(workspaceId),
    undefined,
    "We could not load the invitations.",
  );
}

export type InvitationRow = {
  email: string;
  role: Role;
  spaceId?: string | null;
};

export function createInvitations(
  workspaceId: string,
  invitations: InvitationRow[],
): Promise<ApiResult<CreatedInvitation[]>> {
  return apiCall(
    "POST",
    base(workspaceId),
    { invitations },
    "We could not send the invitations.",
  );
}

export function revokeInvitation(
  workspaceId: string,
  invitationId: string,
): Promise<ApiResult<{ id: string; status: string }>> {
  return apiCall(
    "DELETE",
    `${base(workspaceId)}/${encodeURIComponent(invitationId)}`,
    undefined,
    "We could not revoke that invitation.",
  );
}

export function previewInvitation(
  token: string,
): Promise<ApiResult<InvitationPreview>> {
  return apiCall(
    "POST",
    "/invitations/preview",
    { token },
    "We could not open that invitation.",
  );
}

export function acceptInvitation(
  token: string,
): Promise<ApiResult<{ membership: Membership; workspace: Workspace }>> {
  return apiCall(
    "POST",
    "/invitations/accept",
    { token },
    "We could not accept that invitation.",
  );
}
