import { ApiError, apiRequest } from "@/lib/api";
import { prepareCsrfSession } from "@/lib/csrf";
import {
    isRequestKind,
    type RequestKind,
} from "@/lib/requests/request-kind-options";

export const CHECK_ISSUANCE_FORM_TYPE = "Check Issuance Requisition Slip";

export function isCheckIssuanceFormType(value: string): value is typeof CHECK_ISSUANCE_FORM_TYPE {
    return value === CHECK_ISSUANCE_FORM_TYPE;
}

export type CheckIssuanceFormData = {
    payee: string;
    bank: string;
    account_no: string;
    swift_code: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === "object" && 
        value !== null &&
        !Array.isArray(value)
    );
}

function isPositiveInteger(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) && 
        value >= 1
    );
}

function isNonNegativeInteger(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0
    );
}

function isOptionalOrNullableString(
    value: unknown,
): value is string | null | undefined {
    return (
        value === undefined ||
        value === null ||
        typeof value === "string"
    );
}

function isNullableNonNegativeInteger(
    value: unknown,
): value is number | null {
    return value === null || isNonNegativeInteger(value);
}

export function parseCheckIssuanceFormData(formData: Record<string, unknown> | null): CheckIssuanceFormData {
    if (!isRecord(formData)) {
        return {
            payee: "",
            bank: "",
            account_no: "",
            swift_code: null,
        };
    }

    const swiftCode = typeof formData.swift_code === "string" ? formData.swift_code.trim() : "";

    return {
        payee: typeof formData.payee === "string" ? formData.payee.trim() : "",
        bank: typeof formData.bank === "string" ? formData.bank.trim() : "",
        account_no: typeof formData.account_no === "string" ? formData.account_no.trim() : "",
        swift_code: swiftCode || null,
    };
}

export type CheckIssuanceItemInput = {
    quantity: string;
    description: string;
    unitCost: string;
    remarks: string;
};

export type CreateCheckIssuanceInput = {
    kindOfRequest: RequestKind;
    payee: string;
    bank: string;
    accountNumber: string;
    swiftCode: string;
    notedByIds: number[];
    approvedByIds: number[];
    items: CheckIssuanceItemInput[];
    attachments: File[];
};

export type UpdateCheckIssuanceInput = 
    CreateCheckIssuanceInput & {
        updatedAt: string;
        removedAttachmentIds: number[];
    };

export type CheckIssuanceApprovalStep = {
    id: number;
    level: number;
    step_type:
        | "noted_by"
        | "approved_by"
        | "delegated_approval";
    status: string;
    approver: {
        id: number;
        firstname: string;
        lastname: string;
        position: string | null;
    };
};

export type CreatedCheckIssuance = {
    id: number;
    request_code: string;
    form_type: typeof CHECK_ISSUANCE_FORM_TYPE;
    currency: "PHP";
    status: string;
    grand_total: string;
    form_data: CheckIssuanceFormData;
    updated_at: string;
    approval_steps: CheckIssuanceApprovalStep[];
};

export type CheckIssuanceMutationResponse = {
    message: string;
    data: CreatedCheckIssuance;
};

export type BankSuggestion = {
    name: string;
};

export type BankPaginationLinks = {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
};

export type BankPaginationMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type BankSuggestionPage = {
    data: BankSuggestion[];
    links: BankPaginationLinks;
    meta: BankPaginationMeta;
    message: string;
};

export type BankSuggestionFilters = {
    search?: string;
    page?: number;
    perPage?: 10 | 20 | 50;
};

export function buildBankQuery(filters: BankSuggestionFilters = {}): string {
    const query = new URLSearchParams();

    const search = filters.search?.trim();

    if (search) {
        query.set("search", search);
    }

    if (
        filters.page !== undefined && 
        Number.isInteger(filters.page) &&
        filters.page > 0
    ) {
        query.set("page", String(filters.page));
    }

    if (
        filters.perPage === 10 ||
        filters.perPage === 20 ||
        filters.perPage === 50
    ) {
        query.set("per_page", String(filters.perPage));
    }

    const queryString = query.toString();

    return queryString ? `?${queryString}` : "";
}

function toBankSuggestion(value: unknown): BankSuggestion | null {
    if (!isRecord(value)) {
        return null;
    }

    const name = value.name;

    if (typeof name !== "string" || !name.trim()) {
        return null;
    }

    return {
        name: name.trim(),
    };
}

