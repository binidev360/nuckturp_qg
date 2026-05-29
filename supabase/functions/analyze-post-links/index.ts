/**
 * analyze-post-links — Edge Function (Onda 4 v3)
 * 
 * Melhorias v3:
 * - Verificação inteligente: confirma slugs internos no banco (elimina falsos positivos)
 * - Links externos melhorados: GET fallback quando HEAD falha, timeout robusto
 * - Contexto visual: extrai snippet do HTML onde o link aparece
 * 
 * Parâmetros (POST body):
 *   - post_ids: string[]          — IDs dos posts a analisar (obrigatório)
 *   - check_external: boolean     — verificar links externos? (default: false)
 *   - max_posts: number           — limite de posts por execução (default: 5)
 * 
 * Retorna: { analyzed: number, results: LinkResult[] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers completos para compatibilidade com Lovable/Supabase client
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Domínios internos conhecidos ────────────────────────────────────
const INTERNAL_DOMAINS = [
  "nuckturp.com.br",
  "www.nuckturp.com.br",
];

// ─── Tipos ───────────────────────────────────────────────────────────
interface LinkResult {
  post_id: string;
  original_url: string;
  suggested_url: string | null;
  http_status: number | null;
  link_type: "internal" | "external";
  status: "ok" | "broken" | "redirect" | "mapped" | "unknown";
  context_snippet: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Extrai todos os href="..." do conteúdo HTML junto com o texto visível
 * do link (context snippet) para exibir no painel admin.
 */
function extractHrefsWithContext(html: string): Array<{ url: string; snippet: string }> {
  // Captura a tag <a> inteira para extrair contexto
  const anchorRegex = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const results: Array<{ url: string; snippet: string }> = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const url = match[1].trim();
    // Ignora anchors, mailto, tel, javascript
    if (
      url.startsWith("#") ||
      url.startsWith("mailto:") ||
      url.startsWith("tel:") ||
      url.startsWith("javascript:")
    ) {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);

    // Limpa HTML do texto visível do link (remove tags internas)
    const rawText = match[2].replace(/<[^>]*>/g, "").trim();
    // Limita snippet a 120 chars
    const snippet = rawText.length > 120 ? rawText.slice(0, 117) + "…" : rawText;

    results.push({ url, snippet });
  }

  // Fallback: captura href sem tag <a> completa (imagens, etc.)
  const hrefOnlyRegex = /href\s*=\s*["']([^"']+)["']/gi;
  while ((match = hrefOnlyRegex.exec(html)) !== null) {
    const url = match[1].trim();
    if (seen.has(url)) continue;
    if (
      url.startsWith("#") ||
      url.startsWith("mailto:") ||
      url.startsWith("tel:") ||
      url.startsWith("javascript:")
    ) {
      continue;
    }
    seen.add(url);
    results.push({ url, snippet: "" });
  }

  return results;
}

/** Verifica se uma URL pertence a um domínio interno */
function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return INTERNAL_DOMAINS.some((d) => parsed.hostname === d);
  } catch (_e) {
    // URLs relativas são internas
    return url.startsWith("/");
  }
}

/** Extrai o pathname de uma URL (interna ou relativa) */
function extractPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch (_e) {
    return url.split("?")[0].split("#")[0];
  }
}

/** Remove barra final e normaliza */
function normalizePath(path: string): string {
  return path.replace(/\/+$/, "").toLowerCase();
}

// ─── Mapeamento de links internos (verificação inteligente) ──────────

/**
 * Verifica link interno contra o banco de dados.
 * Confirma se o slug realmente existe nas tabelas corretas,
 * eliminando falsos positivos/negativos.
 */
