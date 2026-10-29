"use client";

import {
  useEffect,
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
import { ApiError, type ValidationErrors } from "@/lib/api";
import {
  loadEditUserOptions,
  updateUser,
  type AdminUser,
  type UpdateUserInput,
  type BranchOption,
  type PositionOption,
} from "@/lib/admin/users";

type EditUserDialogProps = {
  user: AdminUser;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const sectionClass = "grid gap-5 sm:grid-cols-2";
const headingClass = "mb-5 text-lg font-semibold";

const personalFields = [
  ["firstName", "First name"],
  ["lastName", "Last name"],
  ["contact", "Contact number"],
  ["employee_id", "Employee ID"],
] as const;

export default function EditUserDialog({
  user,
  onClose,
  onSaved,
}: EditUserDialogProps) {
  const router = useRouter();
  const formId = useId();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  // A separate draft: typing here does not modify the table row.
  const [values, setValues] = useState<UpdateUserInput>(() => ({
    firstName: user.firstname,
    lastName: user.lastname,
    email: user.email,
    userName: user.username,
    contact: user.contact,
    employee_id: user.employee_id,
    position: user.position,
    branch_code: user.branch_code,
    branch: user.branch,
    password: "",
  }));

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [lookupState, setLookupState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [lookupAttempt, setLookupAttempt] = useState(0);

  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Load dropdowns when the modal opens, or when Retry is clicked.
  useEffect(() => {
    const controller = new AbortController();

    loadEditUserOptions(controller.signal)
      .then((options) => {
        if (controller.signal.aborted) return;

        setBranches(options.branches);
        setPositions(options.positions);
        setLookupState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLookupState("error");
        }
      });

    return () => controller.abort();
  }, [lookupAttempt]);

  function changeField(
    field: keyof UpdateUserInput,
    value: string,
  ) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    // Remove this field's old validation error while it is edited.
    setErrors((previous) => ({
      ...previous,
      [field]: [],
    }));
  }

  function changeBranch(id: string) {
    const selected = branches.find(
      (branch) => String(branch.id) === id,
    );

    if (!selected) return;

    // Update the branch ID and its company together.
    setValues((previous) => ({
      ...previous,
      branch_code: String(selected.id),
      branch: selected.branch,
    }));

    setErrors((previous) => ({
      ...previous,
      branch_code: [],
      branch: [],
    }));
  }

  function retryLookups() {
    setLookupState("loading");
    setLookupAttempt((previous) => previous + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inFlight.current || blocked || lookupState !== "ready") {
      return;
    }

    inFlight.current = true;
    setSaving(true);
    setMessage("");
    setErrors({});

    try {
      // Match the reference: omit an empty optional password.
      const password = values.password?.trim();

      const response = await updateUser(user.id, {
        ...values,
        password: password || undefined,
      });

      onSaved(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          router.replace("/login");
          onClose();
          return;
        }

        if (error.status === 422) {
          setErrors(error.errors);
          setMessage("Please check the highlighted fields.");
        } else {
          setBlocked(true);

          if (error.status === 403) {
            setMessage("You don’t have permission to edit this account.");
          } else if (error.status === 404) {
            setMessage("This account no longer exists. Close and refresh the list.");
          } else if (error.status === 419) {
            setMessage("Your session needs refreshing. Reload the page and try again.");
          } else {
            setMessage(
              "We couldn’t confirm whether the changes were saved. " +
              "Close and refresh the list before trying again.",
            );
          }
        }
      } else {
        setBlocked(true);
        setMessage(
          "We couldn’t confirm whether the changes were saved. " +
          "Close and refresh the list before trying again.",
        );
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  // Preserve existing values if a lookup no longer contains them.
  const missingPosition =
    values.position &&
    !positions.some((position) => position.value === values.position);

  const missingBranch =
    values.branch_code &&
    !branches.some(
      (branch) => String(branch.id) === values.branch_code,
    );

  return (
    <Modal
      open
      title="Edit user"
      onClose={onClose}
      dismissible={!saving}
      footer={
        <>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-12 rounded-xl border border-line px-5 py-3 font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled
            title="The signature reset endpoint is not built yet."
            className="min-h-12 cursor-not-allowed rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 font-medium text-rose-400"
          >
            Reset Signature
          </button>

          <button
            type="submit"
            form={formId}
            disabled={saving || blocked || lookupState !== "ready"}
            aria-busy={saving}
            className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      {lookupState === "loading" && (
        <p role="status" className="mb-5 text-base text-muted">
          Loading branch and position options…
        </p>
      )}

      {lookupState === "error" && (
        <FormAlert message="Branch or position options couldn’t be loaded.">
          <button
            type="button"
            onClick={retryLookups}
            className="mt-2 min-h-11 rounded px-2 font-semibold underline"
          >
            Retry loading options
          </button>
        </FormAlert>
      )}

      {message && (
        <FormAlert ref={alertRef} message={message} />
      )}

      <form id={formId} onSubmit={handleSubmit} className="mt-5">
        <fieldset disabled={saving} className="space-y-7">
          <legend className="sr-only">User account details</legend>

          <fieldset className={sectionClass}>
            <legend className={headingClass}>Personal details</legend>

            {personalFields.map(([name, label]) => (
              <FormField
                key={name}
                id={`${formId}-${name}`}
                label={label}
                type={name === "contact" ? "tel" : "text"}
                required
                value={values[name]}
                error={errors[name]?.[0]}
                onChange={(event) =>
                  changeField(name, event.target.value)
                }
              />
            ))}
          </fieldset>

          <fieldset className={sectionClass}>
            <legend className={headingClass}>Account details</legend>

            <FormField
              id={`${formId}-email`}
              label="Email address"
              type="email"
              required
              value={values.email}
              error={errors.email?.[0]}
              onChange={(event) =>
                changeField("email", event.target.value)
              }
            />

            <FormField
              id={`${formId}-username`}
              label="Username"
              required
              value={values.userName}
              error={errors.userName?.[0]}
              onChange={(event) =>
                changeField("userName", event.target.value)
              }
            />


            <FormField
              id={`${formId}-password`}
              label="New password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={values.password ?? ""}
              error={errors.password?.[0]}
              hint="Optional. Leave blank to keep the existing password. Minimum 6 characters."
              onChange={(event) =>
                changeField("password", event.target.value)
              }
            />
          </fieldset>

          <fieldset
            className={sectionClass}
            disabled={lookupState !== "ready"}
          >
            <legend className={headingClass}>Work information</legend>

            <FormSelect
              id={`${formId}-position`}
              label="Position"
              required
              value={values.position}
              error={errors.position?.[0]}
              onChange={(event) =>
                changeField("position", event.target.value)
              }
            >
              <option value="" disabled>Select position</option>

              {missingPosition && (
                <option value={values.position}>
                  {values.position}
                </option>
              )}

              {positions.map((position) => (
                <option key={position.id} value={position.value}>
                  {position.label}
                </option>
              ))}
            </FormSelect>

            <FormSelect
              id={`${formId}-branch-code`}
              label="Branch code"
              required
              value={values.branch_code ?? ""}
              error={errors.branch_code?.[0]}
              onChange={(event) => changeBranch(event.target.value)}
            >
              <option value="" disabled>Select branch code</option>

              {missingBranch && (
                <option value={values.branch_code ?? ""}>
                  Current branch ID: {values.branch_code}
                </option>
              )}

              {branches.map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {branch.branch_code}
                </option>
              ))}
            </FormSelect>

            <div className="sm:col-span-2">
              <FormField
                id={`${formId}-company`}
                label="Branch / company"
                readOnly
                value={values.branch ?? ""}
                error={errors.branch?.[0]}
                hint="Automatically selected from the branch code."
              />
            </div>

            {lookupState === "ready" &&
              (!branches.length || !positions.length) && (
                <p role="status" className="text-sm text-muted sm:col-span-2">
                  Some dropdown lists are empty. Check the branch
                  and position data before assigning new values.
                </p>
              )}
          </fieldset>
        </fieldset>
      </form>
    </Modal>
  );
}