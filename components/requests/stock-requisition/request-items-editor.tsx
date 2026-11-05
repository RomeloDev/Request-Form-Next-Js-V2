"use client";

import { useRef } from "react";
import FormField from "@/components/ui/form-field";
import FormTextarea from "@/components/ui/form-textarea";
import Icon from "@/components/ui/icon";
import type { StockRequisitionItemInput } from "@/lib/requests/stock-requisitions";

export type DraftRequestItem =
  StockRequisitionItemInput & {
    clientId: number;
  };

type RequestItemsEditorProps = {
  items: DraftRequestItem[];
  onItemsChange: (items: DraftRequestItem[]) => void;
  disabled?: boolean;
};

export function createDraftRequestItem(
  clientId: number,
): DraftRequestItem {
  return {
    clientId,
    quantity: "1",
    unit: "",
    description: "",
    unitCost: "",
    remarks: "",
  };
}

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function calculateLineTotal(
  item: DraftRequestItem,
): number | null {
  const quantity = Number.parseFloat(item.quantity);
  const unitCost = Number.parseFloat(item.unitCost);

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(unitCost)
  ) {
    return null;
  }

  return quantity * unitCost;
}

function calculateGrandTotal(
  items: DraftRequestItem[],
): number {
  return items.reduce((total, item) => {
    return total + (calculateLineTotal(item) ?? 0);
  }, 0);
}

export default function RequestItemsEditor({
  items,
  onItemsChange,
  disabled,
}: RequestItemsEditorProps) {
  const nextClientId = useRef(
    Math.max(0, ...items.map((item) => item.clientId)) + 1,
  );

  function updateItem(
    clientId: number,
    field: keyof StockRequisitionItemInput,
    value: string,
  ) {
    onItemsChange(
      items.map((item) =>
        item.clientId === clientId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addItem() {
    if (items.length >= 100) {
      return;
    }

    onItemsChange([
      ...items,
      createDraftRequestItem(nextClientId.current),
    ]);

    nextClientId.current += 1;
  }

  function removeItem(clientId: number) {
    if (items.length <= 1) {
      return;
    }

    onItemsChange(
      items.filter((item) => item.clientId !== clientId),
    );
  }

  const estimatedGrandTotal = calculateGrandTotal(items);


    return (
        <div className="space-y-5 sm:col-span-2">
        <div className="space-y-4">
            {items.map((item, index) => {
            const lineTotal = calculateLineTotal(item);

            return (
                <article
                key={item.clientId}
                className="rounded-2xl border border-line/70 bg-slate-50/40 p-4 sm:p-5"
                >
                <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                    <h3 className="font-semibold text-ink">
                        Item {index + 1}
                    </h3>

                    <p className="mt-1 text-sm text-muted">
                        Enter the quantity, description, and estimated cost.
                    </p>
                    </div>

                    <button
                    type="button"
                    onClick={() => {
                        removeItem(item.clientId);
                    }}
                    disabled={disabled || items.length === 1}
                    aria-label={`Remove item ${index + 1}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-danger hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-40"
                    >
                    <Icon name="trash" />
                    Remove
                    </button>
                </header>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField
                    id={`item-${item.clientId}-quantity`}
                    label="Quantity"
                    type="number"
                    inputMode="decimal"
                    min="0.001"
                    max="100000"
                    step="0.001"
                    value={item.quantity}
                    onChange={(event) => {
                        updateItem(
                        item.clientId,
                        "quantity",
                        event.target.value,
                        );
                    }}
                    required
                    disabled={disabled}
                    />

                    <FormField
                    id={`item-${item.clientId}-unit`}
                    label="Unit"
                    placeholder="Box, piece, ream"
                    value={item.unit}
                    onChange={(event) => {
                        updateItem(
                        item.clientId,
                        "unit",
                        event.target.value,
                        );
                    }}
                    maxLength={50}
                    disabled={disabled}
                    />

                    <FormField
                    id={`item-${item.clientId}-unit-cost`}
                    label="Estimated unit cost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="999999"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitCost}
                    onChange={(event) => {
                        updateItem(
                        item.clientId,
                        "unitCost",
                        event.target.value,
                        );
                    }}
                    required
                    disabled={disabled}
                    />

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-medium text-muted">
                        Estimated line total
                    </p>

                    <p className="mt-2 text-lg font-semibold text-ink">
                        {lineTotal === null
                        ? "—"
                        : currencyFormatter.format(lineTotal)}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                        Auto calculated from quantity × estimated unit cost.
                    </p>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-4">
                    <FormTextarea
                        id={`item-${item.clientId}-description`}
                        label="Description"
                        placeholder="Describe the requested item."
                        value={item.description}
                        onChange={(event) => {
                        updateItem(
                            item.clientId,
                            "description",
                            event.target.value,
                        );
                        }}
                        maxLength={1000}
                        rows={3}
                        required
                        disabled={disabled}
                    />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-4">
                    <FormTextarea
                        id={`item-${item.clientId}-remarks`}
                        label="Usage or remarks"
                        placeholder="Optional usage instructions or additional details."
                        value={item.remarks}
                        onChange={(event) => {
                        updateItem(
                            item.clientId,
                            "remarks",
                            event.target.value,
                        );
                        }}
                        maxLength={2000}
                        rows={3}
                        disabled={disabled}
                    />
                    </div>
                </div>
                </article>
            );
            })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line/70 bg-white p-4">
            <button
            type="button"
            onClick={addItem}
            disabled={disabled || items.length >= 100}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-4 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
            <Icon name="plus" />
            Add item
            </button>

            <div className="text-right">
            <p className="text-sm text-muted">
                Estimated grand total
            </p>

            <p className="text-xl font-semibold text-ink">
                {currencyFormatter.format(estimatedGrandTotal)}
            </p>

            <p className="text-xs text-muted">
                Final total is auto calculated.
            </p>
            </div>
        </div>
        </div>
  );
}