/** Roster calls. Role and Space rules are enforced by the server, not here. */

import { type ApiResult, apiCall } from "./api.ts";
import type { ApiMember } from "./api-types.ts";
import type { Role } from "./nav.ts";

const base = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/members`;

export function listMembers(
  workspaceId: string,
): Promise<ApiResult<ApiMember[]>> {
  return apiCall(
    "GET",
    base(workspaceId),
    undefined,
    "We could not load the people.",
  );
}

export type MemberPatch = {
  role?: Role;
  spaceId?: string | null;
  active?: boolean;
};

export function updateMember(
  workspaceId: string,
  membershipId: string,
  patch: MemberPatch,
): Promise<ApiResult<ApiMember>> {
  return apiCall(
    "PATCH",
    `${base(workspaceId)}/${encodeURIComponent(membershipId)}`,
    patch,
    "We could not save that change.",
  );
}
