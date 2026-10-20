import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-sonnet-5.5",
  // No shell, file or web tools: the agent only talks and calls calcular_costo.
  defaultTools: false,
});
