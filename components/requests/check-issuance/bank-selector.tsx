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
import { ApiError } from "@/lib/api";
import {
  getBankSuggestions,
  type BankSuggestion,
} from "@/lib/requests/check-issuances";

const BANK_INPUT_ID = "check-issuance-bank";
const BANK_LISTBOX_ID = "check-issuance-bank-listbox";
const BANK_STATUS_ID = "check-issuance-bank-status";

/** Bounded page size. Never fetch the complete bank table. */
const BANKS_PER_PAGE = 10;

type BankStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "forbidden"
  | "rate-limited";

type BankSelectorProps = {
  bank: string;
  onBankChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
};

function optionId(index: number): string {
  return `${BANK_LISTBOX_ID}-option-${index}`;
}

export default function BankSelector({
  bank,
  onBankChange,
  disabled = false,
  error,
}: BankSelectorProps) {
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<BankSuggestion[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [status, setStatus] = useState<BankStatus>("idle");
  const [open, setOpen] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const latestBankRef = useRef(bank);

  /*
   * After a suggestion is picked, the debounce fires once more for the
   * selected name. This ref skips exactly that one request so the list
   * stays closed after a selection.
   */
  const justSelectedRef = useRef(false);

  const debouncedSearch = useDebouncedValue(bank.trim(), 400);

  /*
   * Keep the latest controlled value available to the response handler.
   * The parent may also change the value outside this component, such as
   * when a form is reset.
   */
  useEffect(() => {
    latestBankRef.current = bank;
  }, [bank]);

  useEffect(() => {
    if (!searchEnabled || disabled) {
      return;
    }

    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    const query = debouncedSearch;

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
      setHighlightedIndex(-1);
    }, 0);

    getBankSuggestions(
      {
        ...(query ? { search: query } : {}),
        perPage: BANKS_PER_PAGE,
      },
      controller.signal,
    )
      .then((page) => {
        /*
         * The AbortController cancels stale requests. The ref check is a
         * second guard for a response that resolves just before cleanup.
         */
        if (
          controller.signal.aborted ||
          latestBankRef.current.trim() !== query
        ) {
          return;
        }

        setSuggestions(page.data);
        setTotalMatches(page.meta.total);
        setStatus("ready");
        setHighlightedIndex(page.data.length > 0 ? 0 : -1);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (
          failure instanceof ApiError &&
          (failure.status === 401 || failure.status === 419)
        ) {
          setOpen(false);
          router.replace("/login");
          return;
        }

        if (failure instanceof ApiError && failure.status === 403) {
          setStatus("forbidden");
          return;
        }

        if (failure instanceof ApiError && failure.status === 429) {
          setStatus("rate-limited");
          return;
        }

        setStatus("error");
      });

    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [attempt, debouncedSearch, disabled, router, searchEnabled]);

  /*
   * A parent can disable the field while a search is in flight. Reset the
   * local list so re-enabling the field starts from a clean state.
   */
  useEffect(() => {
    if (!disabled) {
      return;
    }

    const resetTimer = window.setTimeout(() => {
      setOpen(false);
      setSuggestions([]);
      setTotalMatches(0);
      setStatus("idle");
      setSearchEnabled(false);
      setHighlightedIndex(-1);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [disabled]);

  function changeBank(value: string) {
    if (disabled) {
      return;
    }

    justSelectedRef.current = false;
    latestBankRef.current = value;
    setSuggestions([]);
    setTotalMatches(0);
    setStatus("loading");
    setOpen(true);
    setSearchEnabled(true);
    setHighlightedIndex(-1);
    onBankChange(value);
  }

  function selectSuggestion(suggestion: BankSuggestion) {
    /*
     * Only skip the follow-up request when the selection actually changes
     * the value. Selecting text that is already in the field must not
     * suppress the next focus search.
     */
    justSelectedRef.current = suggestion.name !== bank.trim();
    latestBankRef.current = suggestion.name;
    onBankChange(suggestion.name);
    setSuggestions([]);
    setTotalMatches(0);
    setStatus("idle");
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function retrySearch() {
    if (disabled) {
      return;
    }

    setOpen(true);
    setHighlightedIndex(-1);
    setAttempt((current) => current + 1);
  }

  function handleFocus() {
    if (disabled) {
      return;
    }

    setOpen(true);

    if (!searchEnabled) {
      setSearchEnabled(true);
      return;
    }

    if (status === "idle") {
      setAttempt((current) => current + 1);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        setHighlightedIndex(suggestions.length > 0 ? 0 : -1);
        return;
      }

      setHighlightedIndex((index) =>
        Math.min(index + 1, suggestions.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        setHighlightedIndex(suggestions.length - 1);
        return;
      }

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
      event.preventDefault();
      setOpen(false);
      setHighlightedIndex(-1);
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
  const listboxVisible = open && !disabled && hasMatches;

  function statusMessage(): string {
    if (status === "loading") {
      return "Searching saved banks…";
    }

    if (status === "forbidden") {
      return "You are not allowed to search saved banks.";
    }

    if (status === "rate-limited") {
      return "Too many bank searches. Wait a moment before searching again.";
    }

    if (status === "error") {
      return "Saved banks could not be loaded. You can still enter the bank name manually.";
    }

    if (status === "ready") {
      if (!hasMatches) {
        return "No saved banks matched. You can still enter the bank name manually.";
      }

      if (hasMoreMatches) {
        return `Showing the first ${suggestions.length} of ${totalMatches} saved banks. Keep typing to narrow the list.`;
      }

      return "Select a bank to fill this field, or keep typing a bank name.";
    }

    return "Start typing to search saved banks, or enter a bank name manually.";
  }

  const showRetry = status === "error";

  return (
    <div className="space-y-5">
      <div className="relative" onBlur={handleBlur}>
        <FormField
          id={BANK_INPUT_ID}
          label="Bank"
          value={bank}
          onChange={(event) => changeBank(event.target.value)}
          onFocus={handleFocus}
          onClick={handleFocus}
          onKeyDown={handleKeyDown}
          required
          disabled={disabled}
          error={error}
          role="combobox"
          aria-expanded={listboxVisible}
          aria-controls={listboxVisible ? BANK_LISTBOX_ID : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            listboxVisible && highlightedIndex >= 0
              ? optionId(highlightedIndex)
              : undefined
          }
          aria-describedby={BANK_STATUS_ID}
          aria-busy={status === "loading"}
          autoComplete="off"
          maxLength={255}
        />

        {listboxVisible && (
          <ul
            id={BANK_LISTBOX_ID}
            role="listbox"
            aria-label="Bank suggestions"
            className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-line/70 bg-white py-1 shadow-lg"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.name}
                id={optionId(index)}
                role="option"
                aria-selected={index === highlightedIndex}
                tabIndex={-1}
                onMouseDown={handleOptionMouseDown}
                onMouseEnter={() => setHighlightedIndex(index)}
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
              </li>
            ))}
          </ul>
        )}
      </div>

      <p
        id={BANK_STATUS_ID}
        role="status"
        className="text-sm leading-6 text-muted"
      >
        {statusMessage()}
      </p>

      {showRetry && (
        <button
          type="button"
          onClick={retrySearch}
          disabled={disabled}
          className="min-h-11 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          Try searching again
        </button>
      )}
    </div>
  );
}
