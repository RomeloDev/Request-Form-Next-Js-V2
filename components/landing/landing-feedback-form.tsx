"use client";

import { useRef, useState, type FormEvent } from "react";
import FormAlert from "@/components/ui/form-alert";
import FormField from "@/components/ui/form-field";
import FormSelect from "@/components/ui/form-select";
import FormTextarea from "@/components/ui/form-textarea";
import SubmitButton from "@/components/ui/submit-button";
import {
  FEEDBACK_OPINIONS,
  FeedbackSubmissionError,
  submitFeedback,
  type FeedbackField,
  type FeedbackFieldErrors,
  type FeedbackOpinion,
  type FeedbackPayload,
} from "@/lib/feedback";

type FeedbackFormValues = Record<FeedbackField, string>;

const INITIAL_VALUES: FeedbackFormValues = {
  name: "",
  email: "",
  phone: "",
  department: "",
  opinion: "",
  other_opinion: "",
  message: "",
};

const FIELD_IDS: Record<FeedbackField, string> = {
  name: "feedback-name",
  email: "feedback-email",
  phone: "feedback-phone",
  department: "feedback-department",
  opinion: "feedback-opinion",
  other_opinion: "feedback-other-opinion",
  message: "feedback-message",
};

// Labels stay in the UI layer; FEEDBACK_OPINIONS only carries API values.
const OPINION_LABELS: Record<FeedbackOpinion, string> = {
  suggestion: "Suggestion",
  complaint: "Complaint",
  compliment: "Compliment",
  other: "Other",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{11}$/;
const MESSAGE_MAX_LENGTH = 2000;
const CONTROL_CLASS_NAME =
  "!min-h-10 !rounded-lg !px-3 !py-2 !text-sm !leading-5";
const SUCCESS_FALLBACK_MESSAGE = "Thank you for your feedback.";
const VALIDATION_SUMMARY = "Please check the highlighted fields and try again.";
const UNEXPECTED_SUMMARY = "Something went wrong. Please try again.";

function isFeedbackOpinion(value: string): value is FeedbackOpinion {
  return FEEDBACK_OPINIONS.some((opinion) => opinion === value);
}

function validateFeedback(values: FeedbackFormValues): FeedbackFieldErrors {
  const errors: FeedbackFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const department = values.department.trim();
  const message = values.message.trim();

  if (name.length < 2 || name.length > 255) {
    errors.name = "Enter your name using 2–255 characters.";
  }

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address (maximum 255 characters).";
  }

  if (values.phone.length > 0 && !PHONE_PATTERN.test(values.phone)) {
    errors.phone = "Enter exactly 11 digits, or leave this field blank.";
  }

  if (department.length < 2 || department.length > 255) {
    errors.department = "Enter your department using 2–255 characters.";
  }

  if (!isFeedbackOpinion(values.opinion)) {
    errors.opinion = "Choose a feedback type.";
  } else if (
    values.opinion === "other" &&
    (values.other_opinion.trim().length < 2 ||
      values.other_opinion.trim().length > 255)
  ) {
    errors.other_opinion =
      "Describe the other feedback type using 2–255 characters.";
  }

  if (
    message.length < 2 ||
    values.message.length > MESSAGE_MAX_LENGTH
  ) {
    errors.message = "Enter a message between 2 and 2,000 characters.";
  }

  return errors;
}

function buildFeedbackPayload(
  values: FeedbackFormValues,
): FeedbackPayload | null {
  if (!isFeedbackOpinion(values.opinion)) {
    return null;
  }

  const base = {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim() || null,
    department: values.department.trim(),
    message: values.message.trim(),
  };

  if (values.opinion === "other") {
    const otherOpinion = values.other_opinion.trim();

    if (!otherOpinion) {
      return null;
    }

    return {
      ...base,
      opinion: "other",
      other_opinion: otherOpinion,
    };
  }

  return {
    ...base,
    opinion: values.opinion,
  };
}

type SubmissionSuccess = {
  message: string;
  feedbackCode: string;
};

