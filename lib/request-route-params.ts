export type SearchParamValue = string | string[] | undefined;

export function firstSearchParam(
  value: SearchParamValue,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseOptionalRequestId(
  value: SearchParamValue,
): number | null {
  const raw = firstSearchParam(value)?.trim();

  if (!raw || !/^[1-9]\d*$/.test(raw)) {
    return null;
  }

  const requestId = Number(raw);

  return Number.isSafeInteger(requestId) ? requestId : null;
}
