import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

type PasswordResetResponse = {
  message: string;
};

function parseResponse(value: PasswordResetResponse): PasswordResetResponse {
  if (!value || typeof value.message !== "string") {
    throw new ApiError(502, "The password reset service returned an unexpected response.");
  }

  return value;
}

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetResponse> {
  const csrfToken = await prepareCsrfSession();
  const response = await apiRequest<PasswordResetResponse>("/forgot-password", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify({ email }),
  });

  return parseResponse(response);
}

export async function resetPassword(input: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}): Promise<PasswordResetResponse> {
  const csrfToken = await prepareCsrfSession();
  const response = await apiRequest<PasswordResetResponse>("/reset-password", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify(input),
  });

  return parseResponse(response);
}
