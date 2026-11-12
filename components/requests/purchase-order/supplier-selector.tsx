"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import FormField from "@/components/ui/form-field";
import FormTextarea from "@/components/ui/form-textarea";
import { ApiError } from "@/lib/api";
import {
  getSupplierSuggestions,
  type SupplierSuggestion,
} from "@/lib/requests/purchase-orders";

const SUPPLIER_INPUT_ID = "po-supplier";
const SUPPLIER_LISTBOX_ID = "po-supplier-listbox";
const SUPPLIER_STATUS_ID = "po-supplier-status";
const ADDRESS_TEXTAREA_ID = "po-supplier-address";

/** Bounded page size. Never fetch the complete supplier table. */
const SUPPLIERS_PER_PAGE = 10;

type SupplierStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "forbidden"
  | "rate-limited";

type SupplierSelectorProps = {
  supplier: string;
  address: string;
  onSupplierChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  disabled?: boolean;
};

function optionId(index: number): string {
  return `${SUPPLIER_LISTBOX_ID}-option-${index}`;
}

export default function SupplierSelector({
  supplier,
  address,
  onSupplierChange,
  onAddressChange,
  disabled = false,
}: SupplierSelectorProps) {
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<SupplierSuggestion[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [status, setStatus] = useState<SupplierStatus>("idle");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [attempt, setAttempt] = useState(0);

  /*
   * After a suggestion is picked, the debounce fires once more for the
   * selected name. This ref skips exactly that one request so the list
   * stays closed after a selection.
   */
  const justSelectedRef = useRef(false);

  const debouncedSearch = useDebouncedValue(supplier.trim(), 400);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    const query = debouncedSearch;

    if (!query) {
      return;
    }

    const controller = new AbortController();

    /*
     * Follow the project's hook convention: defer synchronous status
     * updates to a timer so the effect body does not trigger cascading
     * renders, and cancel it on cleanup.
     */
    const loadingTimer = window.setTimeout(() => {
      if (controller.signal.aborted) {
        return;
      }

      setStatus("loading");
      setSuggestions([]);
      setTotalMatches(0);
      setOpen(true);
      setHighlightedIndex(-1);
    }, 0);

    getSupplierSuggestions(
      { search: query, perPage: SUPPLIERS_PER_PAGE },
      controller.signal,
    )
      .then((page) => {
        if (controller.signal.aborted) {
          return;
        }

        setSuggestions(page.data);
        setTotalMatches(page.meta.total);
        setStatus("ready");
        setHighlightedIndex(page.data.length > 0 ? 0 : -1);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 419)
        ) {
          router.replace("/login");
          return;
        }

        if (error instanceof ApiError && error.status === 403) {
          setStatus("forbidden");
          return;
        }

        if (error instanceof ApiError && error.status === 429) {
          setStatus("rate-limited");
          return;
        }

        setStatus("error");
      });

    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [attempt, debouncedSearch, router]);

  function changeSupplier(value: string) {
    justSelectedRef.current = false;

    if (value.trim() === "") {
      setSuggestions([]);
      setTotalMatches(0);
      setStatus("idle");
      setOpen(false);
      setHighlightedIndex(-1);
    }

    onSupplierChange(value);
  }

  function selectSuggestion(suggestion: SupplierSuggestion) {
    justSelectedRef.current = true;
    onSupplierChange(suggestion.name);
    onAddressChange(suggestion.address);
    setSuggestions([]);
    setTotalMatches(0);
    setStatus("idle");
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function handleFocus() {
    if (status !== "idle") {
      setOpen(true);
    }
  }

  /*
   * Close the listbox when focus leaves the whole selector, including the
   * "Try again" button, so keyboard users are never stranded with an open
   * list behind them.
   */
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      setHighlightedIndex((index) =>
        Math.min(index + 1, suggestions.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, -1));
      return;
    }

    if (event.key === "Enter" && open && highlightedIndex >= 0) {
      event.preventDefault();

      const suggestion = suggestions[highlightedIndex];
      if (suggestion) {
        selectSuggestion(suggestion);
      }
      return;
    }

    if (event.key === "Escape" && open) {
      setOpen(false);
    }
  }

  /*
   * preventDefault on mousedown keeps focus inside the combobox input,
   * so the blur-close handler does not close the list before the click.
   */
  function handleOptionMouseDown(event: MouseEvent<HTMLLIElement>) {
    event.preventDefault();
  }

  const hasMatches = suggestions.length > 0;
  const hasMoreMatches = totalMatches > suggestions.length;

  function statusMessage(): string {
    if (status === "loading") {
      return "Searching suppliers…";
    }

    if (status === "forbidden") {
      return "You are not allowed to search suppliers.";
    }

    if (status === "rate-limited") {
      return "Too many supplier searches. Wait a moment before searching again.";
    }

    if (status === "error") {
      return "Saved suppliers could not be loaded. You can still enter a new supplier manually.";
    }

    if (status === "ready") {
      if (!hasMatches) {
        return "No saved suppliers matched. Enter the supplier and address manually.";
      }

      if (hasMoreMatches) {
        return `Showing the first ${suggestions.length} of ${totalMatches} saved suppliers. Keep typing to narrow the list.`;
      }

      return "Select a supplier to fill its address, or keep typing a new one.";
    }

    return "Start typing to search saved suppliers, or enter a new supplier manually.";
  }

  const showRetry = status === "error";

  return (
    <div
      className="space-y-5 sm:col-span-2"
      onBlur={handleBlur}
    >
      <FormField
        id={SUPPLIER_INPUT_ID}
        label="Supplier name"
        value={supplier}
        onChange={(event) => changeSupplier(event.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        required
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? SUPPLIER_LISTBOX_ID : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          open && highlightedIndex >= 0
            ? optionId(highlightedIndex)
            : undefined
        }
        aria-describedby={SUPPLIER_STATUS_ID}
        autoComplete="off"
        maxLength={255}
        hint="Search a saved supplier, or type a new one. Saved suppliers fill the address automatically."
      />

      <p
        id={SUPPLIER_STATUS_ID}
        role="status"
        className="text-sm leading-6 text-muted"
      >
        {statusMessage()}
      </p>

      {showRetry && (
        <button
          type="button"
          onClick={() => setAttempt((current) => current + 1)}
          disabled={disabled}
          className="min-h-11 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          Try searching again
        </button>
      )}

      {open && hasMatches && (
        <ul
          id={SUPPLIER_LISTBOX_ID}
          role="listbox"
          aria-label="Supplier suggestions"
          className="max-h-64 overflow-y-auto rounded-xl border border-line/70 bg-white shadow-sm"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.name}
              id={optionId(index)}
              role="option"
              aria-selected={index === highlightedIndex}
              tabIndex={-1}
              onMouseDown={handleOptionMouseDown}
              onClick={() => selectSuggestion(suggestion)}
              className={`cursor-pointer px-4 py-3 ${
                index === highlightedIndex
                  ? "bg-blue-50"
                  : "hover:bg-blue-50/50"
              }`}
            >
              <span className="block font-medium text-ink wrap-anywhere">
                {suggestion.name}
              </span>
              <span className="mt-0.5 block text-sm text-muted wrap-anywhere">
                {suggestion.address || "No saved address"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <FormTextarea
        id={ADDRESS_TEXTAREA_ID}
        label="Supplier address"
        value={address}
        onChange={(event) => onAddressChange(event.target.value)}
        required
        disabled={disabled}
        maxLength={255}
        rows={3}
        hint="Selecting a saved supplier fills this automatically, but you can always edit it."
      />
    </div>
  );
}
