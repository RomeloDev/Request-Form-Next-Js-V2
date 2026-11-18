import { ApiError, apiFileRequest, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";

export type UserProfile = {
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    contact: string;
    userName: string;
    employee_id: string;
    role: string;

    position: string | null;
    position_label: string | null;

    branch_code: string | null;
    branch: string | null;
    branch_name: string | null;

    has_profile_picture: boolean;
    has_signature: boolean;
};

export type ChangeProfilePasswordInput = {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
};

export type ProfilePictureMutationResult = {
    message: string;
    has_profile_picture: boolean;
};

export type ProfileSignatureMutationResult = {
    message: string;
    has_signature: boolean;
};

export type ChangeProfilePasswordResult = {
    message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
    return typeof value === "string" || value === null;
}

function invalidProfileResponse(): never {
    throw new ApiError(502, "The server returned an invalid profile response.");
}

function parseProfileResponse(payload: unknown): UserProfile {
    if (!isRecord(payload) || payload.status !== true) {
        invalidProfileResponse();
    }

    const data = payload.data;

    if (!isRecord(data)) {
        invalidProfileResponse();
    }

    if (
        typeof data.id !== "number" ||
        !Number.isInteger(data.id) ||
        typeof data.name !== "string" ||
        typeof data.firstName !== "string" ||
        typeof data.lastName !== "string" ||
        typeof data.email !== "string" ||
        typeof data.contact !== "string" ||
        typeof data.userName !== "string" ||
        typeof data.employee_id !== "string" ||
        typeof data.role !== "string" ||
        data.role.trim().length === 0 ||
        !isNullableString(data.position) ||
        !isNullableString(data.position_label) ||
        !isNullableString(data.branch_code) ||
        !isNullableString(data.branch) ||
        !isNullableString(data.branch_name) ||
        typeof data.has_profile_picture !== "boolean" ||
        typeof data.has_signature !== "boolean"
    ) {
        invalidProfileResponse();
    }

    return {
        id: data.id,
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        contact: data.contact,
        userName: data.userName,
        employee_id: data.employee_id,
        role: data.role,
        position: data.position,
        position_label: data.position_label,
        branch_code: data.branch_code,
        branch: data.branch,
        branch_name: data.branch_name,
        has_profile_picture: data.has_profile_picture,
        has_signature: data.has_signature,
    };
}

export async function getUserProfile(
    signal?: AbortSignal,
): Promise<UserProfile> {
    const response = await apiRequest<unknown>("/profile", {
        method: "GET",
        credentials: "include",
        signal,
    });

    return parseProfileResponse(response);
}

export function getProfilePicture(
    signal?: AbortSignal,
): Promise<Blob> {
    return apiFileRequest("/profile/picture", signal);
}

export async function updateProfilePicture(
    file: File,
    signal?: AbortSignal,
): Promise<ProfilePictureMutationResult> {
    const csrfToken = await prepareCsrfSession();
    const formData = new FormData();

    formData.set("profile_picture", file);

    const response = await apiRequest<unknown>("/profile/picture", {
        method: "POST",
        credentials: "include",
        headers: {
            "X-XSRF-TOKEN": csrfToken,
        },
        body: formData,
        signal,
    });

    const result = parseBooleanMutationResponse(
        response,
        "has_profile_picture",
        true,
    );

    return {
        message: result.message,
        has_profile_picture: result.value,
    };
}

export async function removeProfilePicture(
    signal?: AbortSignal,
): Promise<ProfilePictureMutationResult> {
    const csrfToken = await prepareCsrfSession();

    const response = await apiRequest<unknown>("/profile/picture", {
        method: "DELETE",
        credentials: "include",
        headers: {
            "X-XSRF-TOKEN": csrfToken,
        },
        signal,
    });

    const result = parseBooleanMutationResponse(
        response,
        "has_profile_picture",
        false,
    );

    return {
        message: result.message,
        has_profile_picture: result.value,
    };
}

function parseBooleanMutationResponse(
    payload: unknown,
    property: "has_profile_picture" | "has_signature",
    expectedValue: boolean,
): { message: string; value: boolean } {
    if (
        !isRecord(payload) ||
        typeof payload.message !== "string" ||
        payload.message.trim().length === 0 ||
        !isRecord(payload.data) ||
        payload.data[property] !== expectedValue
    ) {
        throw new ApiError(502, "The server returned an invalid profile response.");
    }

    return {
        message: payload.message,
        value: expectedValue,
    };
}

export function getProfileSignature(
    signal?: AbortSignal,
): Promise<Blob> {
    return apiFileRequest("/profile/signature", signal);
}

export async function updateProfileSignature(
    file: File,
    signal?: AbortSignal,
): Promise<ProfileSignatureMutationResult> {
    const csrfToken = await prepareCsrfSession();
    const formData = new FormData();

    formData.set("signature", file);

    const response = await apiRequest<unknown>("/profile/signature", {
        method: "POST",
        credentials: "include",
        headers: {
            "X-XSRF-TOKEN": csrfToken,
        },
        body: formData,
        signal,
    });

    const result = parseBooleanMutationResponse(
        response,
        "has_signature",
        true,
    );

    return {
        message: result.message,
        has_signature: result.value,
    };
}

export async function removeProfileSignature(
    signal?: AbortSignal,
): Promise<ProfileSignatureMutationResult> {
    const csrfToken = await prepareCsrfSession();

    const response = await apiRequest<unknown>("/profile/signature", {
        method: "DELETE",
        credentials: "include",
        headers: {
            "X-XSRF-TOKEN": csrfToken,
        },
        signal,
    });

    const result = parseBooleanMutationResponse(
        response,
        "has_signature",
        false,
    );

    return {
        message: result.message,
        has_signature: result.value,
    };
}

export async function changeProfilePassword(
    input: ChangeProfilePasswordInput,
    signal?: AbortSignal,
): Promise<ChangeProfilePasswordResult> {
    const csrfToken = await prepareCsrfSession();

    const response = await apiRequest<unknown>("/profile/password", {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({
            current_password: input.current_password,
            new_password: input.new_password,
            new_password_confirmation: input.new_password_confirmation,
        }),
        signal,
    });

    if (
        !isRecord(response) ||
        typeof response.message !== "string" ||
        response.message.trim().length === 0
    ) {
        throw new ApiError(502, "The server returned an invalid password-change response.");
    }

    return {
        message: response.message,
    };
}