async function mapInternalLink(
  path: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ suggested: string | null; status: LinkResult["status"] }> {
  const normalized = normalizePath(path);
  const segments = normalized.split("/").filter(Boolean);

  // Home — ok
  if (segments.length === 0) {
    return { suggested: null, status: "ok" };
  }

  // ─── Rotas de app (estáticas, não precisam de verificação no banco) ─
  // Rotas estáticas que NÃO precisam de verificação no banco.
  // NOTA: "novidades" foi removido pois /novidades/<slug> precisa verificar se o slug existe.
  const appRoutes = [
    "auth", "redefinir-senha", "login", "signup", "reset-password",
    "onboarding", "dashboard", "campaigns", "sessions", "notes",
    "whiteboards", "players", "settings", "admin", "dicionario",
    "academia", "feedback", "perfil", "profile", "plans", "checkout",
    "author-blog", "post", "diary", "whiteboard",
    "journey", "tools", "n", "f", "rss.xml", "sitemap.xml",
    "o-livro-completo-do-mestre-de-rpg", "checklist-do-mestre-metodico",
    "curso-de-worldbuilding",
  ];

  if (appRoutes.includes(segments[0])) {
    return { suggested: null, status: "ok" };
  }

  // ─── Blog post: /blog/<slug> ────────────────────────────────────
  if (segments[0] === "blog" && segments.length >= 2) {
    const slug = segments[1];
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("slug, status")
      .eq("slug", slug)
      .maybeSingle();

    if (post) return { suggested: null, status: "ok" };
    // Slug não existe no banco — link quebrado
    return { suggested: null, status: "broken" };
  }

  // ─── Perfil: /m/<slug> ──────────────────────────────────────────
  if (segments[0] === "m" && segments.length >= 2) {
    // Sub-rotas de /m/<slug>/blog são válidas
    if (segments.length >= 3 && segments[2] === "blog") {
      return { suggested: null, status: "ok" };
    }
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("slug")
      .eq("slug", segments[1])
      .maybeSingle();
    if (profile) return { suggested: null, status: "ok" };
    return { suggested: null, status: "broken" };
  }

  // ─── Perfil legado: /perfil/<slug> ou /mestre/<slug> → sugerir /m/ ─
  if ((segments[0] === "perfil" || segments[0] === "mestre") && segments.length >= 2) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("slug")
      .eq("slug", segments[1])
      .maybeSingle();
    if (profile) {
      return { suggested: `/m/${profile.slug}`, status: "mapped" };
    }
    return { suggested: null, status: "broken" };
  }

  // ─── Autor: /autor/<slug> ──────────────────────────────────────
  if (segments[0] === "autor" && segments.length >= 2) {
    const { data: author } = await supabaseAdmin
      .from("blog_authors")
      .select("slug")
      .eq("slug", segments[1])
      .maybeSingle();
    if (author) return { suggested: null, status: "ok" };
    return { suggested: null, status: "broken" };
  }

  // ─── Dicionário: /dicionario/<slug> ────────────────────────────
  if (segments[0] === "dicionario" && segments.length >= 2) {
    const { data: entry } = await supabaseAdmin
      .from("dictionary_entries")
      .select("slug")
      .eq("slug", segments[1])
      .maybeSingle();
    if (entry) return { suggested: null, status: "ok" };
    return { suggested: null, status: "broken" };
  }

  // ─── Novidades (alias para blog): /novidades/<slug> ─────────────
  if (segments[0] === "novidades" && segments.length >= 2) {
    const slug = segments[1];
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("slug, status")
      .eq("slug", slug)
      .maybeSingle();

    if (post) return { suggested: null, status: "ok" };
    // Slug não existe no banco — link quebrado
    return { suggested: null, status: "broken" };
  }

  // ─── Novidades (index): /novidades ────────────────────────────
  if (segments[0] === "novidades" && segments.length === 1) {
    return { suggested: null, status: "ok" };
  }

  // ─── Categoria: /categoria/<slug> ──────────────────────────────
  if (segments[0] === "categoria" && segments.length >= 2) {
    const { data: cat } = await supabaseAdmin
      .from("post_categories")
      .select("slug")
      .eq("slug", segments[1])
      .maybeSingle();
    if (cat) return { suggested: null, status: "ok" };
    return { suggested: null, status: "broken" };
  }

  // ─── Slug solto (pode ser post sem /blog/) ─────────────────────
  if (segments.length === 1) {
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("slug")
      .eq("slug", segments[0])
      .maybeSingle();
    if (post) {
      return { suggested: `/blog/${post.slug}`, status: "mapped" };
    }
  }

  // Não encontrou nada — link quebrado
  return { suggested: null, status: "broken" };
}

