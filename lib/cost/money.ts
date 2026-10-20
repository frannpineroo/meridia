// Fixed-point decimal arithmetic on bigint. Never use floats for money.
// Inputs are non-negative decimal strings with up to 6 fractional digits.

export const DECIMALS = 6;
export const SCALE = 10n ** BigInt(DECIMALS);
export const DECIMAL_PATTERN = /^\d{1,15}(\.\d{1,6})?$/;

/** Parses "1234.56" into a bigint scaled by 10^6. */
export function parseDecimal(value: string): bigint {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new Error(`Número inválido: "${value}". Usá un número no negativo con punto decimal, por ejemplo "1234.56".`);
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(DECIMALS, "0"));
}

/** Integer division of non-negative values, rounding half up. */
export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    throw new Error("divRoundHalfUp solo admite valores no negativos");
  }
  return (numerator + denominator / 2n) / denominator;
}

/** Formats integer cents as a plain decimal string, e.g. 123456n -> "1234.56". */
export function formatCents(cents: bigint): string {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

/** Formats a 10^6-scaled value with full precision, trimming trailing zeros. */
export function formatScaled(value: bigint): string {
  const whole = value / SCALE;
  const fraction = (value % SCALE).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
