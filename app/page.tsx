import type { ComponentProps } from "react";
import Link from "next/link";
import { CtaButton } from "@/components/ui/button";

const TRIAL_MICRO = "21 dias grátis, sem cartão. R$ 29/mês depois.";

const FEATURES = [
  {
    titulo: "Campanhas e sessões",
    texto:
      "Do arco ao detalhe, com checklist de antes e depois de cada sessão. Você nunca mais abre a mesa sem o gancho na ponta da língua.",
  },
  {
    titulo: "Diário do Mestre",
    texto:
      "Lore, NPCs e cenas num editor que aguenta o seu jeito de pensar. Vincula tudo e acha na hora.",
  },
  {
    titulo: "Quadro de Ideias",
    texto:
      "Um quadro infinito para ligar as pontas soltas, do vilão ao plot twist. É onde a campanha toma forma antes de virar texto.",
  },
  {
    titulo: "Jogadores",
    texto:
      "Quem senta na sua mesa: fichas, preferências, gatilhos, presença. A mesa que respeita o jogador começa aqui.",
  },
  {
    titulo: "Ferramentas de mesa",
    texto:
      "Role dados na hora, gere uma aventura d20 quando a inspiração some, e deixe a IA preparar a próxima sessão a partir da sua campanha.",
  },
] as const;

const PASSOS = [
  "Crie sua primeira campanha em minutos.",
  "Jogue suas notas, jogadores e ideias lá dentro.",
  "Chegue na mesa com tudo na mão, no celular ou no desktop.",
] as const;

const FAQ = [
  {
    q: "É pago mesmo? Não tem grátis?",
    a: 'É pago, R$ 29/mês. Antes você testa 21 dias com a ferramenta inteira liberada, sem aquele "recurso bloqueado".',
  },
  {
    q: "Eu já usava o QG. Vou ter que pagar?",
    a: "Não. Quem já estava com a gente vira Mestre VIP e continua com acesso.",
  },
  {
    q: "Funciona no celular?",
    a: "Foi feito para o celular primeiro. Prepara no sofá, consulta na mesa.",
  },
  {
    q: "E a IA?",
    a: "Inclusa, com limite mensal. Se precisar de mais, compra um pacote extra de requisições.",
  },
] as const;

function UnlockIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function Section({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`mx-auto w-full max-w-5xl px-6 py-16 sm:px-12 sm:py-24 lg:px-20 ${className ?? ""}`}
      {...props}
    />
  );
}