/**
 * Verifica link externo com HEAD + fallback GET.
 * Alguns sites bloqueiam HEAD, então tentamos GET se HEAD falhar.
 */
async function checkExternalLink(
  url: string
): Promise<{ http_status: number | null; status: LinkResult["status"] }> {
  const userAgent = "NuckturpLinkChecker/2.0 (bot; +https://nuckturp.com.br)";

  // Tenta HEAD primeiro (mais leve)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": userAgent },
    });
    clearTimeout(timeout);

    const httpStatus = res.status;

    // HEAD com 405 (Method Not Allowed) → tenta GET
    if (httpStatus === 405 || httpStatus === 403) {
      return await checkExternalLinkGet(url, userAgent);
    }

    if (httpStatus >= 200 && httpStatus < 300) {
      return { http_status: httpStatus, status: "ok" };
    }
    if (httpStatus >= 300 && httpStatus < 400) {
      return { http_status: httpStatus, status: "redirect" };
    }
    return { http_status: httpStatus, status: "broken" };
  } catch (_e) {
    // HEAD falhou (timeout, rede) → tenta GET como fallback
    return await checkExternalLinkGet(url, userAgent);
  }
}

/** Fallback GET para links externos que bloqueiam HEAD */
async function checkExternalLinkGet(
  url: string,
  userAgent: string
): Promise<{ http_status: number | null; status: LinkResult["status"] }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": userAgent },
    });
    clearTimeout(timeout);
    // Consume body to prevent resource leak
    await res.body?.cancel();

    const httpStatus = res.status;
    if (httpStatus >= 200 && httpStatus < 300) {
      return { http_status: httpStatus, status: "ok" };
    }
    if (httpStatus >= 300 && httpStatus < 400) {
      return { http_status: httpStatus, status: "redirect" };
    }
    return { http_status: httpStatus, status: "broken" };
  } catch (_e) {
    return { http_status: null, status: "broken" };
  }
}

