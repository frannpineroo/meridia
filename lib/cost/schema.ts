import { z } from "zod";
import { DECIMAL_PATTERN } from "./money.ts";

const decimal = z
  .string()
  .regex(DECIMAL_PATTERN, 'Número no negativo como string con punto decimal, por ejemplo "129.99".');

/**
 * Where a value came from:
 * - usuario: the user stated it in the conversation.
 * - verificado: taken from a cited source (sourceUrl required).
 * - supuesto: an explicit assumption the user should review.
 */
export const sourceSchema = z.enum(["usuario", "verificado", "supuesto"]);

const provenance = {
  source: sourceSchema,
  note: z.string().optional().describe("Aclaración breve sobre el origen del valor."),
  sourceUrl: z.url().optional().describe("Obligatorio si source es 'verificado'."),
  asOf: z.string().optional().describe("Fecha del dato (YYYY-MM-DD), si se conoce."),
};

function requireUrlWhenVerified(value: { source: string; sourceUrl?: string }, ctx: z.RefinementCtx) {
  if (value.source === "verificado" && !value.sourceUrl) {
    ctx.addIssue({
      code: "custom",
      path: ["sourceUrl"],
      message: "Un valor 'verificado' necesita sourceUrl. Si no hay fuente, usá 'usuario' o 'supuesto'.",
    });
  }
}

export const sourcedDecimalSchema = z
  .object({ value: decimal, ...provenance })
  .superRefine(requireUrlWhenVerified);

export const chargeSchema = z
  .object({
    label: z.string().min(1).describe("Nombre del cargo, por ejemplo 'Arancel courier' o 'Percepción'."),
    kind: z
      .enum(["porcentaje", "fijo_usd", "fijo_ars"])
      .describe("porcentaje: value es un porcentaje (21 = 21%). fijo_usd / fijo_ars: monto fijo."),
    value: decimal,
    base: z
      .enum(["producto", "producto_y_envio"])
      .optional()
      .describe("Base del porcentaje. Obligatorio si kind es 'porcentaje'."),
    ...provenance,
  })
  .superRefine((charge, ctx) => {
    requireUrlWhenVerified(charge, ctx);
    if (charge.kind === "porcentaje" && !charge.base) {
      ctx.addIssue({ code: "custom", path: ["base"], message: "Un cargo porcentual necesita base." });
    }
  });

export const costInputSchema = z.object({
  product: z.object({
    description: z.string().min(1).describe("Descripción breve del producto."),
    url: z.url().optional().describe("URL del producto, si el usuario la dio."),
  }),
  productPriceUsd: sourcedDecimalSchema.optional().describe("Precio del producto en USD."),
  shippingUsd: sourcedDecimalSchema.optional().describe("Costo de envío en USD. '0' si es gratis."),
  exchangeRateArsPerUsd: sourcedDecimalSchema.optional().describe("Pesos argentinos por 1 USD."),
  charges: z
    .array(chargeSchema)
    .default([])
    .describe("Impuestos, percepciones, aranceles o comisiones. Solo los informados o confirmados."),
});

export type Source = z.infer<typeof sourceSchema>;
export type SourcedDecimal = z.infer<typeof sourcedDecimalSchema>;
export type Charge = z.infer<typeof chargeSchema>;
export type CostInput = z.output<typeof costInputSchema>;
