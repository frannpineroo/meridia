"use client";

import { useEffect, useRef, useState } from "react";
import { useEveAgent } from "eve/react";
import type { EveMessagePart } from "eve/react";
import { CostBreakdown, isCostResult } from "./CostBreakdown";

const EXAMPLES = [
  "https://www.amazon.com/dp/B0EXAMPLE",
  "Auriculares Sony WH-1000XM6 en Amazon",
];

function ToolPart({ part }: { part: Extract<EveMessagePart, { type: "dynamic-tool" }> }) {
  if (part.toolName !== "calcular_costo") return null;

  if (part.state === "output-available" && isCostResult(part.output)) {
    return <CostBreakdown result={part.output} />;
  }
  if (part.state === "output-error") {
    return <p className="text-xs text-red-600 dark:text-red-400">No se pudo calcular: {part.errorText}</p>;
  }
  return <p className="animate-pulse text-xs text-muted">{part.toolMetadata?.eve?.label ?? "Calculando…"}</p>;
}

export function Chat() {
  // Failed turns arrive as stream events, not as `agent.error`.
  const [turnError, setTurnError] = useState<string>();
  const agent = useEveAgent({
    onEvent: (event) => {
      if (event.type === "turn.started") setTurnError(undefined);
      if (event.type === "turn.failed") setTurnError(event.data.message);
    },
  });
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isResuming = agent.status === "resuming";
  const messages = agent.data.messages;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function submit(text: string) {
    const message = text.trim();
    if (message.length === 0 || isResuming) return;
    setDraft("");
    void agent.send(message, isBusy ? { turnPolicy: "steer" } : undefined);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-xs text-muted hover:text-foreground"
              onClick={() => setDraft(example)}
              type="button"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      <ol className="flex flex-1 flex-col gap-4">
        {messages.map((message) => (
          <li
            key={message.id}
            className={message.role === "user" ? "flex flex-col items-end gap-2" : "flex flex-col gap-2"}
          >
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                return (
                  <p
                    key={part.id ?? index}
                    className={
                      message.role === "user"
                        ? "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-sm text-accent-foreground"
                        : "whitespace-pre-wrap break-words text-sm leading-relaxed"
                    }
                  >
                    {part.text}
                  </p>
                );
              }
              if (part.type === "dynamic-tool") {
                return <ToolPart key={part.toolCallId} part={part} />;
              }
              return null;
            })}
          </li>
        ))}
        {agent.status === "submitted" ? <li className="animate-pulse text-xs text-muted">Pensando…</li> : null}
      </ol>

      {agent.error || turnError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          No pude responder: {agent.error?.message ?? turnError}
        </p>
      ) : null}

      <div ref={endRef} />

      <form
        className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <label className="sr-only" htmlFor="message">
          Link o descripción del producto
        </label>
        <input
          id="message"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent sm:text-sm"
          disabled={isResuming}
          onChange={(event) => setDraft(event.currentTarget.value)}
          placeholder={messages.length === 0 ? "Pegá un link o describí el producto" : "Respondé o agregá datos"}
          value={draft}
        />
        <button
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          disabled={isResuming || draft.trim().length === 0}
          type="submit"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
