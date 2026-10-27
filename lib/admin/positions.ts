import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type PositionRecord = {
  id: number;
  label: string;
  value: string;
};

export async function getPositions(
  signal?: AbortSignal,
): Promise<PositionRecord[]> {
  try {
    const response = await apiRequest<{
      position: PositionRecord[];
    }>("/positions", {
      credentials: "include",
      signal,
    });

    if (!Array.isArray(response.position)) {
      throw new ApiError(502, "Unexpected positions response.");
    }

    return response.position;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.message === "No position found"
    ) {
      return [];
    }

    throw error;
  }
}

async function sendPositionMutation(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  payload?: { value: string } | { label: string },
): Promise<{ message: string }> {
  const csrfToken = await prepareCsrfSession();

  return apiRequest<{ message: string }>(path, {
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

export function createPosition(value: string) {
  return sendPositionMutation(
    "/create-position",
    "POST",
    { value },
  );
}

export function updatePosition(id: number, label: string) {
  return sendPositionMutation(
    `/update-position/${id}`,
    "PUT",
    { label },
  );
}

export function deletePosition(id: number) {
  return sendPositionMutation(
    `/delete-position/${id}`,
    "DELETE",
  );
}