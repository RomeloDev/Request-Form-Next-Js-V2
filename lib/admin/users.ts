import { ApiError, apiFileRequest, apiRequest } from "@/lib/api";
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
  email_verified_at: string | null;
  verification_status: "Verified" | "Not Verified";
  // Laravel exposes media presence only. Raw storage paths are never sent.
  has_profile_picture: boolean;
  has_signature: boolean;
};

export type UserDirectory = {
  users: AdminUser[];
  branchCodes: Record<string, string>;
  branchLabelsUnavailable: boolean;
};

export async function loadUserDirectory(signal: AbortSignal): Promise<UserDirectory> {
  const options = { credentials: "include" as const, signal };
  const [users, branches] = await Promise.allSettled([
    apiRequest<{ data: unknown }>("/admin/users", options),
    apiRequest<{ data: { id: number; branch_code: string }[] }>("/view-branch", options),
  ]);
  if (users.status === "rejected") throw users.reason;
  if (!Array.isArray(users.value.data)) throw new ApiError(502, "Unexpected users response.");

  const safeUsers = users.value.data.map(parseAdminUser);

  const hasBranches = branches.status === "fulfilled" && Array.isArray(branches.value.data);
  return {
    users: safeUsers,
    branchCodes: hasBranches
      ? Object.fromEntries(
          branches.value.data.flatMap((branch) => [
            [String(branch.id), branch.branch_code],
            [branch.branch_code, branch.branch_code],
          ]),
        )
      : {},
    branchLabelsUnavailable: !hasBranches,
  };
}

export function userFullName(user: AdminUser): string {
  return `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() || user.username || `User #${user.id}`;
}

export function branchCodeFor(user: AdminUser, branchCodes: Record<string, string>): string {
  return branchCodes[String(user.branch_code)] ?? user.branch_code ?? "Not provided";
}

export type CreateAdminUserInput = {
  firstName: string;
  lastName: string;
  employee_id: string;
  contact: string;
  userName: string;
  email: string;
  password: string;
  password_confirmation: string;
  position: string;
  branch_code: string;
};

/**
 * Bulk rows do not require a password confirmation. If one is supplied,
 * Laravel verifies that it matches the row's password.
 */
export type BulkCreateAdminUserRow = Omit<CreateAdminUserInput, "password_confirmation"> & {
  password_confirmation?: string;
};

export type BulkCreateAdminUserInput = {
  users: BulkCreateAdminUserRow[];
};

export type CreateAdminUserResult = {
  message: string;
  data: AdminUser;
};

export type BulkCreateAdminUsersResult = {
  message: string;
  created_count: number;
};

/** Laravel returned success, but its body did not prove the expected batch. */
export class BulkCreateConfirmationError extends Error {
  constructor() {
    super("The bulk-create response could not be confirmed.");
    this.name = "BulkCreateConfirmationError";
  }
}

// Laravel hashes every password inside one atomic transaction. A full
// 500-user batch can legitimately take longer than the shared 20-second API
// timeout, so only this endpoint receives a longer upper bound.
const BULK_CREATE_TIMEOUT_MS = 390_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function invalidAdminUserResponse(): never {
  throw new ApiError(502, "The server returned an invalid user response.");
}

/**
 * Return only the fields AdminUserResource exposes. Extra server-owned values
 * are dropped instead of being carried into the UI as part of the resource.
 */
function parseAdminUser(payload: unknown): AdminUser {
  if (
    !isRecord(payload) ||
    typeof payload.id !== "number" ||
    !Number.isInteger(payload.id) ||
    typeof payload.firstname !== "string" ||
    typeof payload.lastname !== "string" ||
    typeof payload.username !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.employee_id !== "string" ||
    typeof payload.role !== "string" ||
    typeof payload.position !== "string" ||
    typeof payload.contact !== "string" ||
    !isNullableString(payload.branch_code) ||
    !isNullableString(payload.branch) ||
    !isNullableString(payload.email_verified_at) ||
    (payload.verification_status !== "Verified" &&
      payload.verification_status !== "Not Verified") ||
    typeof payload.has_profile_picture !== "boolean" ||
    typeof payload.has_signature !== "boolean"
  ) {
    invalidAdminUserResponse();
  }

  return {
    id: payload.id,
    firstname: payload.firstname,
    lastname: payload.lastname,
    username: payload.username,
    email: payload.email,
    employee_id: payload.employee_id,
    role: payload.role,
    position: payload.position,
    contact: payload.contact,
    branch_code: payload.branch_code,
    branch: payload.branch,
    email_verified_at: payload.email_verified_at,
    verification_status: payload.verification_status,
    has_profile_picture: payload.has_profile_picture,
    has_signature: payload.has_signature,
  };
}

/** POST JSON with the Sanctum CSRF cookie session, never browser storage. */
async function postAdminJson<T>(
  path: string,
  body: unknown,
  timeoutMs?: number,
): Promise<T> {
  const csrfToken = await prepareCsrfSession();

  return apiRequest<T>(path, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify(body),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<CreateAdminUserResult> {
  // Build the payload from an explicit allowlist instead of spreading the
  // input, so role, verification, branch, and media fields can never be sent.
  const response = await postAdminJson<unknown>("/admin/users", {
    firstName: input.firstName,
    lastName: input.lastName,
    employee_id: input.employee_id,
    contact: input.contact,
    userName: input.userName,
    email: input.email,
    password: input.password,
    password_confirmation: input.password_confirmation,
    position: input.position,
    branch_code: input.branch_code,
  });

  if (
    !isRecord(response) ||
    typeof response.message !== "string" ||
    response.message.trim().length === 0
  ) {
    invalidAdminUserResponse();
  }

  return {
    message: response.message,
    data: parseAdminUser(response.data),
  };
}

export async function bulkCreateAdminUsers(
  users: BulkCreateAdminUserRow[],
): Promise<BulkCreateAdminUsersResult> {
  const response = await postAdminJson<unknown>(
    "/admin/users/bulk",
    {
      users: users.map((user) => ({
        firstName: user.firstName,
        lastName: user.lastName,
        employee_id: user.employee_id,
        contact: user.contact,
        userName: user.userName,
        email: user.email,
        password: user.password,
        ...(user.password_confirmation === undefined
          ? {}
          : { password_confirmation: user.password_confirmation }),
        position: user.position,
        branch_code: user.branch_code,
      })),
    },
    BULK_CREATE_TIMEOUT_MS,
  );

  if (
    !isRecord(response) ||
    typeof response.message !== "string" ||
    response.message.trim().length === 0 ||
    typeof response.created_count !== "number" ||
    !Number.isInteger(response.created_count) ||
    response.created_count !== users.length
  ) {
    throw new BulkCreateConfirmationError();
  }

  return {
    message: response.message,
    created_count: response.created_count,
  };
}

/**
 * Protected media is streamed by Laravel after its own Admin authorization
 * check. The client receives only bytes, never a disk, path, or public URL.
 */
export function loadAdminUserProfilePicture(userId: number, signal: AbortSignal): Promise<Blob> {
  return apiFileRequest(`/admin/users/${encodeURIComponent(String(userId))}/profile-picture`, signal);
}

export function loadAdminUserSignature(userId: number, signal: AbortSignal): Promise<Blob> {
  return apiFileRequest(`/admin/users/${encodeURIComponent(String(userId))}/signature`, signal);
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
