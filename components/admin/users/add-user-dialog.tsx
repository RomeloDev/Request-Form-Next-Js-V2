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
import BulkUserUpload, {
  type BulkUserUploadState,
} from "@/components/admin/users/bulk-user-upload";
import { ApiError, type ValidationErrors } from "@/lib/api";
import {
  createAdminUser,
  loadEditUserOptions,
  type BranchOption,
  type CreateAdminUserInput,
  type PositionOption,
} from "@/lib/admin/users";

type AddUserDialogProps = {
  onClose: () => void;
  onCreated: (message: string) => void;
};

const emptyValues: CreateAdminUserInput = {
  firstName: "",
  lastName: "",
  employee_id: "",
  contact: "",
  userName: "",
  email: "",
  password: "",
  password_confirmation: "",
  position: "",
  branch_code: "",
};

const sectionClass = "grid gap-5 sm:grid-cols-2";
const headingClass = "mb-5 text-lg font-semibold";

export default function AddUserDialog({ onClose, onCreated }: AddUserDialogProps) {
  const router = useRouter();
  const formId = useId();
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const [values, setValues] = useState<CreateAdminUserInput>(emptyValues);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkBlocked, setBulkBlocked] = useState(false);
  const [bulkUploadState, setBulkUploadState] =
    useState<BulkUserUploadState>({ status: "form" });

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
    if (mode !== "single") return;

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
  }, [lookupAttempt, mode]);

  function changeField(
    field: keyof CreateAdminUserInput,
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

  function changeBranch(branchCode: string) {
    const selected = branches.find(
      (branch) => branch.branch_code === branchCode,
    );

    if (!selected) return;

    // Send only the branch code; Laravel derives the company name.
    setValues((previous) => ({
      ...previous,
      branch_code: selected.branch_code,
    }));

    setErrors((previous) => ({
      ...previous,
      branch_code: [],
    }));
  }

  function retryLookups() {
    setLookupState("loading");
    setLookupAttempt((previous) => previous + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inFlight.current || saving || blocked || lookupState !== "ready") {
      return;
    }

    // Laravel still checks this. Doing it here only avoids a round trip.
    if (values.password !== values.password_confirmation) {
      setErrors((previous) => ({
        ...previous,
        password_confirmation: ["The password confirmation does not match."],
      }));
      setMessage("Please check the highlighted fields.");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    inFlight.current = true;
    setSaving(true);
    setMessage("");
    setErrors({});

    try {
      // createAdminUser allowlists the payload, so only approved fields leave
      // the browser. This object never goes into browser storage or a log.
      const response = await createAdminUser(values);

      onCreated(response.message);
    } catch (error) {
      // 401 and 419 mean the Sanctum session is gone, so a retry cannot work.
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        router.replace("/login");
        onClose();
        return;
      }

      if (error instanceof ApiError && error.status === 422) {
        setErrors(error.errors);
        setMessage("Please check the highlighted fields.");
      } else if (error instanceof ApiError && error.status === 403) {
        setBlocked(true);
        setMessage("You don’t have permission to create user accounts.");
      } else if (error instanceof ApiError && error.status === 429) {
        setMessage("Too many requests. Wait a moment, then try again.");
      } else {
        setBlocked(true);
        setMessage(
          "We couldn’t confirm whether the account was created. " +
          "Close this dialog and refresh the user directory before trying again.",
        );
      }

      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  const selectedBranch = branches.find(
    (branch) => branch.branch_code === values.branch_code,
  );

  if (mode === "bulk") {
    const bulkSubmitting = bulkUploadState.status === "submitting";
    const bulkSucceeded = bulkUploadState.status === "success";
    const bulkFailed = bulkUploadState.status === "failure";

    return (
      <Modal
        open
        title={
          bulkSubmitting
            ? "Creating users"
            : bulkSucceeded
              ? "Bulk upload complete"
              : bulkFailed
                ? "Bulk upload result"
                : "Bulk upload users"
        }
        onClose={onClose}
        dismissible={!bulkBusy && !bulkSucceeded}
        maxWidth="5xl"
        footer={
          bulkSubmitting ? (
            <p role="status" className="py-2 text-sm leading-6 text-muted">
              Waiting for Laravel to finish the transaction…
            </p>
          ) : bulkSucceeded ? (
            <button
              type="button"
              onClick={() => onCreated(bulkUploadState.message)}
              className="min-h-12 rounded-xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Done
            </button>
          ) : bulkFailed ? (
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={bulkBusy || bulkBlocked}
                onClick={() => setMode("single")}
                className="min-h-12 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-base font-semibold text-blue-800 enabled:hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-50"
              >
                Single user form
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={onClose}
                className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium text-ink enabled:hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
              >
                Close
              </button>
            </>
          )
        }
      >
        <BulkUserUpload
          onClose={onClose}
          onUploadStateChange={setBulkUploadState}
          onBusyChange={setBulkBusy}
          onBlockedChange={setBulkBlocked}
        />
      </Modal>
    );
  }

  return (
    <Modal
      open
      title="Add user"
      onClose={onClose}
      dismissible={!saving}
      footer={
        <>
          <button
            type="button"
            disabled={saving}
            onClick={() => setMode("bulk")}
            className="min-h-12 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-base font-semibold text-blue-800 enabled:hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-50"
          >
            Bulk upload
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-12 rounded-xl border border-line bg-white px-5 py-3 text-base font-medium text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50"
          >
            {blocked ? "Close" : "Cancel"}
          </button>

          <button
            type="submit"
            form={formId}
            disabled={saving || blocked || lookupState !== "ready"}
            aria-busy={saving}
            className="min-h-12 rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create user"}
          </button>
        </>
      }
    >

      {/* <div role="note" className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-base leading-7 text-blue-950">
        <p className="font-semibold">A signature is required later</p>
        <p className="mt-1">
          This account starts without a profile picture or signature. The new
          user must add a signature from Profile before creating or deciding
          requests. Neither file is collected on this form.
        </p>
      </div> */}

      {lookupState === "loading" && (
        <p role="status" className="mt-5 text-base text-muted">
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

      {message && <FormAlert ref={alertRef} message={message} />}

      <form id={formId} onSubmit={handleSubmit}>
        <fieldset disabled={saving} className="space-y-7">
          <legend className="sr-only">New user account details</legend>

          <fieldset className={sectionClass}>
            <legend className={headingClass}>Personal details</legend>

            <FormField
              id={`${formId}-firstName`}
              label="First name"
              required
              autoComplete="given-name"
              maxLength={255}
              value={values.firstName}
              error={errors.firstName?.[0]}
              onChange={(event) =>
                changeField("firstName", event.target.value)
              }
            />

            <FormField
              id={`${formId}-lastName`}
              label="Last name"
              required
              autoComplete="family-name"
              maxLength={255}
              value={values.lastName}
              error={errors.lastName?.[0]}
              onChange={(event) =>
                changeField("lastName", event.target.value)
              }
            />

            <FormField
              id={`${formId}-employeeId`}
              label="Employee ID"
              required
              autoComplete="off"
              maxLength={255}
              value={values.employee_id}
              error={errors.employee_id?.[0]}
              onChange={(event) =>
                changeField("employee_id", event.target.value)
              }
            />

            <FormField
              id={`${formId}-contact`}
              label="Contact number"
              type="tel"
              inputMode="numeric"
              required
              autoComplete="tel"
              pattern="[0-9]{11}"
              maxLength={11}
              title="Enter exactly 11 digits."
              hint="Exactly 11 digits, for example 09171234567."
              value={values.contact}
              error={errors.contact?.[0]}
              onChange={(event) =>
                changeField("contact", event.target.value)
              }
            />
          </fieldset>

          <fieldset className={sectionClass}>
            <legend className={headingClass}>Account details</legend>

            <FormField
              id={`${formId}-userName`}
              label="Username"
              required
              autoComplete="username"
              minLength={5}
              maxLength={255}
              pattern="[a-z0-9_-]{5,255}"
              title="Use 5–255 lowercase letters, numbers, dashes, or underscores."
              hint="5–255 characters using lowercase letters, numbers, dashes, or underscores."
              value={values.userName}
              error={errors.userName?.[0]}
              onChange={(event) =>
                changeField("userName", event.target.value)
              }
            />

            <FormField
              id={`${formId}-email`}
              label="Email address"
              type="email"
              required
              autoComplete="email"
              maxLength={255}
              value={values.email}
              error={errors.email?.[0]}
              onChange={(event) =>
                changeField("email", event.target.value)
              }
            />

            <FormField
              id={`${formId}-password`}
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              hint="At least 8 characters."
              value={values.password}
              error={errors.password?.[0]}
              onChange={(event) =>
                changeField("password", event.target.value)
              }
            />

            <FormField
              id={`${formId}-passwordConfirmation`}
              label="Confirm password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={values.password_confirmation}
              error={errors.password_confirmation?.[0]}
              onChange={(event) =>
                changeField("password_confirmation", event.target.value)
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

              {positions.map((position) => (
                <option key={position.id} value={position.value}>
                  {position.label}
                </option>
              ))}
            </FormSelect>

            <FormSelect
              id={`${formId}-branchCode`}
              label="Branch code"
              required
              value={values.branch_code}
              error={errors.branch_code?.[0]}
              onChange={(event) => changeBranch(event.target.value)}
            >
              <option value="" disabled>Select branch code</option>

              {branches.map((branch) => (
                <option key={branch.id} value={branch.branch_code}>
                  {branch.branch_code}
                </option>
              ))}
            </FormSelect>

            <div className="sm:col-span-2">
              <FormField
                id={`${formId}-company`}
                label="Branch / company"
                readOnly
                value={selectedBranch?.branch ?? ""}
                hint="Automatically selected from the branch code. It is never sent."
              />
            </div>

            {lookupState === "ready" &&
              (!branches.length || !positions.length) && (
                <p role="status" className="text-sm text-muted sm:col-span-2">
                  Some dropdown lists are empty. Check the branch and position
                  data before creating the account.
                </p>
              )}
          </fieldset>
        </fieldset>
      </form>
    </Modal>
  );
}
