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
import PurchaseOrderReviewDialog from "@/components/requests/purchase-order/purchase-order-review-dialog";
import SupplierSelector from "@/components/requests/purchase-order/supplier-selector";
import FormAlert from "@/components/ui/form-alert";
import FormSelect from "@/components/ui/form-select";
import FormSection from "@/components/ui/form-section";
import Icon from "@/components/ui/icon";
import SubmitButton from "@/components/ui/submit-button";
import { ApiError } from "@/lib/api";
import {
  createPurchaseOrder,
  parsePurchaseOrderFormData,
  updatePurchaseOrder,
} from "@/lib/requests/purchase-orders";
import {
  isPurchaseOrderKind,
  PURCHASE_ORDER_KIND_OPTIONS,
} from "@/lib/requests/purchase-order-options";
import type { ApproverCandidate } from "@/lib/requests/stock-requisitions";
import type {
  MyRequestDetails,
  MyRequestPerson,
} from "@/lib/requests/my-requests";

function firstValidationMessage(error: ApiError): string | undefined {
  return Object.values(error.errors)
    .flat()
    .find((message) => message.trim() !== "");
}

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

/**
 * Preview-only estimate. The browser never sends totals; Laravel derives
 * the authoritative line and grand totals from the submitted items.
 */
function estimateGrandTotal(items: DraftRequestItem[]): number | null {
  let total = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitCost);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100000 ||
      !Number.isFinite(unitCost) ||
      unitCost < 0 ||
      unitCost > 999999
    ) {
      return null;
    }

    total += quantity * unitCost;
  }

  return total;
}

function hasCompleteItems(items: DraftRequestItem[]): boolean {
  return items.every((item) => {
    const quantity = Number(item.quantity);
    const unitCost = item.unitCost.trim();

    return (
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= 100000 &&
      item.description.trim() !== "" &&
      /^\d*\.?\d*$/.test(unitCost) &&
      unitCost !== "" &&
      unitCost !== "." &&
      Number(unitCost) >= 0 &&
      Number(unitCost) <= 999999 &&
      (unitCost.split(".")[1]?.length ?? 0) <= 2
    );
  });
}

type PurchaseOrderPageProps = {
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

function initialItems(request?: MyRequestDetails): DraftRequestItem[] {
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

export default function PurchaseOrderPage({
  initialRequest,
}: PurchaseOrderPageProps) {
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const editing = initialRequest !== undefined;
  const initialSupplier = parsePurchaseOrderFormData(
    initialRequest?.form_data ?? null,
  );

  const [kindOfRequest, setKindOfRequest] = useState(
    initialRequest?.kind_of_request ?? "",
  );
  const [supplier, setSupplier] = useState(initialSupplier.supplier);
  const [address, setAddress] = useState(initialSupplier.address);
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

    if (!isPurchaseOrderKind(kindOfRequest)) {
      setFormError("Choose a kind of request.");
      setReviewOpen(false);
      return;
    }

    if (supplier.trim() === "") {
      setFormError("Enter the supplier name.");
      setReviewOpen(false);
      return;
    }

    if (address.trim() === "") {
      setFormError("Enter the supplier address.");
      setReviewOpen(false);
      return;
    }

    if (!hasCompleteItems(items)) {
      setFormError(
        "Complete every item's quantity, description, and unit cost.",
      );
      setReviewOpen(false);
      return;
    }

    if (approvedBy.length === 0) {
      setFormError("Select at least one Approved By user.");
      setReviewOpen(false);
      return;
    }

    const notedIds = new Set(notedBy.map((candidate) => candidate.id));
    if (approvedBy.some((candidate) => notedIds.has(candidate.id))) {
      setFormError("A user cannot be both Noted By and Approved By.");
      setReviewOpen(false);
      return;
    }

    setFormError("");
    setSubmissionError("");
    setReviewOpen(true);
  }

  async function confirmSubmission() {
    if (submissionInFlight.current || !isPurchaseOrderKind(kindOfRequest)) {
      return;
    }

    submissionInFlight.current = true;
    setSubmitting(true);
    setSubmissionError("");

    try {
      const input = {
        kindOfRequest,
        supplier,
        address,
        notedByIds: notedBy.map((candidate) => candidate.id),
        approvedByIds: approvedBy.map((candidate) => candidate.id),
        items: items.map((item) => ({
          quantity: item.quantity,
          description: item.description,
          unitCost: item.unitCost,
          remarks: item.remarks,
        })),
        attachments,
      };

      const response = initialRequest
        ? await updatePurchaseOrder(initialRequest.id, {
            ...input,
            updatedAt: initialRequest.updated_at ?? "",
            removedAttachmentIds,
          })
        : await createPurchaseOrder(input);

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
          title={`Purchase Order ${editing ? "updated" : "created"}`}
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

  const estimatedTotal = estimateGrandTotal(items);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="REQUESTS"
        title={`${editing ? "Edit" : "Create"} Purchase Order Requisition Slip`}
        description={
          editing
            ? "Update the supplier, requested items, approval routing, and supporting documents."
            : "Provide the supplier, requested items, supporting documents, and required approvers."
        }
      />

      <form
        className="rounded-2xl border border-line/70 bg-white p-5 shadow-sm sm:p-8"
        onSubmit={handleSubmit}
      >
        <FormSection
          number="1"
          title="Request details"
          description="Choose the request category and identify the supplier this purchase is for."
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

              {PURCHASE_ORDER_KIND_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </FormSelect>
          </div>

          <SupplierSelector
            supplier={supplier}
            address={address}
            onSupplierChange={setSupplier}
            onAddressChange={setAddress}
          />
        </FormSection>

        <FormSection
          number="2"
          title="Requested items"
          description="List each item, quantity, and estimated unit cost. Totals shown here are estimates only."
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
        <PurchaseOrderReviewDialog
          kindOfRequest={kindOfRequest}
          supplier={supplier.trim()}
          address={address.trim()}
          itemCount={items.length}
          estimatedGrandTotal={
            estimatedTotal === null
              ? "—"
              : currencyFormatter.format(estimatedTotal)
          }
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