// ─── Handler principal ──────────────────────────────────────────────
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Auth: apenas admins ─────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Valida sessão via getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Verifica admin via user_roles
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Parse body ──────────────────────────────────────────────
    const body = await req.json();
    const {
      post_ids = [],
      dictionary_entry_ids = [],
      check_external = false,
      max_posts = 5,
    } = body as {
      post_ids?: string[];
      dictionary_entry_ids?: string[];
      check_external?: boolean;
      max_posts?: number;
    };

    if ((!Array.isArray(post_ids) || post_ids.length === 0) && (!Array.isArray(dictionary_entry_ids) || dictionary_entry_ids.length === 0)) {
      return new Response(
        JSON.stringify({ error: "post_ids ou dictionary_entry_ids é obrigatório (array de UUIDs)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Carregar mapeamentos de URLs conhecidos (memória de/para) ──
    const { data: urlMappings } = await supabaseAdmin
      .from("link_url_mappings")
      .select("original_url, corrected_url");
    const mappingsMap = new Map<string, string>(
      (urlMappings || []).map((m: { original_url: string; corrected_url: string }) => [m.original_url, m.corrected_url])
    );

    const limitedIds = post_ids.slice(0, Math.min(max_posts, 20));

    // ─── Busca posts ─────────────────────────────────────────────
    const { data: posts, error: postsErr } = await supabaseAdmin
      .from("posts")
      .select("id, content, title, slug")
      .in("id", limitedIds);

    if (postsErr || !posts) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar posts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allResults: LinkResult[] = [];

    for (const post of posts) {
      // v4: Posts sem conteúdo ou sem links → marcador "no_links" para ir para verificados
      if (!post.content) {
        // Limpa resultados anteriores e insere marcador
        await supabaseAdmin.from("link_analysis_results").delete().eq("post_id", post.id).eq("manually_validated", false);
        await supabaseAdmin.from("link_analysis_results").insert({
          post_id: post.id, original_url: "__no_links__", status: "ok",
          link_type: "internal", analyzed_by: userId, context_snippet: "Post sem links",
        });
        continue;
      }

      // v3: extrai links COM contexto (snippet do texto visível)
      const linksWithContext = extractHrefsWithContext(post.content);
      if (linksWithContext.length === 0) {
        // Post sem links → marcador para ir para verificados
        await supabaseAdmin.from("link_analysis_results").delete().eq("post_id", post.id).eq("manually_validated", false);
        await supabaseAdmin.from("link_analysis_results").insert({
          post_id: post.id, original_url: "__no_links__", status: "ok",
          link_type: "internal", analyzed_by: userId, context_snippet: "Post sem links",
        });
        continue;
      }

      // v3.1: Preserva links validados manualmente — não apaga, não reanálisa
      const { data: manuallyValidated } = await supabaseAdmin
        .from("link_analysis_results")
        .select("original_url")
        .eq("post_id", post.id)
        .eq("manually_validated", true);

      const manuallyValidatedUrls = new Set(
        (manuallyValidated || []).map((r: { original_url: string }) => r.original_url)
      );

      // Limpa resultados anteriores desse post (exceto validados manualmente)
      await supabaseAdmin
        .from("link_analysis_results")
        .delete()
        .eq("post_id", post.id)
        .eq("manually_validated", false);

      for (const { url: href, snippet } of linksWithContext) {
        // Pula links que foram validados manualmente pelo admin
        if (manuallyValidatedUrls.has(href)) continue;

        // v4: Verifica se existe mapeamento de/para conhecido
        const knownMapping = mappingsMap.get(href);

        let result: LinkResult;

        if (knownMapping) {
          // Mapeamento conhecido — auto-sugere a correção
          result = {
            post_id: post.id,
            original_url: href,
            suggested_url: knownMapping,
            http_status: null,
            link_type: isInternalUrl(href) ? "internal" : "external",
            status: "mapped",
            context_snippet: snippet || null,
          };
        } else if (isInternalUrl(href)) {
          // Link interno: verificação inteligente contra o banco
          const path = extractPath(href);
          const mapping = await mapInternalLink(path, supabaseAdmin);

          result = {
            post_id: post.id,
            original_url: href,
            suggested_url: mapping.suggested,
            http_status: null,
            link_type: "internal",
            status: mapping.status,
            context_snippet: snippet || null,
          };
        } else {
          // Link externo
          if (check_external) {
            const check = await checkExternalLink(href);
            result = {
              post_id: post.id,
              original_url: href,
              suggested_url: null,
              http_status: check.http_status,
              link_type: "external",
              status: check.status,
              context_snippet: snippet || null,
            };
          } else {
            result = {
              post_id: post.id,
              original_url: href,
              suggested_url: null,
              http_status: null,
              link_type: "external",
              status: "unknown",
              context_snippet: snippet || null,
            };
          }
        }

        allResults.push(result);
      }

      // Salva resultados com context_snippet
      const rows = allResults
        .filter((r) => r.post_id === post.id)
        .map((r) => ({
          post_id: r.post_id,
          original_url: r.original_url,
          suggested_url: r.suggested_url,
          http_status: r.http_status,
          link_type: r.link_type,
          status: r.status,
          analyzed_by: userId,
          context_snippet: r.context_snippet,
        }));

      if (rows.length > 0) {
        await supabaseAdmin.from("link_analysis_results").insert(rows);
      }
    }

    // ─── Dicionário: analisa links em definições ─────────────────
    const limitedDictIds = (dictionary_entry_ids || []).slice(0, Math.min(max_posts, 50));
    let dictAnalyzed = 0;

    if (limitedDictIds.length > 0) {
      const { data: entries } = await supabaseAdmin
        .from("dictionary_entries")
        .select("id, definition, term, slug")
        .in("id", limitedDictIds);

      for (const entry of (entries || [])) {
        if (!entry.definition) {
          // Entrada sem definição → marcador
          await supabaseAdmin.from("link_analysis_results").delete().eq("post_id", entry.id).eq("manually_validated", false);
          await supabaseAdmin.from("link_analysis_results").insert({
            post_id: entry.id, original_url: "__no_links__", status: "ok",
            link_type: "internal", analyzed_by: userId, context_snippet: "Sem links",
          });
          dictAnalyzed++;
          continue;
        }

        const linksWithContext = extractHrefsWithContext(entry.definition);
        if (linksWithContext.length === 0) {
          await supabaseAdmin.from("link_analysis_results").delete().eq("post_id", entry.id).eq("manually_validated", false);
          await supabaseAdmin.from("link_analysis_results").insert({
            post_id: entry.id, original_url: "__no_links__", status: "ok",
            link_type: "internal", analyzed_by: userId, context_snippet: "Sem links",
          });
          dictAnalyzed++;
          continue;
        }

        // Preserva validados manualmente
        const { data: manuallyValidated } = await supabaseAdmin
          .from("link_analysis_results").select("original_url")
          .eq("post_id", entry.id).eq("manually_validated", true);
        const manuallyValidatedUrls = new Set(
          (manuallyValidated || []).map((r: { original_url: string }) => r.original_url)
        );

        await supabaseAdmin.from("link_analysis_results").delete()
          .eq("post_id", entry.id).eq("manually_validated", false);

        for (const { url: href, snippet } of linksWithContext) {
          if (manuallyValidatedUrls.has(href)) continue;

          const knownMapping = mappingsMap.get(href);
          let result: LinkResult;

          if (knownMapping) {
            result = { post_id: entry.id, original_url: href, suggested_url: knownMapping, http_status: null, link_type: isInternalUrl(href) ? "internal" : "external", status: "mapped", context_snippet: snippet || null };
          } else if (isInternalUrl(href)) {
            const path = extractPath(href);
            const mapping = await mapInternalLink(path, supabaseAdmin);
            result = { post_id: entry.id, original_url: href, suggested_url: mapping.suggested, http_status: null, link_type: "internal", status: mapping.status, context_snippet: snippet || null };
          } else {
            if (check_external) {
              const check = await checkExternalLink(href);
              result = { post_id: entry.id, original_url: href, suggested_url: null, http_status: check.http_status, link_type: "external", status: check.status, context_snippet: snippet || null };
            } else {
              result = { post_id: entry.id, original_url: href, suggested_url: null, http_status: null, link_type: "external", status: "unknown", context_snippet: snippet || null };
            }
          }
          allResults.push(result);
        }

        const rows = allResults.filter((r) => r.post_id === entry.id).map((r) => ({
          post_id: r.post_id, original_url: r.original_url, suggested_url: r.suggested_url,
          http_status: r.http_status, link_type: r.link_type, status: r.status,
          analyzed_by: userId, context_snippet: r.context_snippet,
        }));
        if (rows.length > 0) {
          await supabaseAdmin.from("link_analysis_results").insert(rows);
        }
        dictAnalyzed++;
      }
    }

    // ─── Resposta ────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        analyzed: posts.length + dictAnalyzed,
        total_links: allResults.length,
        summary: {
          ok: allResults.filter((r) => r.status === "ok").length,
          broken: allResults.filter((r) => r.status === "broken").length,
          mapped: allResults.filter((r) => r.status === "mapped").length,
          redirect: allResults.filter((r) => r.status === "redirect").length,
          unknown: allResults.filter((r) => r.status === "unknown").length,
        },
        results: allResults,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
