"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import FormAlert from "@/components/ui/form-alert";
import Icon from "@/components/ui/icon";
import TablePagination from "@/components/ui/table-pagination";
import { ApiError, type ValidationErrors } from "@/lib/api";
import {
  bulkCreateAdminUsers,
} from "@/lib/admin/users";
import {
  parseAdminUserWorkbook,
  type UserImportField,
  type UserImportIssue,
  type UserImportResult,
} from "@/lib/admin/user-import";

export type BulkUserUploadState =
  | { status: "form" }
  | { status: "submitting"; userCount: number }
  | { status: "success"; message: string; userCount: number }
  | {
      status: "failure";
      title: string;
      message: string;
      canReturn: boolean;
    };

type BulkUserUploadProps = {
  onClose: () => void;
  onUploadStateChange: (state: BulkUserUploadState) => void;
  onBusyChange: (busy: boolean) => void;
  onBlockedChange: (blocked: boolean) => void;
};

const DEFAULT_PREVIEW_PAGE_SIZE = 20;
const PREVIEW_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const ISSUE_LIMIT = 50;

const fieldLabels: Partial<Record<UserImportField, string>> = {
  firstName: "First name",
  lastName: "Last name",
  employee_id: "Employee ID",
  contact: "Contact number",
  userName: "Username",
  email: "Email address",
  password: "Password",
  position: "Position",
  branch_code: "Branch code",
  row: "Row",
};

