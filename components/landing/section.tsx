import type { ComponentProps } from "react";

/**
 * Section canônica das landing pages públicas (Livro, Worldbuilding, Checklist).
 * Mesma medida da home: largura máx 5xl, padding responsivo. Borda de topo opcional
 * via className (`border-border/60 border-t`).
 */
export function Section({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`mx-auto w-full max-w-5xl px-6 py-16 sm:px-12 sm:py-24 lg:px-20 ${className ?? ""}`}
      {...props}
    />
  );
}
