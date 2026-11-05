"use client";

import { useState } from "react";
import PageHeader from "@/components/layouts/page-header";
import RequestItemsEditor, {
  createDraftRequestItem,
  type DraftRequestItem,
} from "@/components/requests/stock-requisition/request-items-editor";
import FormRadioGroup from "@/components/ui/form-radio-group";
import FormSelect from "@/components/ui/form-select";
import FormSection from "@/components/ui/form-section";
import ApproverSelector from "@/components/requests/stock-requisition/approver-selector";
import type { ApproverCandidate } from "@/lib/requests/stock-requisitions";
import {
  isStockRequisitionKind,
  STOCK_REQUISITION_KIND_OPTIONS,
  STOCK_REQUISITION_PURPOSE_OPTIONS,
  type StockRequisitionKind,
  type StockRequisitionPurpose,
} from "@/lib/requests/stock-requisition-options";

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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="REQUESTS"
        title="Create Stock Requisition"
        description="Provide the request details, requested items, supporting documents, and required approvers."
      />

      <form
        className="rounded-2xl border border-line/70 bg-white p-5 shadow-sm sm:p-8"
        onSubmit={(event) => {
          /*
           * Submission will be implemented after the remaining sections and
           * client-side validation are ready.
           */
          event.preventDefault();
        }}
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
                onApprovedByChange={setApprovedBy}
            />
        </FormSection>

        <FormSection
          number="4"
          title="Supporting documents"
          description="Attach quotations or other documents that support the request."
        >
          <p className="text-sm text-muted sm:col-span-2">
            Attachments are optional and will remain private.
          </p>
        </FormSection>
      </form>
    </div>
  );
}
