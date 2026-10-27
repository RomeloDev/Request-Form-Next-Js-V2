import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type BranchRecord = {
  id: number;
  branch_code: string;
  branch_name: string;
  branch: string;
  acronym: string;
};

export type BranchInput = {
  branch_code: string;
  branch_name: string;
  branch: string;
  acronym?: string;
};

type BranchMutationResponse = {
  message: string;
  status?: boolean;
  data?: BranchRecord;
};

export async function getBranches(
  signal?: AbortSignal,
): Promise<BranchRecord[]> {
  const response = await apiRequest<{
    data: BranchRecord[];
  }>("/view-branch", {
    credentials: "include",
    signal,
  });

  if (!Array.isArray(response.data)) {
    throw new ApiError(502, "Unexpected branches response.");
  }

  return response.data;
}

async function sendBranchMutation(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  payload?: BranchInput,
): Promise<BranchMutationResponse> {
  const csrfToken = await prepareCsrfSession();

  return apiRequest<BranchMutationResponse>(path, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfToken,
    },
    body: payload === undefined
      ? undefined
      : JSON.stringify(payload),
  });
}

export function createBranch(values: BranchInput) {
  return sendBranchMutation(
    "/add-branch",
    "POST",
    values,
  );
}

export function updateBranch(
  id: number,
  values: BranchInput,
) {
  return sendBranchMutation(
    `/update-branch/${id}`,
    "PUT",
    values,
  );
}

export function deleteBranch(id: number) {
  return sendBranchMutation(
    `/delete-branch/${id}`,
    "DELETE",
  );
}