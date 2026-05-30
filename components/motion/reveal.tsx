"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  /** y inicial em px (entrada de baixo). */
  y?: number;
  className?: string;
};

/**
 * Scroll-reveal de marca (lente Tompkins p/ landings). Só transform/opacity,
 * dispara uma vez ao entrar na viewport, e respeita prefers-reduced-motion
 * (sem animação). Easing expo (token E1).
 */
export function Reveal({ children, delay = 0, y = 24, className }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
