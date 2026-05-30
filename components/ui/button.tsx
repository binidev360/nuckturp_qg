import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-primary text-primary-foreground hover:brightness-110",
  secondary: "border border-border bg-card text-card-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
} as const;

const SIZES = {
  md: "h-11 px-5 text-sm", // 44px (alvo de toque mínimo)
  lg: "h-12 px-7 text-base",
} as const;

type CtaButtonProps = ComponentProps<typeof Link> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

/**
 * Botão de ação canônico (semente do design system / P1). Renderiza um Link do
 * Next (nav client-side; serve rotas internas e âncoras). Toque >= 44px, foco
 * visível, press com scale 0.98, sem transition-all.
 */
export function CtaButton({
  className,
  variant = "primary",
  size = "lg",
  ...props
}: CtaButtonProps) {
  return (
    <Link
      className={cn(
        "focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-[filter,background-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
