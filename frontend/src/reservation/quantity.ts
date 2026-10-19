export type QuantityResult = { ok: true; value: number } | { ok: false; reason: 'invalid' | 'insufficient' | 'unavailable' };

/** Canonical decimal text only: never coerce booleans, whitespace, exponents or fractions. */
export function validateQuantity(input: unknown, available: number): QuantityResult {
  if (typeof input !== 'string' || !/^(?:[1-9]|[1-9][0-9]|100)$/.test(input)) return { ok: false, reason: 'invalid' };
  if (!Number.isSafeInteger(available) || available < 0) return { ok: false, reason: 'unavailable' };
  const value = Number(input);
  return value <= available ? { ok: true, value } : { ok: false, reason: 'insufficient' };
}
