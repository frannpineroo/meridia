import type { Source } from "@/lib/cost/schema.ts";

const STYLES: Record<Source, { label: string; className: string }> = {
  usuario: {
    label: "Dato tuyo",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  verificado: {
    label: "Verificado",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  supuesto: {
    label: "Supuesto",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
};

export function SourceBadge({ source }: { source: Source }) {
  const { label, className } = STYLES[source];
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
