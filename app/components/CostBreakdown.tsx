import type { CostResult } from "@/lib/cost/calculate.ts";
import { SourceBadge } from "./SourceBadge";

const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const plain = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 6 });

// Display only: the values were computed with bigint and arrive as exact decimal strings.
const formatArs = (value: string) => ars.format(Number(value));

export function isCostResult(value: unknown): value is CostResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    (value.status === "completo" || value.status === "incompleto")
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function CostBreakdown({ result }: { result: CostResult }) {
  const { product } = result;

  if (result.status === "incompleto") {
    return (
      <section className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm">
        <p className="font-medium">Faltan datos para calcular</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          {result.missing.map((m) => (
            <li key={m.field}>{m.label}</li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface text-sm shadow-sm">
      <header className="border-b border-border px-4 py-3">
        <p className="font-medium">{product.description}</p>
        {product.url ? (
          <a
            className="text-xs text-muted underline-offset-2 hover:underline"
            href={product.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {hostname(product.url)}
          </a>
        ) : null}
      </header>

      <ul className="divide-y divide-border">
        {result.lines.map((line) => (
          <li key={line.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{line.label}</span>
                <SourceBadge source={line.source} />
              </div>
              <p className="mt-0.5 text-xs text-muted">{line.detail}</p>
              {line.note ? <p className="mt-0.5 text-xs text-muted">{line.note}</p> : null}
              {line.sourceUrl ? (
                <a
                  className="mt-0.5 block truncate text-xs text-accent underline-offset-2 hover:underline"
                  href={line.sourceUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Fuente{line.asOf ? ` (${line.asOf})` : ""}
                </a>
              ) : null}
            </div>
            <span className="shrink-0 font-mono tabular-nums">{formatArs(line.amountArs)}</span>
          </li>
        ))}
      </ul>

      <footer className="space-y-3 bg-background/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">Total estimado</span>
          <span className="font-mono text-lg font-semibold tabular-nums">{formatArs(result.totalArs)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Cotización: ${plain.format(Number(result.exchangeRate.value))} por USD</span>
          <SourceBadge source={result.exchangeRate.source} />
        </div>
        <p className="text-xs text-muted">{result.disclaimer}</p>
      </footer>
    </section>
  );
}
