/**
 * Workspace calls: who the caller is in each Workspace, and the Workspace itself.
 * Plain functions, no React. The server decides access; these only carry the call.
 */

import { type ApiResult, apiCall } from "./api.ts";
import type {
  MeMemberships,
  Membership,
  SlugAvailability,
  Workspace,
} from "./api-types.ts";

export function getMemberships(): Promise<ApiResult<MeMemberships>> {
  return apiCall(
    "GET",
    "/me/memberships",
    undefined,
    "We could not load your Workspaces.",
  );
}

export function setLastWorkspace(
  workspaceId: string,
): Promise<ApiResult<{ lastWorkspaceId: string }>> {
  return apiCall(
    "PUT",
    "/me/last-workspace",
    { workspaceId },
    "Could not switch Workspace. Try again.",
  );
}

export type CreateWorkspaceInput = {
  name: string;
  slug: string;
  timeZone?: string;
};

export function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<ApiResult<{ workspace: Workspace; membership: Membership }>> {
  return apiCall(
    "POST",
    "/workspaces",
    input,
    "We could not create that Workspace.",
  );
}

export function checkSlug(slug: string): Promise<ApiResult<SlugAvailability>> {
  return apiCall(
    "GET",
    `/workspaces/slug-available?slug=${encodeURIComponent(slug)}`,
    undefined,
    "We could not check that address.",
  );
}

export function updateWorkspace(
  workspaceId: string,
  patch: { name?: string; timeZone?: string; locationTagging?: boolean },
): Promise<ApiResult<Workspace>> {
  return apiCall(
    "PATCH",
    `/workspaces/${encodeURIComponent(workspaceId)}`,
    patch,
    "We could not save the Workspace.",
  );
}
