import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import type { AuthenticatedUser } from "@/lib/auth";
import type { AppRole } from "@/lib/roles";

type ProfileResponse = {
  status: boolean;
  data: AuthenticatedUser;
};

function profileUrl(): string {
  const apiServer = (process.env.API_SERVER_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

  return `${apiServer}/api/v1/profile`;
}

function isProfileResponse(value: unknown): value is ProfileResponse {
  if (!value || typeof value !== "object") return false;

  const response = value as Partial<ProfileResponse>;
  const user = response.data as Partial<AuthenticatedUser> | undefined;

  return (
    response.status === true &&
    typeof user?.id === "number" &&
    typeof user.role === "string"
  );
}

async function frontendOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) return origin;

  const referer = requestHeaders.get("referer");

  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // Fall through to the forwarded request host.
    }
  }

  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");

  if (!host) throw new Error("Unable to determine the frontend origin.");

  return `${protocol}://${host}`;
}

/**
 * Verify the incoming Laravel Sanctum session and return only the profile
 * fields used by the workspace UI. React cache deduplicates repeated checks
 * made by a layout and page during the same server render.
 */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser> => {
  const cookieHeader = (await cookies()).toString();

  if (!cookieHeader) redirect("/login");

  const origin = await frontendOrigin();

  const response = await fetch(profileUrl(), {
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
      Origin: origin,
      Referer: `${origin}/`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (response.status === 401 || response.status === 419) redirect("/login");
  if (response.status === 403) forbidden();
  if (!response.ok) throw new Error("Unable to verify the current session.");

  const payload: unknown = await response.json().catch(() => null);

  if (!isProfileResponse(payload)) {
    throw new Error("Laravel returned an invalid profile response.");
  }

  return {
    id: payload.data.id,
    role: payload.data.role,
    name: payload.data.name,
    firstName: payload.data.firstName,
    email: payload.data.email,
    position: payload.data.position,
    branch: payload.data.branch,
  };
});

/** Require an authenticated user to have one of the supplied application roles. */
export async function requireRole(
  allowedRoles: AppRole | readonly AppRole[],
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.some((role) => role === user.role)) forbidden();

  return user;
}

