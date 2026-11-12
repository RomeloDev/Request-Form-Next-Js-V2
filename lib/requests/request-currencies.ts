/**
 * Supported request currencies.
 *
 * The stored/API value is always the ISO currency code. Labels are for
 * display only and may be shown in a future currency select control.
 */
export const REQUEST_CURRENCY_OPTIONS = [
  { value: "PHP", label: "Peso" },
  { value: "EUR", label: "Euro" },
  { value: "USD", label: "US Dollar" },
] as const;

export type RequestCurrency =
  (typeof REQUEST_CURRENCY_OPTIONS)[number]["value"];

/**
 * Narrow an untrusted string (for example an API value) before using it
 * to select a currency formatter.
 */
export function isRequestCurrency(
  value: string,
): value is RequestCurrency {
  return REQUEST_CURRENCY_OPTIONS.some(
    (option) => option.value === value,
  );
}

const REQUEST_CURRENCY_LOCALE = "en-PH";

const currencyFormatters: Record<
  RequestCurrency,
  Intl.NumberFormat
> = {
  PHP: new Intl.NumberFormat(REQUEST_CURRENCY_LOCALE, {
    style: "currency",
    currency: "PHP",
  }),
  EUR: new Intl.NumberFormat(REQUEST_CURRENCY_LOCALE, {
    style: "currency",
    currency: "EUR",
  }),
  USD: new Intl.NumberFormat(REQUEST_CURRENCY_LOCALE, {
    style: "currency",
    currency: "USD",
  }),
};

/**
 * Format an amount for display. This never converts between currencies;
 * callers must pass the currency that matches the stored amount.
 */
export function formatRequestMoney(
  amount: number,
  currency: RequestCurrency,
): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError(
      "A finite amount is required to format money.",
    );
  }

  return currencyFormatters[currency].format(amount);
}
