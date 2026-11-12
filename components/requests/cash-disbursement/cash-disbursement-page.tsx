"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layouts/page-header";
import ApproverSelector from "@/components/requests/common/approver-selector";
import RequestItemsEditor, {
  createDraftRequestItem,
  type DraftRequestItem,
} from "@/components/requests/common/request-items-editor";
import RequestSupportingDocuments from "@/components/requests/common/request-supporting-documents";
import CashDisbursementReviewDialog from "@/components/requests/cash-disbursement/cash-disbursement-review-dialog";
import FormAlert from "@/components/ui/form-alert";
import FormSelect from "@/components/ui/form-select";
import FormSection from "@/components/ui/form-section";
import Icon from "@/components/ui/icon";
import SubmitButton from "@/components/ui/submit-button";
import { ApiError } from "@/lib/api";
import { createCashDisbursement } from "@/lib/requests/cash-disbursements";
import type { ApproverCandidate } from "@/lib/requests/request-approvers";
import {
  isRequestCurrency,
  REQUEST_CURRENCY_OPTIONS,
  type RequestCurrency,
} from "@/lib/requests/request-currencies";
import {
  isRequestKind,
  REQUEST_KIND_OPTIONS,
} from "@/lib/requests/request-kind-options";

function firstValidationMessage(error: ApiError): string | undefined {
  return Object.values(error.errors)
    .flat()
    .find((message) => message.trim() !== "");
}

