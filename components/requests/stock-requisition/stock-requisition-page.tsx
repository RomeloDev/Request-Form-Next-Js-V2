"use client";

import { useState, type FormEvent } from "react";
import PageHeader from "@/components/layouts/page-header";
import RequestItemsEditor, {
  createDraftRequestItem,
  type DraftRequestItem,
} from "@/components/requests/stock-requisition/request-items-editor";
import StockRequisitionSupportingDocument from "@/components/requests/stock-requisition/stock-requisition-supporting-document";
import FormRadioGroup from "@/components/ui/form-radio-group";
import FormSelect from "@/components/ui/form-select";
import FormSection from "@/components/ui/form-section";
import FormAlert from "@/components/ui/form-alert";
import SubmitButton from "@/components/ui/submit-button";
import ApproverSelector from "@/components/requests/stock-requisition/approver-selector";
import type { ApproverCandidate } from "@/lib/requests/stock-requisitions";
import {
  isStockRequisitionKind,
  STOCK_REQUISITION_KIND_OPTIONS,
  STOCK_REQUISITION_PURPOSE_OPTIONS,
  type StockRequisitionKind,
  type StockRequisitionPurpose,
} from "@/lib/requests/stock-requisition-options";
import StockRequisitionReviewDialog from "@/components/requests/stock-requisition/stock-requisition-review-dialog";

export default function StockRequisitionPage() {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (approvedBy.length === 0) {
      setFormError("Select at least one Approved By user.");
      setReviewOpen(false);
      return;
    }

    setFormError("");
    setReviewOpen(true);
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

          {reviewOpen && (
            <p
              role="status"
              className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-800"
            >
              The request draft is ready for final confirmation.
            </p>
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
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  );
}
