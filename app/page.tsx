import { Chat } from "./components/Chat";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:py-10">
      <header className="mb-6">
        <p className="text-sm font-semibold tracking-wide text-accent">Meridia</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">¿Cuánto te sale realmente?</h1>
        <p className="mt-2 text-sm text-muted">
          Pegá el link de un producto o describilo. Te pido los datos que falten y calculo el costo
          estimado en pesos, mostrando de dónde sale cada número.
        </p>
      </header>
      <Chat />
    </main>
  );
}
