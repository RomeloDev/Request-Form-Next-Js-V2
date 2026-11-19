"use client";

import { readSheet } from "read-excel-file/browser";
import type { BulkCreateAdminUserRow } from "@/lib/admin/users";

/** Column order required by the approved Admin bulk user template. */
export const USER_IMPORT_HEADERS = [
  "Firstname",
  "Lastname",
  "Employee ID",
  "Contact No",
  "Username",
  "Email",
  "Password",
  "Position",
  "Branch code",
  "Branch/Company",
  "Signature",
] as const;

export const MAX_USER_IMPORT_ROWS = 500;

export type UserImportField =
  | Exclude<keyof BulkCreateAdminUserRow, "password_confirmation">
  | "file"
  | "template"
  | "row";

/**
 * A parser problem. `row` is the original Excel row number (the header is
 * row 1) so the preview can point at the exact spreadsheet row.
 */
export type UserImportIssue = {
  row: number | null;
  field: UserImportField | null;
  message: string;
};

/** Password-free preview data, safe to render or keep in component state. */
export type UserImportPreviewRow = {
  row: number;
  firstName: string;
  lastName: string;
  employeeId: string;
  contact: string;
  userName: string;
  email: string;
  position: string;
  branchCode: string;
};

export type UserImportResult = {
  fileName: string;
  /** Non-blank rows below the header. */
  dataRowCount: number;
  /** Valid rows only. Import only when `errors` is empty. */
  rows: BulkCreateAdminUserRow[];
  /** One entry per non-blank data row, without password values. */
  preview: UserImportPreviewRow[];
  /** Row-numbered issues plus file/template-level errors. */
  errors: UserImportIssue[];
};

const HEADER_ROW = 1;
const PASSWORD_INDEX = 6;

const requiredFields = [
  ["firstName", "First name is required."],
  ["lastName", "Last name is required."],
  ["employee_id", "Employee ID is required."],
  ["contact", "Contact number is required."],
  ["userName", "Username is required."],
  ["email", "Email address is required."],
  ["position", "Position is required."],
  ["branch_code", "Branch code is required."],
] as const;

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((cell, index) => {
    const value = cellToText(cell);

    // Password whitespace is meaningful and must not turn a data row into a
    // blank row. Every other template field may be trimmed safely.
    return index === PASSWORD_INDEX ? value === "" : value.trim() === "";
  });
}

function emptyResult(
  fileName: string,
  error: UserImportIssue,
  dataRowCount = 0,
): UserImportResult {
  return {
    fileName,
    dataRowCount,
    rows: [],
    preview: [],
    errors: [error],
  };
}

function headerIssue(header: string[]): string | null {
  for (let index = 0; index < USER_IMPORT_HEADERS.length; index++) {
    const actual = header[index] ?? "";
    const expected = USER_IMPORT_HEADERS[index];

    if (actual !== expected) {
      return (
        `Template mismatch at column ${index + 1}: expected "${expected}", ` +
        `found ${actual ? `"${actual}"` : "an empty cell"}. ` +
        "Use the approved 11-column user template."
      );
    }
  }

  const extraColumns = header
    .slice(USER_IMPORT_HEADERS.length)
    .filter((value) => value !== "");

  if (extraColumns.length > 0) {
    return (
      "The header row has extra columns. " +
      "Use the approved 11-column user template."
    );
  }

  return null;
}

/**
 * Parse an approved Admin bulk-user workbook entirely in the browser.
 *
 * Passwords are read without trimming and are never copied into `preview`.
 * The returned rows contain only the fields accepted by
 * POST /admin/users/bulk.
 */
