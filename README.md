# Meridia

Asistente de compras internacionales para Argentina. Ayuda a entender el costo real estimado, en pesos, de comprar en Amazon, Alibaba y otras tiendas, mostrando de dónde sale cada número.

> Estado: **Hito 1**. Chat + calculadora determinista. Sin pagos, sin blockchain, sin consulta automática de precios, impuestos ni cotizaciones.

## Cómo funciona

```
Navegador (Next.js + React)
  └─ app/components/Chat.tsx ── useEveAgent ──► /eve/v1/*  (agente eve)
                                                   ├─ agent/instructions.md
                                                   └─ agent/tools/calcular_costo.ts
                                                          └─ lib/cost/calculate.ts  (aritmética pura, bigint)
```

- El modelo **no hace cuentas ni pone números**. Junta datos del usuario y llama a `calcular_costo`.
- Cada valor lleva su origen: `usuario`, `verificado` (exige `sourceUrl`) o `supuesto`. La UI lo muestra como badge por línea.
- Si falta precio, envío o cotización, la herramienta devuelve `incompleto` con la lista de faltantes.
- Montos como strings decimales, aritmética en `bigint` (escala 10⁶), redondeo half-up a centavos por línea. El total es la suma exacta de las líneas.
- El agente corre con `defaultTools: false`: no tiene shell, archivos ni acceso web. No lee URLs ni scrapea tiendas.

## Requisitos

- Node.js 24 (`engines.node: 24.x`, requerido por eve).
- Una credencial de modelo para Vercel AI Gateway (ver abajo).

## Instalación

```bash
npm install
cp .env.example .env.local
```

### Credencial del modelo

El agente usa `anthropic/claude-sonnet-5.5` vía AI Gateway (`agent/agent.ts`). Opciones:

1. **Local, interactivo:** `npm exec -- eve dev` y ejecutá `/login` en la terminal de eve.
2. **Clave:** poné `AI_GATEWAY_API_KEY` en `.env.local`.
3. **Vercel:** al vincular el proyecto, AI Gateway se autentica con OIDC del proyecto.

## Ejecución

```bash
npm run dev          # Next.js + agente eve (http://localhost:3000)
```

Health check del agente: `curl localhost:3000/eve/v1/health`.

## Comprobaciones

```bash
npm test             # tests de la calculadora (node:test, sin dependencias extra)
npm run typecheck    # tsc --noEmit
npm run lint
npm run build
```

## Estructura

```
agent/                  agente eve (instrucciones, herramienta, canal)
app/                    UI Next.js (App Router)
  components/           Chat, CostBreakdown, SourceBadge
lib/cost/               calculadora determinista + esquema zod + tests
```

## Despliegue (pendiente)

Todavía no se desplegó. Antes de hacerlo:

- Reemplazar `placeholderAuth()` en `agent/channels/eve.ts`. Con la política actual, el tráfico de navegador en producción recibe `401`. Para una demo pública se puede usar `none()`, sabiendo que cualquiera podría consumir créditos de AI Gateway.
- `eve link` y `eve deploy` (o push a un proyecto Vercel con Git). Ver `node_modules/eve/docs/guides/deployment/vercel.mdx`.

## Estado de integraciones

| Integración | Estado |
|---|---|
| Calculadora determinista | Implementada y testeada |
| Agente eve + herramienta | Implementado y probado en local de punta a punta con AI Gateway (pide los datos faltantes, llama a la herramienta, el desglose coincide con el test) |
| Reglas fiscales de Argentina | Pendiente (Hito 2). Hoy solo cargos que informa el usuario |
| Cotización con fuente | Pendiente (Hito 3). Hoy la ingresa el usuario |
| Pago wARS en Celo | Pendiente (Hito 4) |
| Identidad ERC-8004 | Pendiente (Hito 5) |

## Limitaciones conocidas

- El esquema impide marcar `verificado` sin URL, pero no puede impedir que el modelo marque como `usuario` un valor que el usuario no dio. Las instrucciones lo prohíben; se revisará con evals.
- `npx eve build` local falla al preparar el sandbox por defecto (pide el paquete `microsandbox`). El agente no usa sandbox; `npm run dev` y `npm run build` funcionan. En Vercel el sandbox por defecto es Vercel Sandbox.
