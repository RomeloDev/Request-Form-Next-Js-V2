"use client";

import { useState, type ChangeEvent } from "react";
import Icon from "@/components/ui/icon";

type SupportingDocumentsProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
};

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FILE_INPUT_ID = "stock-requisition-attachments";
const FILE_HELP_ID = "stock-requisition-attachments-help";
const FILE_ERROR_ID = "stock-requisition-attachments-error";

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".docx",
  ".xlsx",
] as const;

function isAllowedFile(file: File): boolean {
  const name = file.name.toLowerCase();

  return ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function fileIdentity(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StockRequisitionSupportingDocument({
  files,
  onFilesChange,
  disabled = false,
}: SupportingDocumentsProps) {
  const [error, setError] = useState("");

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const availableSlots = MAX_FILES - files.length;

    if (selectedFiles.length > availableSlots) {
      setError(`You can attach up to ${MAX_FILES} files.`);
      input.value = "";
      return;
    }

    const invalidType = selectedFiles.find((file) => !isAllowedFile(file));

    if (invalidType) {
      setError(`${invalidType.name} is not an accepted file type.`);
      input.value = "";
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_FILE_SIZE,
    );

    if (oversizedFile) {
      setError(`${oversizedFile.name} is larger than 5 MB.`);
      input.value = "";
      return;
    }

    const knownFiles = new Set(files.map(fileIdentity));
    const duplicateFile = selectedFiles.find((file) => {
      const identity = fileIdentity(file);

      if (knownFiles.has(identity)) {
        return true;
      }

      knownFiles.add(identity);
      return false;
    });

    if (duplicateFile) {
      setError(`${duplicateFile.name} has already been selected.`);
      input.value = "";
      return;
    }

    setError("");
    onFilesChange([...files, ...selectedFiles]);

    /* Allow a removed file to be selected again. */
    input.value = "";
  }

  function removeFile(fileToRemove: File) {
    const identityToRemove = fileIdentity(fileToRemove);

    onFilesChange(
      files.filter((file) => fileIdentity(file) !== identityToRemove),
    );
    setError("");
  }

  const describedBy = error
    ? `${FILE_HELP_ID} ${FILE_ERROR_ID}`
    : FILE_HELP_ID;

  return (
    <div className="space-y-4 sm:col-span-2">
      <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label
              htmlFor={FILE_INPUT_ID}
              className="block text-base font-semibold text-ink"
            >
              Supporting files
            </label>
            <p id={FILE_HELP_ID} className="mt-1 text-sm leading-6 text-muted">
              PDF, JPG, PNG, WEBP, DOCX, or XLSX. Maximum 5 MB each and 10
              files total. Files remain private.
            </p>
          </div>

          <label
            htmlFor={FILE_INPUT_ID}
            className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-brand bg-white px-5 py-3 font-semibold text-brand shadow-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${
              disabled || files.length >= MAX_FILES
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-blue-50"
            }`}
          >
            <Icon name="plus" />
            Choose files
          </label>

          <input
            id={FILE_INPUT_ID}
            name="attachments"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
            onChange={handleFiles}
            disabled={disabled || files.length >= MAX_FILES}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className="sr-only"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-white px-3 py-1 font-medium text-ink shadow-sm">
            {files.length} of {MAX_FILES} files selected
          </span>
          {files.length >= MAX_FILES && (
            <span className="font-medium text-muted">File limit reached</span>
          )}
        </div>
      </div>

      {error && (
        <p
          id={FILE_ERROR_ID}
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      {files.length > 0 && (
        <section aria-labelledby="selected-supporting-files-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3
              id="selected-supporting-files-title"
              className="font-semibold text-ink"
            >
              Selected documents
            </h3>
            <button
              type="button"
              onClick={() => {
                onFilesChange([]);
                setError("");
              }}
              disabled={disabled}
              className="min-h-10 rounded-lg px-3 text-sm font-medium text-danger hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove all
            </button>
          </div>

          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {files.map((file) => (
              <li
                key={fileIdentity(file)}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-line/70 bg-white p-3"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-brand">
                  <Icon name="file" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">
                    {file.name}
                  </span>
                  <span className="block text-sm text-muted">
                    {formatFileSize(file.size)}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => removeFile(file)}
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                  title="Remove file"
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-danger hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