function toBankPaginationLinks(
    value: unknown,
): BankPaginationLinks | null {
    if (!isRecord(value)) {
        return null;
    }

    const first = value.first;
    const last = value.last;
    const prev = value.prev;
    const next = value.next;

    if (
        !isOptionalOrNullableString(first) ||
        !isOptionalOrNullableString(last) ||
        !isOptionalOrNullableString(prev) ||
        !isOptionalOrNullableString(next)
    ) {
        return null;
    }

    return {
        first: typeof first === "string" ? first : null,
        last: typeof last === "string" ? last : null,
        prev: typeof prev === "string" ? prev : null,
        next: typeof next === "string" ? next : null,
    };
}

function toBankPaginationMeta(
    value: unknown,
): BankPaginationMeta | null {
    if (!isRecord(value)) {
        return null;
    }

    const currentPage = value.current_page;
    const lastPage = value.last_page;
    const perPage = value.per_page;
    const total = value.total;
    const from = value.from;
    const to = value.to;

    if (
        !isPositiveInteger(currentPage) ||
        !isPositiveInteger(lastPage) ||
        !isPositiveInteger(perPage) ||
        !isNonNegativeInteger(total) ||
        !isNullableNonNegativeInteger(from) ||
        !isNullableNonNegativeInteger(to)
    ) {
        return null;
    }

    return {
        current_page: currentPage,
        last_page: lastPage,
        per_page: perPage,
        total,
        from,
        to,
    };
}

export function parseBankSuggestionPage(
    value: unknown,
): BankSuggestionPage {
    const unexpectedBankList = (): never => {
        throw new ApiError(
            502,
            "The service returned an unexpected bank list.",
        );
    };

    if (!isRecord(value) || typeof value.message !== "string") {
        return unexpectedBankList();
    }

    const links = toBankPaginationLinks(value.links);
    const meta = toBankPaginationMeta(value.meta);

    if (!links || !meta || !Array.isArray(value.data)) {
        return unexpectedBankList();
    }

    const data: BankSuggestion[] = [];

    for (const suggestion of value.data) {
        const parsedSuggestion = toBankSuggestion(suggestion);
        if (!parsedSuggestion) {
            return unexpectedBankList();
        }
        data.push(parsedSuggestion);
    }

    return {
        data,
        links,
        meta,
        message: value.message,
    };
}

export async function getBankSuggestions(
  filters: BankSuggestionFilters = {},
  signal?: AbortSignal,
): Promise<BankSuggestionPage> {
  const response = await apiRequest<unknown>(
    `/banks${buildBankQuery(filters)}`,
    {
      credentials: "include",
      signal,
    },
  );

  return parseBankSuggestionPage(response);
}

function validateApproverIds(
    ids: number[],
    field: "noted_by_ids" | "approved_by_ids",
    message: string,
): void {
    if (!Array.isArray(ids)) {
        throw new ApiError(422, message, {
            [field]: [message],
        });
    }

    for (const id of ids) {
        if (!isPositiveInteger(id)) {
            throw new ApiError(422, message, {
                [field]: [message],
            });
        }
    }

    if (new Set(ids).size !== ids.length) {
        throw new ApiError(422, message, {
            [field]: [message],
        });
    }
}

