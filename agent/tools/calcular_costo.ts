import { defineTool } from "eve/tools";
import { calculateImportCost } from "../../lib/cost/calculate.ts";
import { costInputSchema } from "../../lib/cost/schema.ts";

export default defineTool({
  description:
    "Calcula de forma determinista el costo total estimado en pesos argentinos de una compra internacional. " +
    "Pasá solo valores que el usuario dio o que provienen de una fuente citada; nunca inventes precios, " +
    "cotizaciones, impuestos, envíos ni comisiones. Podés llamarla con datos incompletos: devuelve qué falta.",
  inputSchema: costInputSchema,
  label: {
    start: ({ product }) => `Calculando costo de ${product.description}`,
  },
  execute(input) {
    return calculateImportCost(input);
  },
});
