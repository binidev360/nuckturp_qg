/**
 * Gera um slug URL-safe (kebab-case, sem acentos) a partir de um texto.
 * Port da regra `generateSlug` do app atual (NFD + kebab) — usada em posts/blog,
 * onde a paridade de slug é guardrail de SEO. Ver docs/inventario/rotas-slugs.md.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // não-alfanumérico vira hífen
    .replace(/^-+|-+$/g, ""); // apara hífens das pontas
}