function validateCheckIssuanceInput(
    input: CreateCheckIssuanceInput,
): void {
    const kindOfRequest =
        typeof input.kindOfRequest === "string"
            ? input.kindOfRequest.trim()
            : "";

    if (!isRequestKind(kindOfRequest)) {
        throw new ApiError(422, "Choose a valid kind of request.", {
            kind_of_request: ["Choose a valid kind of request."],
        });
    }

    if (typeof input.payee !== "string" || !input.payee.trim()) {
        throw new ApiError(422, "Payee is required.", {
            "form_data.payee": ["Payee is required."],
        });
    }

    if (typeof input.bank !== "string" || !input.bank.trim()) {
        throw new ApiError(422, "Bank is required.", {
            "form_data.bank": ["Bank is required."],
        });
    }

    if (
        typeof input.accountNumber !== "string" ||
        !input.accountNumber.trim()
    ) {
        throw new ApiError(422, "Account number is required.", {
            "form_data.account_no": ["Account number is required."],
        });
    }

    if (typeof input.swiftCode !== "string") {
        throw new ApiError(422, "Swift Code must be text.", {
            "form_data.swift_code": ["Swift Code must be text."],
        });
    }

    if (
        !Array.isArray(input.approvedByIds) ||
        input.approvedByIds.length === 0
    ) {
        throw new ApiError(422, "At least one approver is required.", {
            approved_by_ids: ["At least one approver is required."],
        });
    }

    validateApproverIds(
        input.approvedByIds,
        "approved_by_ids",
        "Approver IDs must be positive, unique integers.",
    );

    validateApproverIds(
        input.notedByIds,
        "noted_by_ids",
        "Noted By IDs must be positive, unique integers.",
    );

    const notedIds = new Set(input.notedByIds);
    if (input.approvedByIds.some((id) => notedIds.has(id))) {
        throw new ApiError(
            422,
            "A user cannot be both Noted By and Approved By.",
            {
                approved_by_ids: [
                    "A user cannot be both Noted By and Approved By.",
                ],
            },
        );
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new ApiError(422, "At least one item is required.", {
            items: ["At least one item is required."],
        });
    }

    if (!Array.isArray(input.attachments)) {
        throw new ApiError(422, "Choose valid attachments.", {
            attachments: ["Choose valid attachments."],
        });
    }
}

function validateUpdateInput(
    input: UpdateCheckIssuanceInput,
): void {
    const updatedAt =
        typeof input.updatedAt === "string"
            ? input.updatedAt.trim()
            : "";

    if (!updatedAt) {
        throw new ApiError(
            422,
            "The request version is missing. Refresh the request and try again.",
            {
                updated_at: [
                    "The request version is missing. Refresh the request and try again.",
                ],
            },
        );
    }

    if (!Array.isArray(input.removedAttachmentIds)) {
        throw new ApiError(422, "Choose valid attachments to remove.", {
            removed_attachment_ids: [
                "Choose valid attachments to remove.",
            ],
        });
    }

    if (
        input.removedAttachmentIds.some(
            (id) => !isPositiveInteger(id),
        ) ||
        new Set(input.removedAttachmentIds).size !==
            input.removedAttachmentIds.length
    ) {
        throw new ApiError(422, "Choose valid attachments to remove.", {
            removed_attachment_ids: [
                "Choose valid attachments to remove.",
            ],
        });
    }
}

/** Build a multipart body containing only requester-editable fields. */
export function buildCheckIssuanceFormData(
    input: CreateCheckIssuanceInput,
): FormData {
    validateCheckIssuanceInput(input);

    const formData = new FormData();

    formData.append("kind_of_request", input.kindOfRequest.trim());
    formData.append("form_data[payee]", input.payee.trim());
    formData.append("form_data[bank]", input.bank.trim());
    formData.append(
        "form_data[account_no]",
        input.accountNumber.trim(),
    );
    formData.append(
        "form_data[swift_code]",
        input.swiftCode.trim(),
    );

    input.notedByIds.forEach((id, index) => {
        formData.append(`noted_by_ids[${index}]`, String(id));
    });

    input.approvedByIds.forEach((id, index) => {
        formData.append(`approved_by_ids[${index}]`, String(id));
    });

    input.items.forEach((item, index) => {
        formData.append(
            `items[${index}][quantity]`,
            item.quantity.trim(),
        );
        formData.append(
            `items[${index}][description]`,
            item.description.trim(),
        );
        formData.append(
            `items[${index}][unit_cost]`,
            item.unitCost.trim(),
        );
        formData.append(
            `items[${index}][remarks]`,
            item.remarks.trim(),
        );
    });

    input.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
    });

    return formData;
}

/** Build a multipart POST that Laravel method-overrides to PATCH. */
export function buildUpdateCheckIssuanceFormData(
    input: UpdateCheckIssuanceInput,
): FormData {
    validateUpdateInput(input);

    const formData = buildCheckIssuanceFormData(input);

    formData.append("_method", "PATCH");
    formData.append("updated_at", input.updatedAt.trim());

    input.removedAttachmentIds.forEach((id, index) => {
        formData.append(
            `removed_attachment_ids[${index}]`,
            String(id),
        );
    });

    return formData;
}

function unexpectedMutationResponse(): never {
    throw new ApiError(
        502,
        "The service returned an unexpected check issuance response.",
    );
}

