const FERRAMENTAS = [
  "Campanhas",
  "Diário do Mestre",
  "Quadro de Ideias",
  "Ferramentas de Mesa",
] as const;

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      {/* Glow de marca ao fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 -z-10 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/3 right-0 -z-10 h-[40vh] w-[40vh] rounded-full bg-secondary/10 blur-[120px]"
      />

      <span className="inline-flex animate-pulse-lime items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary">
        <span className="size-1.5 rounded-full bg-primary" />
        Reescrita Next.js · em construção
      </span>

      <h1 className="mt-8 animate-fade-up font-display text-5xl font-bold tracking-tight sm:text-7xl">
        QG do{" "}
        <span className="bg-gradient-nuckturp bg-clip-text text-transparent">
          Mestre
        </span>
      </h1>

      <p className="mt-6 max-w-xl animate-fade-up text-lg text-muted-foreground sm:text-xl">
        O hub do mestre de RPG. Organize <strong>campanhas</strong>, documente{" "}
        <em>sessões</em> e crie mundos — num só lugar.
      </p>

      <ul className="mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3">
        {FERRAMENTAS.map((nome) => (
          <li
            key={nome}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-card-foreground"
          >
            {nome}
          </li>
        ))}
      </ul>

      <footer className="absolute bottom-6 text-xs text-muted-foreground">
        Nuckturp · nuckturp.com.br
      </footer>
    </main>
  );
}
