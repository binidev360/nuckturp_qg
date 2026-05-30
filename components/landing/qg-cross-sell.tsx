import { CtaButton } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { Section } from "@/components/landing/section";

/**
 * Faixa de cross-sell para o app QG do Mestre (trial de 21 dias), reusada nas
 * landings públicas dos infoprodutos (decisão D4). Discreta: não compete com a
 * oferta principal da página, só apresenta o app a quem chegou via SEO.
 */
export function QgCrossSell() {
  return (
    <Section className="border-border/60 border-t">
      <Reveal>
        <div className="bg-card/40 border-border relative overflow-hidden rounded-2xl border p-8 sm:p-12">
          <div
            aria-hidden
            className="bg-primary/10 pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-[100px]"
          />
          <p className="text-primary font-mono text-xs tracking-widest uppercase">Do mesmo time</p>
          <h2 className="font-display mt-3 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
            Estudou a teoria. Agora prepara a mesa no{" "}
            <span className="text-primary">QG do Mestre</span>.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl">
            O app onde a sua campanha inteira mora junta: sessões, diário, jogadores e o seu mundo,
            no celular e no desktop. Teste 21 dias, sem cartão.
          </p>
          <div className="mt-7">
            <CtaButton href="/auth">Testar o QG por 21 dias</CtaButton>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
