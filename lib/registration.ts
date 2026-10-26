import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type BranchOption = {
  id: number;
  branch_code: string;
  branch: string;
};

export type PositionOption = { id: number; label: string; value: string };
export type RegistrationOptions = { branches: BranchOption[]; positions: PositionOption[] };
export type RegistrationResponse = { status: boolean; message: string; token: string };

export async function loadRegistrationOptions(signal: AbortSignal): Promise<RegistrationOptions> {
  const [branches, positions] = await Promise.all([
    apiRequest<{ data: BranchOption[] }>("/view-branch", { signal }),
    apiRequest<{ position: PositionOption[] }>("/positions", { signal }).catch((error) => {
      // Preserve Laravel's existing empty-position 404 contract.
      if (error instanceof ApiError && error.status === 404 && error.message === "No position found") {
        return { position: [] };
      }
      throw error;
    }),
  ]);

  return { branches: branches.data, positions: positions.position };
}

export async function registerAccount(data: FormData): Promise<RegistrationResponse> {
  const csrfToken = await prepareCsrfSession();
  // Do not set Content-Type: the browser supplies the multipart boundary.
  return apiRequest<RegistrationResponse>("/register", {
    method: "POST",
    credentials: "include",
    headers: { "X-XSRF-TOKEN": csrfToken },
    body: data,
  });
}
