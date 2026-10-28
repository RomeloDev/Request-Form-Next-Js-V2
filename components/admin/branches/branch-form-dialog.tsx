"use client";

import {
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import FormField from "@/components/ui/form-field";
import FormSelect from "@/components/ui/form-select";
import FormAlert from "@/components/ui/form-alert";
import { ApiError } from "@/lib/api";
import {
  createBranch,
  updateBranch,
  type BranchInput,
  type BranchRecord,
} from "@/lib/admin/branches";

type BranchFormDialogProps = {
  branch?: BranchRecord;
  onClose: () => void;
  onSaved: (message: string) => void;
};

type BranchDraft = {
  branch_code: string;
  branch_name: string;
  branch: string;
  acronym: string;
};

type BranchErrors = Record<keyof BranchDraft, string>;

function emptyErrors(): BranchErrors {
  return {
    branch_code: "",
    branch_name: "",
    branch: "",
    acronym: "",
  };
}

const companyOptions = [
  "Des Appliance Plaza, Inc.",
  "Des Strong Motors, Inc.",
  "Head Office",
  "Honda Des, Inc.",
  "Strong Moto Centrum, Inc.",
];

function acronymsFor(company: string): string[] {
  switch (company) {
    case "Strong Moto Centrum, Inc.":
      return ["SMCT", "KIA"];

    case "Des Strong Motors, Inc.":
      return ["DSM"];

    case "Honda Des, Inc.":
      return ["HD"];

    case "Des Appliance Plaza, Inc.":
    case "Des Appliance, Inc.":
      return ["DAP"];

    case "":
      return [];

    default:
      return ["HO"];
  }
}

export default function BranchFormDialog({
  branch,
  onClose,
  onSaved,
}: BranchFormDialogProps) {
  const formId = useId();

  const router = useRouter();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<BranchErrors>(emptyErrors);
  const [message, setMessage] = useState("");

  const [draft, setDraft] = useState<BranchDraft>(() => ({
    branch_code: branch?.branch_code ?? "",
    branch_name: branch?.branch_name ?? "",
    branch: branch?.branch ?? "",
    acronym: branch?.acronym ?? "",
  }));

  const acronymOptions = acronymsFor(draft.branch);

  function changeDraft(
    field: keyof BranchDraft,
    value: string,
    ) {
    setDraft((current) => ({
        ...current,
        [field]: value,
    }));

    setFieldErrors((current) => ({
        ...current,
        [field]: "",
    }));
    }

  function changeCompany(company: string) {
    const nextAcronyms = acronymsFor(company);

    setDraft((current) => ({
        ...current,
        branch: company,
        acronym: nextAcronyms[0] ?? "",
    }));

    setFieldErrors((current) => ({
        ...current,
        branch: "",
        acronym: "",
    }));
    }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
    ) {
    event.preventDefault();

    if (inFlight.current || blocked) return;

    inFlight.current = true;
    setSaving(true);
    setMessage("");
    setFieldErrors(emptyErrors());

    const values: BranchInput = {
        branch_code: draft.branch_code.trim(),
        branch_name: draft.branch_name.trim(),
        branch: draft.branch,
        acronym: draft.acronym,
    };

    try {
        const response = branch
        ? await updateBranch(branch.id, values)
        : await createBranch(values);

        onSaved(response.message);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        onClose();
        return;
        }

        if (error instanceof ApiError && error.status === 422) {
        setFieldErrors({
            branch_code: error.errors.branch_code?.[0] ?? "",
            branch_name: error.errors.branch_name?.[0] ?? "",
            branch: error.errors.branch?.[0] ?? "",
            acronym: error.errors.acronym?.[0] ?? "",
        });

        setMessage("Please check the highlighted fields.");
        } else {
        setBlocked(true);

        if (error instanceof ApiError && error.status === 403) {
            setMessage(
            "You don’t have permission to save this branch.",
            );
        } else if (
            error instanceof ApiError &&
            error.status === 404
        ) {
            setMessage(
            branch
                ? "This branch no longer exists. Close and refresh the list."
                : "Branch creation is unavailable. Close and refresh the page.",
            );
        } else if (
            error instanceof ApiError &&
            error.status === 419
        ) {
            setMessage(
            "Your session needs refreshing. Reload the page and try again.",
            );
        } else {
            setMessage(
            "We couldn’t confirm whether the branch was saved. " +
                "Close and refresh the list before trying again.",
            );
        }
        }

        requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
        inFlight.current = false;
        setSaving(false);
    }
    }

  return (
    <Modal
      open
      title={branch ? "Edit branch" : "Add branch"}
      onClose={onClose}
      footer={
        <>
            <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
            >
            {blocked ? "Close" : "Cancel"}
            </button>

            <button
            type="submit"
            form={formId}
            disabled={saving || blocked}
            aria-busy={saving}
            className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
            {saving
                ? "Saving…"
                : branch
                ? "Save changes"
                : "Add branch"}
            </button>
        </>
      }
      dismissible={!saving}
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormSelect
            id={`${formId}-company`}
            label="Company"
            required
            value={draft.branch}
            onChange={(event) =>
              changeCompany(event.target.value)
            }
            disabled={saving || blocked}
            error={fieldErrors.branch}
          >
            <option value="" disabled>
              Select a company
            </option>

            {draft.branch &&
              !companyOptions.includes(draft.branch) && (
                <option value={draft.branch}>
                  {draft.branch}
                </option>
              )}

            {companyOptions.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </FormSelect>

          <FormSelect
            id={`${formId}-acronym`}
            label="Acronym"
            required
            value={draft.acronym}
            hint={
              draft.branch === "Strong Moto Centrum, Inc."
                ? "Choose SMCT or KIA for this company."
                : "The acronym follows the selected company."
            }
            onChange={(event) =>
            changeDraft("acronym", event.target.value)
            }
            disabled={!draft.branch || saving || blocked}
            error={fieldErrors.acronym}
          >
            <option value="" disabled>
              Select an acronym
            </option>

            {acronymOptions.map((acronym) => (
              <option key={acronym} value={acronym}>
                {acronym}
              </option>
            ))}
          </FormSelect>
        </div>

        <FormField
          id={`${formId}-code`}
          label="Branch code"
          required
          maxLength={255}
          autoComplete="off"
          value={draft.branch_code}
          hint="Enter a unique code used to identify the branch."
          disabled={saving || blocked}
          error={fieldErrors.branch_code}
          onChange={(event) =>
            changeDraft("branch_code", event.target.value)
          }
        />

        <FormField
          id={`${formId}-name`}
          label="Branch name"
          required
          maxLength={150}
          autoComplete="off"
          value={draft.branch_name}
          hint="Laravel will save the branch name in uppercase."
          disabled={saving || blocked}
          error={fieldErrors.branch_name}
          onChange={(event) =>
            changeDraft("branch_name", event.target.value)
          }
        />

        {message && (
        <FormAlert ref={alertRef} message={message} />
        )}
      </form>
    </Modal>
  );
}