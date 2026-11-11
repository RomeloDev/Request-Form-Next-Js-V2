"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layouts/page-header";
import ApproverSelector from "@/components/requests/common/approver-selector";
import RequestItemsEditor, {
  createDraftRequestItem,
  type DraftRequestItem,
} from "@/components/requests/common/request-items-editor";
import StockRequisitionReviewDialog from "@/components/requests/stock-requisition/stock-requisition-review-dialog";
import RequestSupportingDocuments from "@/components/requests/common/request-supporting-documents";
import FormAlert from "@/components/ui/form-alert";
import FormRadioGroup from "@/components/ui/form-radio-group";
import FormSelect from "@/components/ui/form-select";
import FormSection from "@/components/ui/form-section";
import Icon from "@/components/ui/icon";
import SubmitButton from "@/components/ui/submit-button";
import { ApiError } from "@/lib/api";
import {
  createStockRequisition,
  updateStockRequisition,
  type ApproverCandidate,
} from "@/lib/requests/stock-requisitions";
import type {
  MyRequestDetails,
  MyRequestPerson,
} from "@/lib/requests/my-requests";
import {
  isStockRequisitionKind,
  isStockRequisitionPurpose,
  STOCK_REQUISITION_KIND_OPTIONS,
  STOCK_REQUISITION_PURPOSE_OPTIONS,
} from "@/lib/requests/stock-requisition-options";

function firstValidationMessage(error: ApiError): string | undefined {
  return Object.values(error.errors)
    .flat()
    .find((message) => message.trim() !== "");
}

type StockRequisitionPageProps = {
  initialRequest?: MyRequestDetails;
};

function personToCandidate(person: MyRequestPerson): ApproverCandidate {
  return {
    id: person.id,
    firstname: person.firstname,
    lastname: person.lastname,
    position: person.position,
    branch_code: null,
    branch: null,
  };
}

function initialPurpose(request?: MyRequestDetails): string {
  const purpose = request?.form_data?.purpose;

  return typeof purpose === "string" ? purpose : "";
}

function initialItems(
  request?: MyRequestDetails,
): DraftRequestItem[] {
  if (!request || request.items.length === 0) {
    return [createDraftRequestItem(1)];
  }

  return request.items.map((item, index) => ({
    clientId: index + 1,
    quantity: String(item.quantity),
    description: item.description,
    unitCost: item.unit_cost,
    remarks: item.remarks ?? "",
  }));
}

export default function StockRequisitionPage({
  initialRequest,
}: StockRequisitionPageProps) {
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const editing = initialRequest !== undefined;

  const [kindOfRequest, setKindOfRequest] = useState(
    initialRequest?.kind_of_request ?? "",
  );
  const [purpose, setPurpose] = useState(
    initialPurpose(initialRequest),
  );
  const [items, setItems] = useState<DraftRequestItem[]>(() =>
    initialItems(initialRequest),
  );
  const [notedBy, setNotedBy] = useState<ApproverCandidate[]>(() =>
    initialRequest?.approval_steps
      .filter((step) => step.step_type === "noted_by")
      .map((step) => personToCandidate(step.approver)) ?? [],
  );
  const [approvedBy, setApprovedBy] = useState<ApproverCandidate[]>(() =>
    initialRequest?.approval_steps
      .filter((step) => step.step_type === "approved_by")
      .map((step) => personToCandidate(step.approver)) ?? [],
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>(
    [],
  );
  const [formError, setFormError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [savedRequestCode, setSavedRequestCode] = useState("");

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
      const commonInput = {
        purpose,
        notedByIds: notedBy.map((candidate) => candidate.id),
        approvedByIds: approvedBy.map((candidate) => candidate.id),
        items: items.map((item) => ({
          quantity: item.quantity,
          description: item.description,
          unitCost: item.unitCost,
          remarks: item.remarks,
        })),
      };

      const response = initialRequest
        ? await updateStockRequisition(initialRequest.id, {
            ...commonInput,
            updatedAt: initialRequest.updated_at ?? "",
            kindOfRequest,
            attachments,
            removedAttachmentIds,
          })
        : isStockRequisitionKind(kindOfRequest) &&
            isStockRequisitionPurpose(purpose)
          ? await createStockRequisition({
              ...commonInput,
              kindOfRequest,
              purpose,
              attachments,
            })
          : null;

      if (!response) {
        setSubmissionError(
          "Choose a valid request category and purpose.",
        );
        return;
      }

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
          editing
            ? "You are not allowed to edit this request."
            : "You are not allowed to create this request.",
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
          `The server could not ${editing ? "update" : "create"} the request. Wait a moment and verify the request status before trying again.`,
        );
        return;
      }

      setSubmissionError(
        `We couldn’t confirm whether the request was ${editing ? "updated" : "created"}. Do not submit it again immediately. Refresh and verify the request status first.`,
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
          title={`Stock Requisition ${editing ? "updated" : "created"}`}
          description={`The system accepted and ${editing ? "updated" : "saved"} your request.`}
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
                Request {editing ? "updated" : "submitted"} successfully
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
        title={`${editing ? "Edit" : "Create"} Stock Requisition`}
        description={
          editing
            ? "Update the request details, items, and approval routing. Existing supporting documents will be retained."
            : "Provide the request details, requested items, supporting documents, and required approvers."
        }
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
              onChange={(event) =>
                setKindOfRequest(event.target.value)
              }
              required
              hint="Choose the category that best matches the items being requested."
            >
              <option value="" disabled>
                Select a kind of request
              </option>

              {kindOfRequest &&
                !isStockRequisitionKind(kindOfRequest) && (
                  <option value={kindOfRequest}>
                    {kindOfRequest}
                  </option>
                )}

              {STOCK_REQUISITION_KIND_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </FormSelect>
          </div>

          <div className="sm:col-span-2">
            <FormRadioGroup<string>
              name="purpose"
              label="Purpose"
              options={
                purpose && !isStockRequisitionPurpose(purpose)
                  ? [
                      {
                        value: purpose,
                        label: purpose,
                        description:
                          "Purpose saved on the existing request.",
                      },
                      ...STOCK_REQUISITION_PURPOSE_OPTIONS,
                    ]
                  : STOCK_REQUISITION_PURPOSE_OPTIONS
              }
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
          description={
            editing
              ? "Keep or remove existing documents and add replacement files when needed."
              : "Attach quotations or other documents that support the request."
          }
        >
          <RequestSupportingDocuments
            files={attachments}
            onFilesChange={setAttachments}
            existingFiles={initialRequest?.attachments}
            removedExistingFileIds={removedAttachmentIds}
            onRemovedExistingFileIdsChange={
              editing ? setRemovedAttachmentIds : undefined
            }
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
            Review {editing ? "changes" : "request"}
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
          attachmentCount={
            (initialRequest?.attachments.length ?? 0) -
            removedAttachmentIds.length +
            attachments.length
          }
          newAttachmentCount={attachments.length}
          removedAttachmentCount={removedAttachmentIds.length}
          mode={editing ? "edit" : "create"}
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
