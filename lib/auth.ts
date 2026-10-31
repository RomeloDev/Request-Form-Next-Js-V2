import { ApiError, apiRequest, type ValidationErrors } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";
import { APP_ROLES } from "@/lib/roles";

export type LoginCredentials = { email: string; password: string };
export type AuthenticatedUser = {
  id: number;
  role: string;
  name?: string;
  firstName?: string;
  email?: string;
  position?: string | null;
  branch?: string | null;
};

type LoginResponse = {
  status?: boolean;
  message: string;
  errors?: ValidationErrors;
};
type ProfileResponse = { status: boolean; data: AuthenticatedUser };

export async function getProfile(signal?: AbortSignal): Promise<AuthenticatedUser> {
  const profile = await sessionRequest<ProfileResponse>("/profile", { signal });
  if (!profile.status || !profile.data || typeof profile.data.id !== "number" || typeof profile.data.role !== "string") {
    throw new ApiError(502, "We couldn’t confirm your sign-in. Please try again.");
  }
  return profile.data;
}

export async function signOut(): Promise<void> {
  const token = await prepareCsrfSession();
  try {
    await sessionRequest<void>("/logout", { method: "POST", headers: { "X-XSRF-TOKEN": token } });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  }
}

async function sessionRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, credentials: "include" });
  } catch (error) {
    // Keep missing login/profile routes out of user-facing error messages.
    if (error instanceof ApiError && error.status === 404 && error.message.startsWith("The route ")) {
      throw new ApiError(503, "Sign in is temporarily unavailable. Please try again later.");
    }
    throw error;
  }
}

export async function signIn(credentials: LoginCredentials): Promise<AuthenticatedUser> {
  const csrfToken = await prepareCsrfSession();
  const response = await sessionRequest<LoginResponse>("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": csrfToken },
    body: JSON.stringify(credentials),
  });

  // The reference can return validation failure with HTTP 200.
  if (response.status === false) {
    throw new ApiError(200, response.message, response.errors);
  }

  // Confirm the cookie session; a stored registration token is not proof of login.
  return getProfile();
}

export function dashboardFor(user: AuthenticatedUser): string {
  return user.role === APP_ROLES.APPROVER ? "/approver/dashboard" : "/dashboard";
}
