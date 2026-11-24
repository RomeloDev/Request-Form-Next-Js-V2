import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

/**
 * API values only. User-facing labels belong to the feedback form UI and must
 * not be stored in this transport contract.
 */
export const FEEDBACK_OPINIONS = [
  "suggestion",
  "complaint",
  "compliment",
  "other",
] as const;

export type FeedbackOpinion = (typeof FEEDBACK_OPINIONS)[number];

const FEEDBACK_FIELDS = [
  "name",
  "email",
  "phone",
  "department",
  "opinion",
  "other_opinion",
  "message",
] as const;

export type FeedbackField = (typeof FEEDBACK_FIELDS)[number];

export type FeedbackFieldErrors = Partial<
  Record<FeedbackField, string>
>;

export type FeedbackErrorCode =
  | "csrf"
  | "validation"
  | "throttled"
  | "network"
  | "unexpected";

type FeedbackBasePayload = {
  /** 2–255 characters. */
  name: string;
  /** Valid email address, maximum 255 characters. */
  email: string;
  /** Null, or exactly 11 digits when supplied. */
  phone: string | null;
  /** 2–255 characters. */
  department: string;
  /** 2–2000 characters. */
  message: string;
};

/**
 * `other_opinion` is required by the backend only when opinion is "other".
 * The union enforces that rule at compile time.
 */
export type FeedbackPayload =
  | (FeedbackBasePayload & {
      opinion: Exclude<FeedbackOpinion, "other">;
    })
  | (FeedbackBasePayload & {
      opinion: "other";
      other_opinion: string;
    });

export type FeedbackResponse = {
  message: string;
  feedback_code: string;
};

const SAFE_ERROR_MESSAGES: Record<FeedbackErrorCode, string> = {
  csrf: "Your session expired. Please refresh the page and try again.",
  validation: "Please check the highlighted fields and try again.",
  throttled: "Too many attempts. Please wait a moment and try again.",
  network:
    "We couldn’t reach the service. Check your connection and try again.",
  unexpected: "Something went wrong. Please try again.",
};

/**
 * A normalized, user-safe error for the feedback form.
 *
 * status is the original HTTP status when one exists, or null for network and
 * timeout failures. fieldErrors only contains backend-supported keys.
 */
export class FeedbackSubmissionError extends Error {
  constructor(
    public readonly code: FeedbackErrorCode,
    public readonly status: number | null,
    message: string,
    public readonly fieldErrors: FeedbackFieldErrors = {},
  ) {
    super(message);
    this.name = "FeedbackSubmissionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeFieldErrors(errors: unknown): FeedbackFieldErrors {
  if (!isRecord(errors)) {
    return {};
  }

  const fieldErrors: FeedbackFieldErrors = {};

  for (const field of FEEDBACK_FIELDS) {
    const messages = errors[field];

    if (!Array.isArray(messages)) {
      continue;
    }

    // Laravel sends one message array per field; the form shows one at a time.
    const message = messages.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    if (message) {
      fieldErrors[field] = message.trim();
    }
  }

  return fieldErrors;
}

function isNetworkOrTimeoutError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  return (
    error instanceof DOMException &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      error.name === "NetworkError")
  );
}

function normalizeFeedbackError(error: unknown): FeedbackSubmissionError {
  if (error instanceof ApiError) {
    if (error.status === 419) {
      return new FeedbackSubmissionError(
        "csrf",
        419,
        SAFE_ERROR_MESSAGES.csrf,
      );
    }

    if (error.status === 422) {
      return new FeedbackSubmissionError(
        "validation",
        422,
        SAFE_ERROR_MESSAGES.validation,
        normalizeFieldErrors(error.errors),
      );
    }

    if (error.status === 429) {
      return new FeedbackSubmissionError(
        "throttled",
        429,
        SAFE_ERROR_MESSAGES.throttled,
      );
    }

    // Includes 5xx responses and malformed success payloads (502).
    return new FeedbackSubmissionError(
      "unexpected",
      error.status,
      SAFE_ERROR_MESSAGES.unexpected,
    );
  }

  if (isNetworkOrTimeoutError(error)) {
    return new FeedbackSubmissionError(
      "network",
      null,
      SAFE_ERROR_MESSAGES.network,
    );
  }

  // Do not expose an unknown exception's raw message to the form.
  return new FeedbackSubmissionError(
    "unexpected",
    null,
    SAFE_ERROR_MESSAGES.unexpected,
  );
}

function parseFeedbackResponse(payload: unknown): FeedbackResponse {
  if (
    !isRecord(payload) ||
    typeof payload.message !== "string" ||
    payload.message.trim().length === 0 ||
    typeof payload.feedback_code !== "string" ||
    payload.feedback_code.trim().length === 0
  ) {
    throw new ApiError(
      502,
      "The feedback could not be confirmed. Please try again.",
    );
  }

  return {
    message: payload.message,
    feedback_code: payload.feedback_code,
  };
}

/**
 * Submit public feedback through the existing Laravel API.
 *
 * Intended for Client Components: prepareCsrfSession reads document.cookie and
 * apiRequest talks to the browser-facing `/api/v1` rewrite.
 */
export async function submitFeedback(
  payload: FeedbackPayload,
): Promise<FeedbackResponse> {
  try {
    const csrfToken = await prepareCsrfSession();

    /*
     * Explicit allowlist. Never forward id, feedback_code, created_at,
     * updated_at, or any extra properties a caller might attach.
     */
    const body = {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      department: payload.department,
      opinion: payload.opinion,
      message: payload.message,
      ...(payload.opinion === "other"
        ? { other_opinion: payload.other_opinion }
        : {}),
    };

    const response = await apiRequest<unknown>("/send-feedback", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify(body),
    });

    return parseFeedbackResponse(response);
  } catch (error) {
    throw normalizeFeedbackError(error);
  }
}
