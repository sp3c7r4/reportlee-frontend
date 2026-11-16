/** Space calls. The rules of the Space screens stay in `spaces.ts` and `people.ts`. */

import { type ApiResult, apiCall } from "./api.ts";
import type { ApiSpace, KpiRow } from "./api-types.ts";

const base = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/spaces`;

export function listSpaces(
  workspaceId: string,
): Promise<ApiResult<ApiSpace[]>> {
  return apiCall(
    "GET",
    base(workspaceId),
    undefined,
    "We could not load the Spaces.",
  );
}

export function createSpace(
  workspaceId: string,
  name: string,
): Promise<ApiResult<ApiSpace>> {
  return apiCall(
    "POST",
    base(workspaceId),
    { name },
    "We could not create that Space.",
  );
}

export type SpacePatch = {
  name?: string;
  headMembershipId?: string | null;
  archived?: boolean;
  kpiTemplate?: KpiRow[];
};

export function updateSpace(
  workspaceId: string,
  spaceId: string,
  patch: SpacePatch,
): Promise<ApiResult<ApiSpace>> {
  return apiCall(
    "PATCH",
    `${base(workspaceId)}/${encodeURIComponent(spaceId)}`,
    patch,
    "We could not save the Space.",
  );
}
