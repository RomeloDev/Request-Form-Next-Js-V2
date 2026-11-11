"use client";

import { useState, type ChangeEvent } from "react";
import Icon from "@/components/ui/icon";
import type { MyRequestAttachment } from "@/lib/requests/my-requests";

export type SupportingDocumentsProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingFiles?: MyRequestAttachment[];
  removedExistingFileIds?: number[];
  onRemovedExistingFileIdsChange?: (ids: number[]) => void;
  disabled?: boolean;
};

export type RequestSupportingDocumentsProps = SupportingDocumentsProps;

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FILE_INPUT_ID = "request-attachments";
const FILE_HELP_ID = "request-attachments-help";
const FILE_ERROR_ID = "request-attachments-error";

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

export default function RequestSupportingDocuments({
  files,
  onFilesChange,
  existingFiles = [],
  removedExistingFileIds = [],
  onRemovedExistingFileIdsChange,
  disabled = false,
}: SupportingDocumentsProps) {
  const [error, setError] = useState("");
  const removedExistingIds = new Set(removedExistingFileIds);
  const retainedExistingCount = existingFiles.filter(
    (file) => !removedExistingIds.has(file.id),
  ).length;
  const finalFileCount = retainedExistingCount + files.length;

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const availableSlots = MAX_FILES - finalFileCount;

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

  function toggleExistingFile(fileId: number) {
    if (!onRemovedExistingFileIdsChange) {
      return;
    }

    const nextIds = removedExistingIds.has(fileId)
      ? removedExistingFileIds.filter((id) => id !== fileId)
      : [...removedExistingFileIds, fileId];

    setError("");
    onRemovedExistingFileIdsChange(nextIds);
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
              disabled || finalFileCount >= MAX_FILES
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
            disabled={disabled || finalFileCount >= MAX_FILES}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className="sr-only"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-white px-3 py-1 font-medium text-ink shadow-sm">
            {finalFileCount} of {MAX_FILES} files after saving
          </span>
          {removedExistingFileIds.length > 0 && (
            <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-danger">
              {removedExistingFileIds.length} marked for removal
            </span>
          )}
          {finalFileCount >= MAX_FILES && (
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

      {existingFiles.length > 0 && (
        <section aria-labelledby="existing-supporting-files-title">
          <h3
            id="existing-supporting-files-title"
            className="font-semibold text-ink"
          >
            Existing documents
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            Files marked for removal are deleted only after the update is
            saved. Use Undo to keep a file.
          </p>

          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {existingFiles.map((file) => {
              const removed = removedExistingIds.has(file.id);

              return (
                <li
                  key={file.id}
                  className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 ${
                    removed
                      ? "border-red-200 bg-red-50/60"
                      : "border-line/70 bg-white"
                  }`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                      removed
                        ? "bg-red-100 text-danger"
                        : "bg-blue-50 text-brand"
                    }`}
                  >
                    <Icon name="file" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-medium ${
                        removed
                          ? "text-danger line-through"
                          : "text-ink"
                      }`}
                    >
                      {file.original_name}
                    </span>
                    <span className="block text-sm text-muted">
                      {formatFileSize(file.size_bytes)}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleExistingFile(file.id)}
                    disabled={
                      disabled || !onRemovedExistingFileIdsChange
                    }
                    aria-label={`${removed ? "Keep" : "Remove"} ${file.original_name}`}
                    className={`min-h-11 rounded-xl px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      removed
                        ? "text-brand hover:bg-blue-50 focus-visible:outline-brand"
                        : "text-danger hover:bg-red-50 focus-visible:outline-danger"
                    }`}
                  >
                    {removed ? "Undo" : "Remove"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {files.length > 0 && (
        <section aria-labelledby="selected-supporting-files-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3
              id="selected-supporting-files-title"
              className="font-semibold text-ink"
            >
              New documents
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