export default function CashDisbursementPage() {
  const router = useRouter();
  const submissionInFlight = useRef(false);

  const [kindOfRequest, setKindOfRequest] = useState("");
  const [currency, setCurrency] = useState<RequestCurrency>("PHP");
  const [items, setItems] = useState<DraftRequestItem[]>(() => [
    createDraftRequestItem(1),
  ]);
  const [notedBy, setNotedBy] = useState<ApproverCandidate[]>([]);
  const [approvedBy, setApprovedBy] = useState<ApproverCandidate[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [formError, setFormError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [savedRequestCode, setSavedRequestCode] = useState("");

  const currencyLabel =
    REQUEST_CURRENCY_OPTIONS.find(
      (option) => option.value === currency,
    )?.label ?? currency;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isRequestKind(kindOfRequest)) {
      setFormError("Choose a kind of request.");
      setReviewOpen(false);
      return;
    }

    if (!isRequestCurrency(currency)) {
      setFormError("Choose a currency.");
      setReviewOpen(false);
      return;
    }

    if (approvedBy.length === 0) {
      setFormError("Select at least one Approved By user.");
      setReviewOpen(false);
      return;
    }

    setFormError("");
    setSubmissionError("");
    setReviewOpen(true);
  }

  async function confirmSubmission() {
    if (
      submissionInFlight.current ||
      !isRequestKind(kindOfRequest) ||
      !isRequestCurrency(currency) ||
      approvedBy.length === 0
    ) {
      return;
    }

    submissionInFlight.current = true;
    setSubmitting(true);
    setSubmissionError("");

    try {
      const response = await createCashDisbursement({
        kindOfRequest,
        currency,
        notedByIds: notedBy.map((candidate) => candidate.id),
        approvedByIds: approvedBy.map((candidate) => candidate.id),
        items: items.map((item) => ({
          quantity: item.quantity,
          description: item.description,
          unitCost: item.unitCost,
          remarks: item.remarks,
        })),
        attachments,
      });

      setReviewOpen(false);
      setSavedRequestCode(response.data.request_code);
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        router.replace("/login");
        return;
      }

      if (error instanceof ApiError && error.status === 422) {
        setSubmissionError(
          firstValidationMessage(error) ??
            "Some request details are no longer valid. Return to the form and review them.",
        );
        return;
      }

      if (error instanceof ApiError && error.status === 403) {
        setSubmissionError(
          "You are not allowed to create this request.",
        );
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setSubmissionError(
          "This request is no longer available. Return to My Requests and refresh the list.",
        );
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        setSubmissionError(
          "This request changed or is no longer editable. Return to My Requests, refresh, and review its latest status.",
        );
        return;
      }

      if (error instanceof ApiError && error.status === 429) {
        setSubmissionError(
          "Too many requests were sent. Wait a moment before trying again.",
        );
        return;
      }

      if (error instanceof ApiError) {
        setSubmissionError(
          "The server could not create the request. Wait a moment and verify the request status before trying again.",
        );
        return;
      }

      setSubmissionError(
        "We couldn’t confirm whether the request was created. Do not submit it again immediately. Refresh and verify the request status first.",
      );
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }

  if (savedRequestCode) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="REQUESTS"
          title="Cash Disbursement created"
          description="The system accepted and saved your request."
        />

        <section
          role="status"
          className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Icon name="checkCircle" className="size-7" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Request submitted successfully
              </h2>
              <p className="mt-2 text-muted">
                Your request code is
                {" "}
                <strong className="font-semibold text-ink">
                  {savedRequestCode}
                </strong>
                .
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Keep this code for reference. Do not submit the same request
                again.
              </p>
              <Link
                href="/request"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                View My Requests
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="REQUESTS"
        title="Create Cash Disbursement Requisition Slip"
        description="Provide the request details, requested items, supporting documents, and required approvers."
      />

      <form
        className="rounded-2xl border border-line/70 bg-white p-5 shadow-sm sm:p-8"
        onSubmit={handleSubmit}
      >
        <FormSection
          number="1"
          title="Request details"
          description="Choose the request category and the currency for the requested amounts."
        >
          <div className="sm:col-span-2">
            <FormSelect
              id="kind-of-request"
              name="kindOfRequest"
              label="Kind of request"
              value={kindOfRequest}
              onChange={(event) =>
                setKindOfRequest(event.target.value)
              }
              required
              hint="Choose the category that best matches the items being requested."
            >
              <option value="" disabled>
                Select a kind of request
              </option>

              {REQUEST_KIND_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </FormSelect>
          </div>

          <div className="sm:col-span-2">
            <FormSelect
              id="currency"
              name="currency"
              label="Currency"
              value={currency}
              onChange={(event) => {
                const next = event.target.value;

                if (isRequestCurrency(next)) {
                  setCurrency(next);
                }
              }}
              required
              hint="Currency is a denomination only. No conversion is applied."
            >
              {REQUEST_CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
          </div>
        </FormSection>

        <FormSection
          number="2"
          title="Requested items"
          description="List each item, quantity, description, and estimated unit cost. Totals shown here are estimates only."
        >
          <RequestItemsEditor
            items={items}
            onItemsChange={setItems}
            currency={currency}
          />
        </FormSection>

        <FormSection
          number="3"
          title="Approval routing"
          description="Select the users who should note and approve this request."
        >
          <ApproverSelector
            notedBy={notedBy}
            approvedBy={approvedBy}
            onNotedByChange={setNotedBy}
            onApprovedByChange={(nextApprovedBy) => {
              setApprovedBy(nextApprovedBy);
              setFormError("");
              setReviewOpen(false);
            }}
          />
        </FormSection>

        <FormSection
          number="4"
          title="Supporting documents"
          description="Attach receipts or other documents that support the request."
        >
          <RequestSupportingDocuments
            files={attachments}
            onFilesChange={setAttachments}
          />
        </FormSection>

        <div className="mt-8 border-t border-line/70 pt-6">
          {formError && (
            <FormAlert
              message={formError}
              onDismiss={() => setFormError("")}
            />
          )}

          <SubmitButton>Review request</SubmitButton>
        </div>
      </form>

      {reviewOpen && (
        <CashDisbursementReviewDialog
          kindOfRequest={kindOfRequest}
          currencyLabel={currencyLabel}
          itemCount={items.length}
          attachmentCount={attachments.length}
          notedBy={notedBy}
          approvedBy={approvedBy}
          pending={submitting}
          error={submissionError}
          onConfirm={confirmSubmission}
          onClose={() => {
            if (!submitting) {
              setSubmissionError("");
              setReviewOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}
