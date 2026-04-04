const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SELECTOR_REGEX = /^0x[a-fA-F0-9]{8}$/;
const HEX_DATA_REGEX = /^0x(?:[a-fA-F0-9]{2})+$/;

export function isValidAccessManagerAddress(value: string): boolean {
  return ADDRESS_REGEX.test(value.trim());
}

export function normalizeFunctionSelector(value: string): string | null {
  const trimmed = value.trim();
  const selector = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  return SELECTOR_REGEX.test(selector) ? selector.toLowerCase() : null;
}

export function isValidAccessManagerCalldata(value: string): boolean {
  return HEX_DATA_REGEX.test(value.trim());
}
