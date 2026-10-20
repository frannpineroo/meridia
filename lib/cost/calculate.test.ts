import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateImportCost } from "./calculate.ts";
import { divRoundHalfUp, formatCents, parseDecimal } from "./money.ts";
import { costInputSchema } from "./schema.ts";

const user = (value: string) => ({ value, source: "usuario" as const });

function parse(input: unknown) {
  return costInputSchema.parse(input);
}

describe("money", () => {
  it("parses decimal strings exactly", () => {
    assert.equal(parseDecimal("0.1"), 100_000n);
    assert.equal(parseDecimal("1234.567891"), 1_234_567_891n);
    assert.equal(parseDecimal("7"), 7_000_000n);
  });

  it("rejects negatives, commas and too many decimals", () => {
    for (const bad of ["-1", "1,5", "1.1234567", "", "abc", "1e3"]) {
      assert.throws(() => parseDecimal(bad), /Número inválido/);
    }
  });

  it("rounds half up", () => {
    assert.equal(divRoundHalfUp(5n, 10n), 1n);
    assert.equal(divRoundHalfUp(4n, 10n), 0n);
    assert.equal(formatCents(123_405n), "1234.05");
  });
});

describe("calculateImportCost", () => {
  it("reports every missing required field instead of guessing", () => {
    const result = calculateImportCost(parse({ product: { description: "Auriculares" } }));
    assert.equal(result.status, "incompleto");
    assert.deepEqual(
      result.status === "incompleto" && result.missing.map((m) => m.field),
      ["productPriceUsd", "shippingUsd", "exchangeRateArsPerUsd"],
    );
  });

  it("computes an exact total from user data", () => {
    const result = calculateImportCost(
      parse({
        product: { description: "Auriculares", url: "https://www.amazon.com/dp/B0EXAMPLE" },
        productPriceUsd: user("100"),
        shippingUsd: user("20.50"),
        exchangeRateArsPerUsd: user("1200"),
        charges: [
          { label: "Cargo porcentual de prueba", kind: "porcentaje", value: "10", base: "producto_y_envio", source: "supuesto" },
          { label: "Comisión fija", kind: "fijo_usd", value: "5", source: "usuario" },
          { label: "Tasa en pesos", kind: "fijo_ars", value: "1500.555", source: "usuario" },
        ],
      }),
    );
    assert.equal(result.status, "completo");
    if (result.status !== "completo") return;

    assert.deepEqual(
      result.lines.map((line) => [line.id, line.amountArs, line.source]),
      [
        ["producto", "120000.00", "usuario"],
        ["envio", "24600.00", "usuario"],
        ["cargo-1", "14460.00", "supuesto"], // 10% of 120.50 USD × 1200
        ["cargo-2", "6000.00", "usuario"],
        ["cargo-3", "1500.56", "usuario"], // half up
      ],
    );
    assert.equal(result.totalArs, "166560.56");
    assert.deepEqual(result.sourcesUsed.sort(), ["supuesto", "usuario"]);
  });

  it("total always equals the sum of rounded lines", () => {
    const result = calculateImportCost(
      parse({
        product: { description: "Libro" },
        productPriceUsd: user("19.99"),
        shippingUsd: user("3.33"),
        exchangeRateArsPerUsd: user("1187.4321"),
        charges: [{ label: "Percent", kind: "porcentaje", value: "7.5", base: "producto", source: "supuesto" }],
      }),
    );
    assert.equal(result.status, "completo");
    if (result.status !== "completo") return;
    const sum = result.lines.reduce((acc, line) => acc + parseDecimal(line.amountArs), 0n);
    assert.equal(sum, parseDecimal(result.totalArs));
  });

  it("rejects a zero exchange rate", () => {
    assert.throws(
      () =>
        calculateImportCost(
          parse({
            product: { description: "X" },
            productPriceUsd: user("1"),
            shippingUsd: user("0"),
            exchangeRateArsPerUsd: user("0"),
          }),
        ),
      /mayor a 0/,
    );
  });
});

describe("costInputSchema", () => {
  it("does not accept 'verificado' without a source URL", () => {
    const result = costInputSchema.safeParse({
      product: { description: "X" },
      exchangeRateArsPerUsd: { value: "1200", source: "verificado" },
    });
    assert.equal(result.success, false);
  });

  it("requires a base for percentage charges", () => {
    const result = costInputSchema.safeParse({
      product: { description: "X" },
      charges: [{ label: "Sin base", kind: "porcentaje", value: "21", source: "usuario" }],
    });
    assert.equal(result.success, false);
  });

  it("rejects negative amounts", () => {
    const result = costInputSchema.safeParse({ product: { description: "X" }, productPriceUsd: user("-5") });
    assert.equal(result.success, false);
  });
});