function toApprovalStep(
    value: unknown,
): CheckIssuanceApprovalStep | null {
    if (!isRecord(value)) {
        return null;
    }

    const id = value.id;
    const level = value.level;
    const stepType = value.step_type;
    const status = value.status;
    const approver = value.approver;

    if (
        !isPositiveInteger(id) ||
        !isPositiveInteger(level) ||
        (stepType !== "noted_by" &&
            stepType !== "approved_by" &&
            stepType !== "delegated_approval") ||
        typeof status !== "string" ||
        !isRecord(approver)
    ) {
        return null;
    }

    const approverId = approver.id;
    const firstname = approver.firstname;
    const lastname = approver.lastname;
    const position = approver.position;

    if (
        !isPositiveInteger(approverId) ||
        typeof firstname !== "string" ||
        typeof lastname !== "string" ||
        (position !== null && typeof position !== "string")
    ) {
        return null;
    }

    return {
        id,
        level,
        step_type: stepType,
        status,
        approver: {
            id: approverId,
            firstname,
            lastname,
            position,
        },
    };
}

function parseMutationFormData(
    value: unknown,
): CheckIssuanceFormData | null {
    if (!isRecord(value)) {
        return null;
    }

    const payee = value.payee;
    const bank = value.bank;
    const accountNumber = value.account_no;
    const swiftCode = value.swift_code;

    if (
        typeof payee !== "string" ||
        typeof bank !== "string" ||
        typeof accountNumber !== "string" ||
        (swiftCode !== null && typeof swiftCode !== "string")
    ) {
        return null;
    }

    return {
        payee: payee.trim(),
        bank: bank.trim(),
        account_no: accountNumber.trim(),
        swift_code:
            typeof swiftCode === "string" && swiftCode.trim()
                ? swiftCode.trim()
                : null,
    };
}

export function parseCheckIssuanceMutationResponse(
    value: unknown,
): CheckIssuanceMutationResponse {
    if (!isRecord(value) || typeof value.message !== "string") {
        return unexpectedMutationResponse();
    }

    const data = value.data;
    if (!isRecord(data)) {
        return unexpectedMutationResponse();
    }

    const id = data.id;
    const requestCode = data.request_code;
    const formType = data.form_type;
    const currency = data.currency;
    const status = data.status;
    const grandTotal = data.grand_total;
    const updatedAt = data.updated_at;
    const formData = parseMutationFormData(data.form_data);

    if (
        !isPositiveInteger(id) ||
        typeof requestCode !== "string" ||
        typeof formType !== "string" ||
        !isCheckIssuanceFormType(formType) ||
        currency !== "PHP" ||
        typeof status !== "string" ||
        typeof grandTotal !== "string" ||
        typeof updatedAt !== "string" ||
        !formData ||
        !Array.isArray(data.approval_steps)
    ) {
        return unexpectedMutationResponse();
    }

    const approvalSteps: CheckIssuanceApprovalStep[] = [];

    for (const step of data.approval_steps) {
        const parsedStep = toApprovalStep(step);
        if (!parsedStep) {
            return unexpectedMutationResponse();
        }
        approvalSteps.push(parsedStep);
    }

    return {
        message: value.message,
        data: {
            id,
            request_code: requestCode,
            form_type: formType,
            currency,
            status,
            grand_total: grandTotal,
            form_data: formData,
            updated_at: updatedAt,
            approval_steps: approvalSteps,
        },
    };
}

export async function createCheckIssuance(
    input: CreateCheckIssuanceInput,
): Promise<CheckIssuanceMutationResponse> {
    const body = buildCheckIssuanceFormData(input);
    const csrfToken = await prepareCsrfSession();

    const response = await apiRequest<unknown>(
        "/request-forms/check-issuances",
        {
            method: "POST",
            credentials: "include",
            headers: {
                "X-XSRF-TOKEN": csrfToken,
            },
            body,
        },
    );

    return parseCheckIssuanceMutationResponse(response);
}

export async function updateCheckIssuance(
    requestId: number,
    input: UpdateCheckIssuanceInput,
): Promise<CheckIssuanceMutationResponse> {
    if (!isPositiveInteger(requestId)) {
        throw new ApiError(400, "A valid request ID is required.");
    }

    const body = buildUpdateCheckIssuanceFormData(input);
    const csrfToken = await prepareCsrfSession();

    const response = await apiRequest<unknown>(
        `/request-forms/${requestId}/check-issuance`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "X-XSRF-TOKEN": csrfToken,
            },
            body,
        },
    );

    return parseCheckIssuanceMutationResponse(response);
}
