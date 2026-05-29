const FERRAMENTAS = [
  "Campanhas",
  "Diário do Mestre",
  "Quadro de Ideias",
  "Ferramentas de Mesa",
] as const;

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col px-6 py-12 sm:px-12 lg:px-20">
      <div className="flex flex-1 flex-col justify-center">
        <div className="max-w-3xl">
          <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-wide">
            <span className="bg-primary size-1.5 rounded-full" />
            Reescrita Next.js · em construção
          </span>

          <h1 className="animate-fade-up font-display mt-8 text-6xl leading-[0.95] font-bold tracking-tight sm:text-8xl">
            QG do <span className="text-primary text-glow-lime">Mestre</span>
          </h1>

          <p className="animate-fade-up text-muted-foreground mt-6 max-w-xl text-lg sm:text-xl">
            Seu QG de mestre de RPG. Toda a campanha, as notas de sessão e o seu mundo param de
            viver espalhados em cinco apps.
          </p>

          <ul className="mt-10 flex flex-wrap gap-2.5 text-sm">
            {FERRAMENTAS.map((nome) => (
              <li
                key={nome}
                className="border-border bg-card text-card-foreground rounded-lg border px-3.5 py-2"
              >
                {nome}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="text-muted-foreground text-xs">Nuckturp · nuckturp.com.br</footer>
    </main>
  );
}