export default function LandingFeedbackForm() {
  const [values, setValues] = useState<FeedbackFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FeedbackFieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<SubmissionSuccess | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const submittingRef = useRef(false);

  function focusField(field: FeedbackField) {
    requestAnimationFrame(() => {
      document.getElementById(FIELD_IDS[field])?.focus();
    });
  }

  function focusErrorSummary() {
    requestAnimationFrame(() => {
      errorSummaryRef.current?.focus();
    });
  }

  function clearError(field: FeedbackField) {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateField(field: FeedbackField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    clearError(field);
    // A corrected field makes the previous form-level error stale.
    setSummary(null);
  }

  function updatePhone(value: string) {
    updateField("phone", value.replace(/\D/g, "").slice(0, 11));
  }

  function updateOpinion(value: string) {
    setValues((current) => ({
      ...current,
      opinion: value,
      // Hidden values must never survive a switch away from "Other".
      other_opinion: value === "other" ? current.other_opinion : "",
    }));

    setErrors((current) => {
      const next = { ...current };
      delete next.opinion;

      if (value !== "other") {
        delete next.other_opinion;
      }

      return next;
    });

    setSummary(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Double-submit guard: the button is also disabled while pending.
    if (submittingRef.current) {
      return;
    }

    setSummary(null);
    const nextErrors = validateFeedback(values);
    setErrors(nextErrors);

    const firstInvalidField = (
      Object.keys(FIELD_IDS) as FeedbackField[]
    ).find((field) => nextErrors[field]);

    if (firstInvalidField) {
      setSummary(VALIDATION_SUMMARY);
      focusField(firstInvalidField);
      return;
    }

    const payload = buildFeedbackPayload(values);

    if (!payload) {
      setSummary(VALIDATION_SUMMARY);
      focusErrorSummary();
      return;
    }

    submittingRef.current = true;
    setPending(true);

    try {
      const response = await submitFeedback(payload);

      // Reset only after the backend confirms the submission.
      setValues({ ...INITIAL_VALUES });
      setErrors({});
      setSummary(null);
      setSuccess({
        message: response.message.trim() || SUCCESS_FALLBACK_MESSAGE,
        feedbackCode: response.feedback_code,
      });
      requestAnimationFrame(() => {
        successHeadingRef.current?.focus();
      });
    } catch (error) {
      // The typed client already maps every response to a safe message.
      if (error instanceof FeedbackSubmissionError) {
        if (error.code === "validation") {
          setErrors(error.fieldErrors);
        }

        setSummary(error.message);
        focusErrorSummary();
      } else {
        setSummary(UNEXPECTED_SUMMARY);
        focusErrorSummary();
      }
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  function submitAnother() {
    setSuccess(null);
    setValues({ ...INITIAL_VALUES });
    setErrors({});
    setSummary(null);
    requestAnimationFrame(() => {
      document.getElementById(FIELD_IDS.name)?.focus();
    });
  }

  if (success) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
      >
        <h3
          ref={successHeadingRef}
          tabIndex={-1}
          className="rounded-sm text-base leading-6 font-semibold focus:outline-2 focus:outline-offset-4 focus:outline-brand"
        >
          Thank you for your feedback
        </h3>
        <p className="mt-2 text-sm leading-6">{success.message}</p>
        <p className="mt-4 text-sm leading-6">
          Your reference code is{" "}
          <span className="select-all rounded-md bg-white px-2 py-1 font-mono text-sm font-medium text-ink">
            {success.feedbackCode}
          </span>
        </p>
        <p className="mt-3 text-sm leading-6">
          Keep this code in case you need to follow up with us.
        </p>
        <SubmitButton
          type="button"
          onClick={submitAnother}
          className="mt-5"
        >
          Submit another feedback
        </SubmitButton>
      </div>
    );
  }

  return (
    <>
      <p
        id="feedback-required-note"
        className="text-xs leading-5 text-muted"
      >
        Fields marked{" "}
        <span aria-hidden="true" className="text-danger">
          *
        </span>{" "}
        are required.
      </p>

      {summary && (
        <FormAlert
          ref={errorSummaryRef}
          message={summary}
          onDismiss={() => setSummary(null)}
        />
      )}

      <form
        id="feedback-form"
        aria-label="Send feedback"
        aria-describedby="feedback-required-note"
        aria-busy={pending}
        noValidate
        onSubmit={submit}
        className="mt-3 space-y-4 [&_label]:text-sm [&_label]:leading-5 [&_p[id$='-hint']]:text-xs [&_p[id$='-hint']]:leading-5 [&_p[id$='-error']]:text-xs [&_p[id$='-error']]:leading-5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            id={FIELD_IDS.name}
            name="name"
            label="Name"
            placeholder="Your full name"
            autoComplete="name"
            maxLength={255}
            className={CONTROL_CLASS_NAME}
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            error={errors.name}
            required
          />

          <FormField
            id={FIELD_IDS.email}
            name="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={255}
            className={CONTROL_CLASS_NAME}
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            error={errors.email}
            required
          />

          <FormField
            id={FIELD_IDS.phone}
            name="phone"
            label="Phone number (optional)"
            type="tel"
            placeholder="09XXXXXXXXX"
            autoComplete="tel"
            inputMode="numeric"
            pattern="[0-9]{11}"
            maxLength={11}
            className={CONTROL_CLASS_NAME}
            value={values.phone}
            onChange={(event) => updatePhone(event.target.value)}
            error={errors.phone}
            hint="Enter 11 digits, including the leading zero."
          />

          <FormField
            id={FIELD_IDS.department}
            name="department"
            label="Department"
            placeholder="Your department"
            maxLength={255}
            className={CONTROL_CLASS_NAME}
            value={values.department}
            onChange={(event) =>
              updateField("department", event.target.value)
            }
            error={errors.department}
            required
          />
        </div>

        <div
          className={
            values.opinion === "other"
              ? "grid gap-3 sm:grid-cols-2"
              : undefined
          }
        >
          <FormSelect
            id={FIELD_IDS.opinion}
            name="opinion"
            label="Feedback type"
            value={values.opinion}
            onChange={(event) => updateOpinion(event.target.value)}
            error={errors.opinion}
            className={CONTROL_CLASS_NAME}
            required
          >
            <option value="" disabled>
              Select a feedback type
            </option>
            {FEEDBACK_OPINIONS.map((opinion) => (
              <option key={opinion} value={opinion}>
                {OPINION_LABELS[opinion]}
              </option>
            ))}
          </FormSelect>

          {values.opinion === "other" && (
            <FormField
              id={FIELD_IDS.other_opinion}
              name="other_opinion"
              label="Other feedback type"
              placeholder="Describe the feedback type"
              maxLength={255}
              className={CONTROL_CLASS_NAME}
              value={values.other_opinion}
              onChange={(event) =>
                updateField("other_opinion", event.target.value)
              }
              error={errors.other_opinion}
              required
            />
          )}
        </div>

        <FormTextarea
          id={FIELD_IDS.message}
          name="message"
          label="Message"
          placeholder="Tell us what is on your mind."
          rows={4}
          maxLength={MESSAGE_MAX_LENGTH}
          className="!min-h-28 !rounded-lg !px-3 !py-2 !text-sm !leading-5"
          value={values.message}
          onChange={(event) => updateField("message", event.target.value)}
          error={errors.message}
          hint="Include the details that will help us understand your feedback."
          aria-describedby="feedback-message-count"
          labelAction={
            <span
              id="feedback-message-count"
              className="text-xs leading-5 text-muted"
            >
              {values.message.length}/{MESSAGE_MAX_LENGTH}
            </span>
          }
          required
        />

        <SubmitButton
          pending={pending}
          pendingLabel="Sending feedback…"
          className="!min-h-11 !rounded-lg !py-2.5 !text-sm !leading-5 shadow-[0_12px_26px_-14px_rgba(36,88,211,0.9)]"
        >
          Send feedback
        </SubmitButton>
      </form>
    </>
  );
}
