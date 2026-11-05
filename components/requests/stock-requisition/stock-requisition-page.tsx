"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layouts/page-header";
import ApproverSelector from "@/components/requests/stock-requisition/approver-selector";
import RequestItemsEditor, {
  createDraftRequestItem,
  type DraftRequestItem,
} from "@/components/requests/stock-requisition/request-items-editor";
import StockRequisitionReviewDialog from "@/components/requests/stock-requisition/stock-requisition-review-dialog";
import StockRequisitionSupportingDocument from "@/components/requests/stock-requisition/stock-requisition-supporting-document";
import FormAlert from "@/components/ui/form-alert";
import FormRadioGroup from "@/components/ui/form-radio-group";
import FormSelect from "@/components/ui/form-select";
import FormSection from "@/components/ui/form-section";
import Icon from "@/components/ui/icon";
import SubmitButton from "@/components/ui/submit-button";
import { ApiError } from "@/lib/api";
import {
  createStockRequisition,
  type ApproverCandidate,
} from "@/lib/requests/stock-requisitions";
import {
  isStockRequisitionKind,
  STOCK_REQUISITION_KIND_OPTIONS,
  STOCK_REQUISITION_PURPOSE_OPTIONS,
  type StockRequisitionKind,
  type StockRequisitionPurpose,
} from "@/lib/requests/stock-requisition-options";

function firstValidationMessage(error: ApiError): string | undefined {
  return Object.values(error.errors)
    .flat()
    .find((message) => message.trim() !== "");
}

export default function StockRequisitionPage() {
  const router = useRouter();
  const submissionInFlight = useRef(false);

  const [kindOfRequest, setKindOfRequest] =
    useState<StockRequisitionKind | "">("");
  const [purpose, setPurpose] =
    useState<StockRequisitionPurpose | "">("");
  const [items, setItems] = useState<DraftRequestItem[]>([
    createDraftRequestItem(1),
  ]);
  const [notedBy, setNotedBy] = useState<ApproverCandidate[]>([]);
  const [approvedBy, setApprovedBy] = useState<ApproverCandidate[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [formError, setFormError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [createdRequestCode, setCreatedRequestCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      !kindOfRequest ||
      !purpose ||
      approvedBy.length === 0
    ) {
      return;
    }

    submissionInFlight.current = true;
    setSubmitting(true);
    setSubmissionError("");

    try {
      const response = await createStockRequisition({
        kindOfRequest,
        purpose,
        notedByIds: notedBy.map((candidate) => candidate.id),
        approvedByIds: approvedBy.map((candidate) => candidate.id),
        items: items.map((item) => ({
          quantity: item.quantity,
          unit: item.unit,
          description: item.description,
          unitCost: item.unitCost,
          remarks: item.remarks,
        })),
        attachments,
      });

      setReviewOpen(false);
      setCreatedRequestCode(response.data.request_code);
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
        setSubmissionError("You are not allowed to create this request.");
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
          "The server could not complete the request. Wait a moment and verify the request status before trying again.",
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

  if (createdRequestCode) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="REQUESTS"
          title="Stock Requisition created"
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
                  {createdRequestCode}
                </strong>
                .
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Keep this code for reference. Do not submit the same request
                again.
              </p>
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
        title="Create Stock Requisition"
        description="Provide the request details, requested items, supporting documents, and required approvers."
      />

      <form
        className="rounded-2xl border border-line/70 bg-white p-5 shadow-sm sm:p-8"
        onSubmit={handleSubmit}
      >
        <FormSection
          number="1"
          title="Request details"
          description="Choose the request category and the purpose that best describes how it will be used."
        >
          <div className="sm:col-span-2">
            <FormSelect
              id="kind-of-request"
              name="kindOfRequest"
              label="Kind of request"
              value={kindOfRequest}
              onChange={(event) => {
                const selectedValue = event.target.value;

                if (isStockRequisitionKind(selectedValue)) {
                  setKindOfRequest(selectedValue);
                }
              }}
              required
              hint="Choose the category that best matches the items being requested."
            >
              <option value="" disabled>
                Select a kind of request
              </option>

              {STOCK_REQUISITION_KIND_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </FormSelect>
          </div>

          <div className="sm:col-span-2">
            <FormRadioGroup<StockRequisitionPurpose>
              name="purpose"
              label="Purpose"
              options={STOCK_REQUISITION_PURPOSE_OPTIONS}
              value={purpose}
              onValueChange={setPurpose}
              required
              hint="Choose one purpose. This selection will be shown to the request approvers."
            />
          </div>
        </FormSection>

        <FormSection
          number="2"
          title="Requested items"
          description="List each item, quantity, unit, and estimated unit cost."
        >
          <RequestItemsEditor
            items={items}
            onItemsChange={setItems}
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
          description="Attach quotations or other documents that support the request."
        >
          <StockRequisitionSupportingDocument
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

          <SubmitButton>
            Review request
          </SubmitButton>
        </div>
      </form>

      {reviewOpen && (
        <StockRequisitionReviewDialog
          kindOfRequest={kindOfRequest}
          purpose={purpose}
          itemCount={items.length}
          notedBy={notedBy}
          approvedBy={approvedBy}
          attachmentCount={attachments.length}
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