const importFields = new Set<UserImportField>([
  "firstName",
  "lastName",
  "employee_id",
  "contact",
  "userName",
  "email",
  "password",
  "position",
  "branch_code",
]);

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 bytes";

  const units = ["bytes", "KB", "MB", "GB"];
  const unit = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unit;

  return `${value.toFixed(unit === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function validationIssues(
  errors: ValidationErrors,
  result: UserImportResult,
): UserImportIssue[] {
  return Object.entries(errors).flatMap<UserImportIssue>(([path, messages]) => {
    const match = /^users\.(\d+)\.([A-Za-z_]+)$/.exec(path);

    if (!match) {
      return messages.map((message) => ({
        row: null,
        field: path === "users" ? "row" as const : null,
        message,
      }));
    }

    const payloadIndex = Number(match[1]);
    const candidateField = match[2] as UserImportField;
    const field = importFields.has(candidateField) ? candidateField : "row";
    const excelRow = result.preview[payloadIndex]?.row ?? payloadIndex + 2;

    return messages.map((message) => ({
      row: excelRow,
      field,
      message,
    }));
  });
}

export default function BulkUserUpload({
  onClose,
  onUploadStateChange,
  onBusyChange,
  onBlockedChange,
}: BulkUserUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const uploadStatusRef = useRef<HTMLDivElement>(null);
  const parseVersion = useRef(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UserImportResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [serverIssues, setServerIssues] = useState<UserImportIssue[]>([]);
  const [uploadState, setUploadState] = useState<BulkUserUploadState>({
    status: "form",
  });
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(
    DEFAULT_PREVIEW_PAGE_SIZE,
  );

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      parseVersion.current += 1;
    };
  }, []);

  useEffect(() => {
    onBlockedChange(blocked);
  }, [blocked, onBlockedChange]);

  useEffect(() => {
    if (uploadState.status === "form") return;

    requestAnimationFrame(() => uploadStatusRef.current?.focus());
  }, [uploadState.status]);

  function changeUploadState(state: BulkUserUploadState) {
    setUploadState(state);
    onUploadStateChange(state);
  }

  const busy = parsing || submitting;
  const parserIssues = result?.errors ?? [];
  const issues = [...parserIssues, ...serverIssues];
  const canSubmit = Boolean(
    result &&
      result.rows.length > 0 &&
      result.errors.length === 0 &&
      serverIssues.length === 0 &&
      !busy &&
      !blocked,
  );

  async function selectFile(nextFile: File) {
    const version = parseVersion.current + 1;
    parseVersion.current = version;
    setFile(nextFile);
    setResult(null);
    setServerIssues([]);
    setMessage("");
    setBlocked(false);
    setPreviewPage(1);
    setParsing(true);
    onBusyChange(true);

    try {
      const parsed = await parseAdminUserWorkbook(nextFile);

      if (mounted.current && parseVersion.current === version) {
        setResult(parsed);

        if (parsed.errors.length > 0) {
          setMessage("Fix the listed spreadsheet problems before uploading.");
          requestAnimationFrame(() => alertRef.current?.focus());
        }
      }
    } catch {
      if (mounted.current && parseVersion.current === version) {
        setMessage(
          "The workbook could not be processed safely. Remove it and choose " +
            "a fresh copy of the approved template.",
        );
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    } finally {
      if (mounted.current && parseVersion.current === version) {
        setParsing(false);
        onBusyChange(false);
      }
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (nextFile) void selectFile(nextFile);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (busy || blocked) return;

    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) void selectFile(nextFile);
  }

  function removeFile() {
    parseVersion.current += 1;
    setFile(null);
    setResult(null);
    setServerIssues([]);
    setMessage("");
    setPreviewPage(1);
    setParsing(false);
    onBusyChange(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!result || !canSubmit || inFlight.current) return;

    inFlight.current = true;
    setSubmitting(true);
    setMessage("");
    setServerIssues([]);
    onBusyChange(true);
    changeUploadState({
      status: "submitting",
      userCount: result.rows.length,
    });

    try {
      const response = await bulkCreateAdminUsers(result.rows);
      const accountLabel = response.created_count === 1 ? "account" : "accounts";
      const successMessage =
        `${response.message} ${response.created_count} ${accountLabel} created.`;

      changeUploadState({
        status: "success",
        message: successMessage,
        userCount: response.created_count,
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 422) {
        changeUploadState({ status: "form" });
        setServerIssues(validationIssues(error.errors, result));
        setMessage("The server found problems in the spreadsheet data.");
      } else if (error instanceof ApiError && error.status === 403) {
        setBlocked(true);
        changeUploadState({
          status: "failure",
          title: "Upload not permitted",
          message: "You don’t have permission to import user accounts.",
          canReturn: false,
        });
      } else if (error instanceof ApiError && error.status === 429) {
        changeUploadState({
          status: "failure",
          title: "Upload temporarily unavailable",
          message: "Too many import attempts. Wait a moment, then try again.",
          canReturn: true,
        });
      } else {
        setBlocked(true);
        changeUploadState({
          status: "failure",
          title: "Upload outcome could not be confirmed",
          message:
           "The browser did not receive server’s final response. " +
           "Close this dialog and refresh the user directory before " +
           "attempting another upload.",
          canReturn: false,
        });
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;

      if (mounted.current) {
        setSubmitting(false);
        onBusyChange(false);
      }
    }
  }

  const previewStart = (previewPage - 1) * previewPageSize;
  const visiblePreview =
    result?.preview.slice(previewStart, previewStart + previewPageSize) ?? [];
  const visibleIssues = issues.slice(0, ISSUE_LIMIT);

  if (uploadState.status !== "form") {
    const isSubmitting = uploadState.status === "submitting";
    const isSuccess = uploadState.status === "success";

    return (
      <section
        ref={uploadStatusRef}
        tabIndex={-1}
        role={uploadState.status === "failure" ? "alert" : "status"}
        aria-live={uploadState.status === "failure" ? "assertive" : "polite"}
        className="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center px-4 py-10 text-center focus:outline-none"
      >
        <span
          className={`grid size-20 place-items-center rounded-full ${
            isSubmitting
              ? "bg-blue-100 text-blue-700"
              : isSuccess
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-danger"
          }`}
        >
          <Icon
            name={isSubmitting ? "progress" : isSuccess ? "checkCircle" : "xCircle"}
            className={`size-11 ${isSubmitting ? "motion-safe:animate-spin" : ""}`}
          />
        </span>

        <h3 className="mt-6 text-2xl font-semibold">
          {isSubmitting
            ? `Creating ${uploadState.userCount} ${uploadState.userCount === 1 ? "user" : "users"}`
            : isSuccess
              ? "Users created successfully"
              : uploadState.title}
        </h3>

        <p className="mt-3 max-w-xl text-base leading-7 text-muted">
          {isSubmitting
            ? "Server is validating the complete batch and securely hashing every password. Keep this tab open; a large workbook can take several minutes."
            : uploadState.message}
        </p>

        {uploadState.status === "failure" && uploadState.canReturn && (
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setServerIssues([]);
              changeUploadState({ status: "form" });
            }}
            className="mt-7 min-h-12 rounded-xl border border-line bg-white px-5 py-3"
          >
            Back to workbook
          </button>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div role="note" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-base leading-7 text-blue-950">
        <p className="font-semibold">The workbook stays in this browser</p>
        <p className="mt-1">
          We read the first sheet and send only the approved user fields as
          JSON. Passwords are never shown in the preview. Branch/company and
          signature cells are not submitted.
        </p>
      </div>

      {message && (
        <FormAlert ref={alertRef} message={message}>
          {visibleIssues.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {visibleIssues.map((issue, index) => (
                <li key={`${issue.row ?? "file"}-${issue.field ?? "general"}-${index}`}>
                  {issue.row !== null && `Row ${issue.row}: `}
                  {issue.field && fieldLabels[issue.field]
                    ? `${fieldLabels[issue.field]} — `
                    : ""}
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
          {issues.length > visibleIssues.length && (
            <p className="mt-3 font-medium">
              {issues.length - visibleIssues.length} more problems are not shown.
            </p>
          )}
        </FormAlert>
      )}

      <section aria-labelledby="bulk-user-file-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="bulk-user-file-title" className="text-lg font-semibold">
              Excel file
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Choose the approved 11-column .xlsx template. Maximum 500 users.
            </p>
          </div>

          {file && !busy && !blocked && (
            <button
              type="button"
              onClick={removeFile}
              className="min-h-11 rounded-lg px-3 font-semibold text-danger underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-danger"
            >
              Remove file
            </button>
          )}
        </div>

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className="mt-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-5"
        >
          <label htmlFor="bulk-user-file" className="block text-base font-medium">
            Select an Excel workbook
          </label>
          <input
            ref={fileInputRef}
            id="bulk-user-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy || blocked}
            onChange={handleFileChange}
            className="mt-3 block min-h-12 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base file:mr-4 file:rounded-lg file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:font-semibold file:text-blue-800 hover:file:bg-blue-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
          />
          <p className="mt-2 text-sm text-muted">You can also drag and drop one .xlsx file here.</p>
        </div>

        {file && (
          <div className="mt-4 rounded-xl border border-line bg-slate-50 p-4">
            <p className="font-medium wrap-anywhere">{file.name}</p>
            <p className="mt-1 text-sm text-muted">
              {formatFileSize(file.size)}
              {parsing && " · Reading workbook…"}
              {!parsing && result && ` · ${result.dataRowCount} data ${result.dataRowCount === 1 ? "row" : "rows"}`}
            </p>
          </div>
        )}
      </section>

      {result && result.preview.length > 0 && (
        <section aria-labelledby="bulk-user-preview-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="bulk-user-preview-title" className="text-lg font-semibold">
              Password-free preview
            </h3>
            <p className="text-sm text-muted">
              {result.preview.length} extracted {result.preview.length === 1 ? "user" : "users"}
            </p>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <div
              role="region"
              aria-label="Imported users preview"
              tabIndex={0}
              className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
            >
              <table className="w-full min-w-[1050px] text-left text-sm leading-6">
                <thead className="border-b border-line bg-slate-50 text-muted">
                  <tr>
                    {["Row", "Name", "Employee ID", "Contact", "Username", "Email", "Position", "Branch code"].map((label) => (
                      <th key={label} scope="col" className="px-4 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {visiblePreview.map((row) => (
                    <tr key={row.row}>
                      <td className="px-4 py-3 text-muted">{row.row}</td>
                      <td className="px-4 py-3 font-medium">{`${row.firstName} ${row.lastName}`.trim() || "—"}</td>
                      <td className="px-4 py-3">{row.employeeId || "—"}</td>
                      <td className="px-4 py-3">{row.contact || "—"}</td>
                      <td className="px-4 py-3">{row.userName || "—"}</td>
                      <td className="px-4 py-3 wrap-anywhere">{row.email || "—"}</td>
                      <td className="px-4 py-3">{row.position || "—"}</td>
                      <td className="px-4 py-3">{row.branchCode || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={previewPage}
              pageSize={previewPageSize}
              totalItems={result.preview.length}
              itemLabel="users"
              ariaLabel="Imported users preview pagination"
              pageSizeOptions={PREVIEW_PAGE_SIZE_OPTIONS}
              onPageChange={setPreviewPage}
              onPageSizeChange={(pageSize) => {
                setPreviewPageSize(pageSize);
                setPreviewPage(1);
              }}
            />
          </div>
        </section>
      )}

      {result && result.errors.length === 0 && result.rows.length > 0 && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-base leading-7 text-emerald-950">
          <p className="font-semibold">
            {result.rows.length} {result.rows.length === 1 ? "user is" : "users are"} ready to upload
          </p>
          <p className="mt-1">
            The server will validate the complete batch and create everyone in one
            transaction. If any row fails, no users are created.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        aria-busy={submitting}
        className="min-h-12 w-full rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Uploading users…"
          : result?.rows.length
            ? `Upload ${result.rows.length} ${result.rows.length === 1 ? "user" : "users"}`
            : "Upload users"}
      </button>
    </form>
  );
}