export async function parseAdminUserWorkbook(
  file: File,
): Promise<UserImportResult> {
  const fileName = file.name;

  if (!/\.xlsx$/i.test(fileName)) {
    return emptyResult(fileName, {
      row: null,
      field: "file",
      message: "Choose an .xlsx file created from the approved user template.",
    });
  }

  if (file.size === 0) {
    return emptyResult(fileName, {
      row: null,
      field: "file",
      message: "The selected file is empty.",
    });
  }

  let data: unknown[][];

  try {
    // `trim: false` preserves password whitespace. Only the first sheet is read.
    data = await readSheet(file, 1, { trim: false });
  } catch {
    return emptyResult(fileName, {
      row: null,
      field: "file",
      message:
        "The file could not be read as an .xlsx workbook. " +
        "Use the approved user template.",
    });
  }

  if (!Array.isArray(data) || data.length === 0) {
    return emptyResult(fileName, {
      row: HEADER_ROW,
      field: "template",
      message: "The workbook has no readable rows.",
    });
  }

  const header = (data[0] ?? []).map((cell) => cellToText(cell).trim());
  const templateError = headerIssue(header);

  if (templateError) {
    return emptyResult(fileName, {
      row: HEADER_ROW,
      field: "template",
      message: templateError,
    });
  }

  const nonBlankRows = data
    .slice(1)
    .map((row, index) => ({
      cells: row,
      // Data starts on Excel row 2; the header is row 1.
      excelRow: index + 2,
    }))
    .filter(({ cells }) => !isBlankRow(cells));

  const dataRowCount = nonBlankRows.length;

  if (dataRowCount === 0) {
    return emptyResult(
      fileName,
      {
        row: null,
        field: "row",
        message: "The file has no data rows below the header.",
      },
      dataRowCount,
    );
  }

  if (dataRowCount > MAX_USER_IMPORT_ROWS) {
    return emptyResult(
      fileName,
      {
        row: null,
        field: "row",
        message:
          `This file has ${dataRowCount} data rows. ` +
          `Import at most ${MAX_USER_IMPORT_ROWS} users at a time.`,
      },
      dataRowCount,
    );
  }

  const rows: BulkCreateAdminUserRow[] = [];
  const preview: UserImportPreviewRow[] = [];
  const errors: UserImportIssue[] = [];

  // First Excel row where each unique value appeared.
  const seen = {
    email: new Map<string, number>(),
    userName: new Map<string, number>(),
    employee_id: new Map<string, number>(),
  };

  for (const { cells, excelRow } of nonBlankRows) {
    const text = (index: number) => cellToText(cells[index]);
    const password = text(PASSWORD_INDEX);

    const values = {
      firstName: text(0).trim(),
      lastName: text(1).trim(),
      employee_id: text(2).trim(),
      contact: text(3).trim(),
      userName: text(4).trim(),
      email: text(5).trim(),
      position: text(7).trim(),
      branch_code: text(8).trim(),
    };

    // Branch/Company (index 9) and Signature (index 10) are intentionally
    // ignored: Laravel derives the company and the account starts unsigned.
    const rowErrors: UserImportIssue[] = [];
    const addError = (
      field: UserImportField,
      message: string,
    ) => {
      rowErrors.push({ row: excelRow, field, message });
    };

    for (const [field, message] of requiredFields) {
      if (values[field] === "") addError(field, message);
    }

    if (password === "") {
      addError("password", "Password is required.");
    } else if (Array.from(password).length < 8) {
      addError("password", "Password must be at least 8 characters.");
    }

    if (values.contact !== "" && !/^[0-9]{11}$/.test(values.contact)) {
      // A numeric cell that lost a leading zero lands here. Do not pad it.
      addError("contact", "Contact number must be exactly 11 digits.");
    }

    if (
      values.userName !== "" &&
      !/^[a-z0-9_-]{5,255}$/.test(values.userName)
    ) {
      addError(
        "userName",
        "Username must be 5–255 characters using lowercase letters, " +
        "numbers, dashes, or underscores.",
      );
    }

    if (
      values.email !== "" &&
      !/^[^\s@]+@[^\s@]+$/.test(values.email)
    ) {
      addError("email", "Email address format looks invalid.");
    }

    const duplicateChecks = [
      ["employee_id", "employee ID", values.employee_id, (value: string) => value],
      ["userName", "username", values.userName, (value: string) => value.toLowerCase()],
      ["email", "email", values.email, (value: string) => value.toLowerCase()],
    ] as const;

    for (const [field, label, value, normalize] of duplicateChecks) {
      if (
        value === "" ||
        rowErrors.some((issue) => issue.field === field)
      ) {
        continue;
      }

      const key = normalize(value);
      const firstRow = seen[field].get(key);

      if (firstRow === undefined) {
        seen[field].set(key, excelRow);
      } else {
        addError(
          field,
          `Duplicate ${label} in this file. The first use is on row ${firstRow}.`,
        );
      }
    }

    // Preview never receives the password, even for invalid rows.
    preview.push({
      row: excelRow,
      firstName: values.firstName,
      lastName: values.lastName,
      employeeId: values.employee_id,
      contact: values.contact,
      userName: values.userName,
      email: values.email,
      position: values.position,
      branchCode: values.branch_code,
    });

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    rows.push({
      firstName: values.firstName,
      lastName: values.lastName,
      employee_id: values.employee_id,
      contact: values.contact,
      userName: values.userName,
      email: values.email,
      password,
      position: values.position,
      branch_code: values.branch_code,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({
      row: null,
      field: "row",
      message: "No usable rows were found in this file.",
    });
  }

  return {
    fileName,
    dataRowCount,
    rows,
    preview,
    errors,
  };
}
