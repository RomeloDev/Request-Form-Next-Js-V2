import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type UpdateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  contact: string;
  employee_id: string;
  position: string;
  branch_code: string | null;
  branch: string | null;
  password?: string;
};

export async function updateUser(id: number, values: UpdateUserInput): Promise<{ message: string }> {
  const csrfToken = await prepareCsrfSession();

  return apiRequest<{ message: string }>(
    `/update-profile/${id}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify(values),
    },
  );
}

export async function deleteUser(id: number): Promise<{ status: boolean; message: string }> {
  const token = await prepareCsrfSession();
  const response = await apiRequest<{ status: boolean; message: string }>(`/delete-user/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "X-XSRF-TOKEN": token },
  });
  if (response.status !== true) throw new ApiError(502, "Deletion could not be confirmed.");
  return response;
}

export async function verifyUser(id: number): Promise<{ message: string }> {
  const token = await prepareCsrfSession();
  return apiRequest<{ message: string }>(`/verified-user/${id}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": token },
    body: JSON.stringify({}),
  });
}

export type AdminUser = {
  id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  employee_id: string;
  // The directory displays the Spatie role returned by Laravel.
  // Role changes are handled by dedicated role-management endpoints.
  role: string;
  position: string;
  contact: string;
  branch_code: string | null;
  branch: string | null;
  profile_picture: string | null;
  signature: string | null;
  email_verified_at: string | null;
  verification_status: "Verified" | "Not Verified";
};

export type UserDirectory = {
  users: AdminUser[];
  branchCodes: Record<string, string>;
  branchLabelsUnavailable: boolean;
};

export async function loadUserDirectory(signal: AbortSignal): Promise<UserDirectory> {
  const options = { credentials: "include" as const, signal };
  const [users, branches] = await Promise.allSettled([
    apiRequest<{ data: AdminUser[] }>("/view-users", options),
    apiRequest<{ data: { id: number; branch_code: string }[] }>("/view-branch", options),
  ]);
  if (users.status === "rejected") throw users.reason;
  if (!Array.isArray(users.value.data)) throw new ApiError(502, "Unexpected users response.");

  const hasBranches = branches.status === "fulfilled" && Array.isArray(branches.value.data);
  return {
    users: users.value.data,
    branchCodes: hasBranches ? Object.fromEntries(branches.value.data.map((branch) => [String(branch.id), branch.branch_code])) : {},
    branchLabelsUnavailable: !hasBranches,
  };
}

export function userFullName(user: AdminUser): string {
  return `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() || user.username || `User #${user.id}`;
}

export function branchCodeFor(user: AdminUser, branchCodes: Record<string, string>): string {
  return branchCodes[String(user.branch_code)] ?? (user.branch_code ? `ID ${user.branch_code}` : "Not provided");
}

/** Only relative paths on Laravel's public storage disk are displayed. */
export function publicStorageUrl(path: string | null): string | null {
  if (!path || /^[a-z][a-z\d+.-]*:/i.test(path) || /[?#%]/.test(path)) return null;
  const parts = path.replace(/\\/g, "/").replace(/^\/?storage\//, "").split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) return null;
  return `/storage/${parts.map(encodeURIComponent).join("/")}`;
}

export type BranchOption = {
  id: number;
  branch_code: string;
  branch: string;
};

export type PositionOption = {
  id: number;
  label: string;
  value: string;
};

export async function loadEditUserOptions(signal: AbortSignal) {
  const [branches, positions] = await Promise.all([
    apiRequest<{ data: BranchOption[] }>("/view-branch", { signal }),
    apiRequest<{ position: PositionOption[] }>("/positions", { signal }),
  ]);

  if (
    !Array.isArray(branches.data) ||
    !Array.isArray(positions.position)
  ) {
    throw new ApiError(502, "Unexpected dropdown response.");
  }

  return {
    branches: branches.data,
    positions: positions.position,
  };
}