export default function Home() {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5 sm:px-12 lg:px-20">
        <span className="font-display text-lg font-bold tracking-tight">QG do Mestre</span>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/auth"
            className="text-muted-foreground hover:text-foreground hidden px-3 py-2 text-sm transition-colors sm:inline"
          >
            Entrar
          </Link>
          <CtaButton href="#preco" size="md">
            Testar grátis
          </CtaButton>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <Section className="relative overflow-hidden pt-10 pb-20 sm:pt-16">
          {/* 1 glow funcional por viewport (regra da Onda D) */}
          <div
            aria-hidden
            className="bg-primary/10 pointer-events-none absolute -top-24 -left-24 -z-10 h-[42vh] w-[42vh] rounded-full blur-[120px]"
          />
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight text-balance sm:text-7xl">
              Pare de mestrar com{" "}
              <span className="text-primary text-glow-lime">cinco abas abertas</span>.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg sm:text-xl">
              Campanha, sessões, notas e o seu mundo no mesmo lugar. Você chega na mesa sabendo onde
              parou, sem caçar aquele NPC que anotou no celular e já não acha mais.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <CtaButton href="/auth">Começar meu trial de 21 dias</CtaButton>
              <span className="text-muted-foreground text-sm">{TRIAL_MICRO}</span>
            </div>
            <p className="text-muted-foreground/80 mt-10 text-sm">
              <strong className="font-mono">134+</strong> mestres já preparam suas mesas no QG.
            </p>
          </div>
        </Section>

        {/* Problema */}
        <Section className="border-border/60 border-t">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            A prep não devia ser uma caça ao tesouro.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
            Você conhece a cena: a campanha mora num Google Doc, as fichas estão numa planilha, e
            aquele vilão genial você anotou no app de notas. Na hora da sessão, metade da prep vira
            caça ao tesouro. O detalhe que ia amarrar o arco ficou para trás duas sessões atrás, e o
            jogador lembrou antes de você.
          </p>
        </Section>

        {/* A virada */}
        <Section className="border-border/60 border-t">
          <h2 className="font-display max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Um <span className="text-primary">QG</span> só, com a sua mesa inteira dentro.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
            O QG do Mestre junta a sua preparação inteira num lugar só. Campanha, aventuras,
            sessões, jogadores, o seu mundo e as suas ideias, tudo conectado e do seu jeito. O que
            você escreveu na terça, você acha na sexta, no celular, em dez segundos.
          </p>
        </Section>

        {/* Showcase de features */}
        <Section className="border-border/60 border-t">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            O que tem dentro
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.titulo} className="border-primary/40 border-l-2 pl-5">
                <h3 className="font-display text-xl font-semibold">{f.titulo}</h3>
                <p className="text-muted-foreground mt-2">{f.texto}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Como funciona */}
        <Section className="border-border/60 border-t">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Como funciona
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {PASSOS.map((passo, i) => (
              <li key={passo}>
                <span className="text-primary font-mono text-3xl font-bold">{i + 1}</span>
                <p className="mt-3 text-lg">{passo}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* Depoimento (placeholder) */}
        <Section className="border-border/60 border-t">
          {/* PLACEHOLDER: substituir por depoimento real coletado */}
          <figure className="max-w-3xl">
            <blockquote className="font-display text-2xl leading-snug font-medium tracking-tight sm:text-3xl">
              &ldquo;Parei de perder NPC entre uma sessão e outra. Agora abro o QG no celular e está
              tudo lá.&rdquo;
            </blockquote>
            <figcaption className="text-muted-foreground mt-4 text-sm">
              Mestre [nome], [sistema] · depoimento a coletar
            </figcaption>
          </figure>
        </Section>

        {/* Preço */}
        <Section id="preco" className="border-border/60 border-t">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            R$ <span className="font-mono">29</span>/mês. 21 dias grátis, sem cartão.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
            Testa com a sua campanha de verdade. A IA vem inclusa, com limite mensal. Usou muito?
            Amplia com um pacote extra.
          </p>

          <ul className="mt-8 max-w-2xl space-y-3 text-base">
            <li className="flex items-start gap-3">
              <span className="border-primary/40 bg-primary/10 text-primary inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
                <UnlockIcon className="size-3.5" /> assinante worldcraft
              </span>
              <span className="text-muted-foreground">O QG entra junto, sem custo.</span>
            </li>
            <li className="text-muted-foreground">
              <strong>Veio do MesaQuest?</strong> Você tem cupom de desconto.
            </li>
            <li className="text-muted-foreground">
              <strong>Já usava o QG?</strong> Você é Mestre VIP e segue com acesso, sem pagar.
            </li>
          </ul>

          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <CtaButton href="/auth">Começar meu trial de 21 dias</CtaButton>
            <span className="text-muted-foreground text-sm">{TRIAL_MICRO}</span>
          </div>
        </Section>

        {/* FAQ */}
        <Section className="border-border/60 border-t">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Perguntas</h2>
          <div className="divide-border/60 mt-8 max-w-2xl divide-y">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-muted-foreground mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* CTA final */}
        <Section className="border-border/60 border-t">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Sua próxima sessão merece uma prep que aguenta a mesa.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Leve a campanha toda pro QG e veja a diferença na primeira mesa. Se não for pra você,
              é só cancelar.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <CtaButton href="/auth">Começar meu trial de 21 dias</CtaButton>
              <span className="text-muted-foreground text-sm">{TRIAL_MICRO}</span>
            </div>
          </div>
        </Section>
      </main>

      <footer className="border-border/60 mx-auto w-full max-w-5xl border-t px-6 py-10 sm:px-12 lg:px-20">
        <p className="text-muted-foreground text-xs">Nuckturp · nuckturp.com.br</p>
      </footer>
    </div>
  );
}
