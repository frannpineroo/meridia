import { divRoundHalfUp, formatCents, formatScaled, parseDecimal, SCALE } from "./money.ts";
import type { Charge, CostInput, Source, SourcedDecimal } from "./schema.ts";

export interface MissingField {
  field: "productPriceUsd" | "shippingUsd" | "exchangeRateArsPerUsd";
  label: string;
}

export interface CostLine {
  id: string;
  label: string;
  /** Plain decimal string with 2 decimals. */
  amountArs: string;
  amountUsd?: string;
  detail: string;
  source: Source;
  note?: string;
  sourceUrl?: string;
  asOf?: string;
}

export type CostResult =
  | {
      status: "incompleto";
      product: CostInput["product"];
      missing: MissingField[];
      message: string;
    }
  | {
      status: "completo";
      product: CostInput["product"];
      exchangeRate: SourcedDecimal;
      lines: CostLine[];
      totalArs: string;
      sourcesUsed: Source[];
      disclaimer: string;
    };

export const DISCLAIMER =
  "Estimación con los datos informados. No incluye cargos que no se hayan cargado. " +
  "Impuestos, percepciones y aranceles pueden cambiar: verificalos con fuentes oficiales antes de comprar.";

const REQUIRED: MissingField[] = [
  { field: "productPriceUsd", label: "Precio del producto en USD" },
  { field: "shippingUsd", label: "Costo de envío en USD (0 si es gratis)" },
  { field: "exchangeRateArsPerUsd", label: "Cotización: pesos por 1 USD" },
];

// A USD amount (10^6) times a rate (10^6) is scaled 10^12; cents are 10^2.
const USD_TIMES_RATE_TO_CENTS = SCALE * SCALE / 100n;

function provenanceOf(value: { source: Source; note?: string; sourceUrl?: string; asOf?: string }) {
  return { source: value.source, note: value.note, sourceUrl: value.sourceUrl, asOf: value.asOf };
}

/**
 * Deterministic estimate of the landed cost in ARS. Every number comes from the
 * input; nothing is looked up or assumed here. Each line is rounded to cents
 * (half up) and the total is the sum of the rounded lines, so the breakdown
 * always adds up exactly.
 */
export function calculateImportCost(input: CostInput): CostResult {
  const missing = REQUIRED.filter(({ field }) => input[field] === undefined);
  if (missing.length > 0) {
    return {
      status: "incompleto",
      product: input.product,
      missing,
      message: `Faltan datos para calcular: ${missing.map((m) => m.label).join("; ")}.`,
    };
  }

  const price = input.productPriceUsd!;
  const shipping = input.shippingUsd!;
  const exchangeRate = input.exchangeRateArsPerUsd!;

  const rate = parseDecimal(exchangeRate.value);
  if (rate === 0n) {
    throw new Error("La cotización debe ser mayor a 0.");
  }
  const priceUsd = parseDecimal(price.value);
  const shippingUsd = parseDecimal(shipping.value);

  const usdToCents = (usd: bigint) => divRoundHalfUp(usd * rate, USD_TIMES_RATE_TO_CENTS);
  const rateText = formatScaled(rate);

  const lines: CostLine[] = [
    {
      id: "producto",
      label: "Precio del producto",
      amountUsd: formatScaled(priceUsd),
      amountArs: formatCents(usdToCents(priceUsd)),
      detail: `USD ${formatScaled(priceUsd)} × ${rateText}`,
      ...provenanceOf(price),
    },
    {
      id: "envio",
      label: "Envío",
      amountUsd: formatScaled(shippingUsd),
      amountArs: formatCents(usdToCents(shippingUsd)),
      detail: `USD ${formatScaled(shippingUsd)} × ${rateText}`,
      ...provenanceOf(shipping),
    },
  ];

  const bases: Record<NonNullable<Charge["base"]>, { usd: bigint; label: string }> = {
    producto: { usd: priceUsd, label: "producto" },
    producto_y_envio: { usd: priceUsd + shippingUsd, label: "producto + envío" },
  };

  let totalCents = usdToCents(priceUsd) + usdToCents(shippingUsd);

  input.charges.forEach((charge, index) => {
    const value = parseDecimal(charge.value);
    let cents: bigint;
    let detail: string;
    let amountUsd: string | undefined;

    if (charge.kind === "porcentaje") {
      const base = bases[charge.base!];
      // base (10^6) × rate (10^6) × percent (10^6) / 100 -> cents
      cents = divRoundHalfUp(base.usd * rate * value, USD_TIMES_RATE_TO_CENTS * SCALE * 100n);
      detail = `${formatScaled(value)}% sobre ${base.label} (USD ${formatScaled(base.usd)})`;
    } else if (charge.kind === "fijo_usd") {
      cents = usdToCents(value);
      amountUsd = formatScaled(value);
      detail = `USD ${formatScaled(value)} × ${rateText}`;
    } else {
      cents = divRoundHalfUp(value, SCALE / 100n);
      detail = "Monto fijo en ARS";
    }

    totalCents += cents;
    lines.push({
      id: `cargo-${index + 1}`,
      label: charge.label,
      amountArs: formatCents(cents),
      amountUsd,
      detail,
      ...provenanceOf(charge),
    });
  });

  return {
    status: "completo",
    product: input.product,
    exchangeRate,
    lines,
    totalArs: formatCents(totalCents),
    sourcesUsed: [...new Set([exchangeRate.source, ...lines.map((line) => line.source)])],
    disclaimer: DISCLAIMER,
  };
}
