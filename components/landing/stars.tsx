import type { ComponentProps } from "react";

function StarPath(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.77l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94L12 2.5z"
      />
    </svg>
  );
}

/**
 * Nota visual (ex.: 4,6 de 5). A 5ª estrela enche parcialmente conforme `value`.
 * Decorativa: o número real e o link para a fonte ficam ao lado no markup.
 */
export function Stars({ value = 5, className = "size-5" }: { value?: number; className?: string }) {
  return (
    <span className="text-primary inline-flex gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block">
            <StarPath className={`${className} opacity-25`} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarPath className={className} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
