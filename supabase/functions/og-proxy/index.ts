/**
 * OG Proxy — serves correct Open Graph meta tags to crawlers (social + search engines).
 *
 * Crawlers (WhatsApp, Facebook, Twitter, Telegram, Instagram, LinkedIn, Googlebot, bingbot)
 * do NOT reliably execute JavaScript, so a client-side SPA cannot set OG tags dynamically.
 * This edge function reads the requested path, fetches the relevant data from the
 * database, and returns a minimal HTML page with the correct OG tags + a redirect
 * for regular browsers.
 *
 * ## OG Image Strategy (atualizado 2026-03-13)
 * - Por padrão, og_image_url = cover_url (sincronizado via trigger `trg_sync_og_image_with_cover`)
 * - O backfill inicial foi aplicado para todos os posts existentes
 * - Autores podem personalizar via toggle no AdminBlogSeoForm
 * - Fallback chain: og_image_url > cover_url > first body image > FALLBACK_IMAGE global
 *
 * ## Rotas suportadas (alinhadas com App.tsx):
 * - /novidades                     → Blog index
 * - /novidades/:slug               → Blog post
 * - /m/:slug                       → Public profile
 * - /m/:slug/blog                  → Author blog index
 * - /m/:slug/blog/:postSlug        → Author blog post
 * - /m/:slug/:postSlug             → Author post shorthand (redirect)
 * - /n/:token                      → Public note
 * - /f/:token                      → Session feedback
 * - /o-livro-completo-do-mestre-de-rpg  → Book landing
 * - /checklist-do-mestre-metodico       → Checklist landing
 * - /curso-de-worldbuilding             → Worldbuilding landing
 *
 * Usage: The project's hosting must redirect crawler user-agents to this function,
 * OR the function can be called directly:
 *   GET /functions/v1/og-proxy?path=/novidades/meu-post
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const SITE_URL = "https://nuckturp.com.br";
const FALLBACK_IMAGE = `${SITE_URL}/og-image.jpg`;
const SITE_NAME = "QG do Mestre — Nuckturp";

/** Buckets públicos que passam pelo CDN */
const SUPABASE_STORAGE_BASE = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/`;
const CDN_BASE = "https://cdn.nuckturp.com.br/";
const CDN_BUCKETS = ["blog-assets", "profile-assets", "public-assets"];

/** Converte URL do Storage para CDN (mesma lógica de src/lib/cdnUrl.ts) */
function cdnUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(CDN_BASE)) return url;
  if (url.startsWith(SUPABASE_STORAGE_BASE)) {
    const relativePath = url.replace(SUPABASE_STORAGE_BASE, "");
    const bucket = relativePath.split("/")[0];
    if (CDN_BUCKETS.includes(bucket)) return `${CDN_BASE}${relativePath}`;
  }
  return url;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Crawler user-agent patterns — inclui bots de redes sociais E de busca (Google, Bing).
 * Googlebot e bingbot foram adicionados para garantir que recebam as OG tags corretas,
 * já que nem sempre executam JS de forma confiável para SPAs.
 */
const CRAWLER_RE =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Discordbot|Pinterest|vkShare|Viber|Skype|Line|Snapchat|Embedly|redditbot|Applebot|ia_archiver|Googlebot|bingbot|msnbot|YandexBot|Baiduspider|DuckDuckBot|GPTBot|ChatGPT-User|Claude-Web|anthropic-ai|PerplexityBot|cohere-ai|Meta-ExternalAgent/i;

function isCrawler(ua: string | null): boolean {
  return !!ua && CRAWLER_RE.test(ua);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(meta: {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const img = escapeHtml(meta.image);
  const u = escapeHtml(meta.url);
  const ogType = meta.type || "website";

  let extra = "";
  if (meta.publishedTime) extra += `<meta property="article:published_time" content="${escapeHtml(meta.publishedTime)}" />\n`;
  if (meta.modifiedTime) extra += `<meta property="article:modified_time" content="${escapeHtml(meta.modifiedTime)}" />\n`;
  if (meta.author) extra += `<meta property="article:author" content="${escapeHtml(meta.author)}" />\n`;
  if (meta.section) extra += `<meta property="article:section" content="${escapeHtml(meta.section)}" />\n`;
  if (meta.tags?.length) {
    for (const tag of meta.tags) {
      extra += `<meta property="article:tag" content="${escapeHtml(tag)}" />\n`;
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${t}</title>
<meta name="description" content="${d}" />
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${img}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${u}" />
<meta property="og:type" content="${ogType}" />
<meta property="og:locale" content="pt_BR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${img}" />
${extra}
<link rel="canonical" href="${u}" />
<link rel="alternate" hreflang="pt-BR" href="${u}" />
<link rel="alternate" hreflang="x-default" href="${u}" />
<meta http-equiv="refresh" content="0;url=${u}" />
</head>
<body>
<p><a href="${u}">${t}</a></p>
</body>
</html>`;
}

/**
 * Resolve a OG image seguindo a cadeia de fallback padrão:
 * 1. og_image_url (sincronizado com cover_url por padrão, personalizável)
 * 2. cover_url
 * 3. Primeira <img> no conteúdo HTML
 * 4. FALLBACK_IMAGE global
 */
function resolveOgImage(ogImageUrl?: string | null, coverUrl?: string | null, content?: string | null): string {
  if (ogImageUrl) return cdnUrl(ogImageUrl) || ogImageUrl;
  if (coverUrl) return cdnUrl(coverUrl) || coverUrl;
  if (content) {
    const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) return cdnUrl(m[1]) || m[1];
  }
  return FALLBACK_IMAGE;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";
    const fullUrl = `${SITE_URL}${path}`;

    const ua = req.headers.get("user-agent");

    // If not a crawler, redirect to the real page
    if (!isCrawler(ua)) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: fullUrl },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // ---- Blog post: /novidades/<slug> ----
    const blogPostMatch = path.match(/^\/novidades\/([a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9])$/);
    if (blogPostMatch) {
      const slug = blogPostMatch[1];

      // Skip known non-post paths
      if (["dicionario", "categorias"].includes(slug)) {
        return serveFallback(fullUrl);
      }

      const { data: post } = await supabase
        .from("posts")
        .select("title, seo_title, excerpt, seo_description, cover_url, og_image_url, content, published_at, updated_at, slug, tags, blog_authors(name), post_categories(name)")
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();

      if (post) {
        const ogImage = resolveOgImage(post.og_image_url, post.cover_url, post.content);
        const title = `${post.seo_title || post.title} — Nuckturp`;
        const description = post.seo_description || post.excerpt || "";
        const authorName = (post as any).blog_authors?.name || "Nuckturp";
        const sectionName = (post as any).post_categories?.name || undefined;

        return servePage(buildHtml({
          title,
          description,
          image: ogImage,
          url: fullUrl,
          type: "article",
          publishedTime: post.published_at || undefined,
          modifiedTime: post.updated_at || undefined,
          author: authorName,
          section: sectionName,
          tags: (post.tags as string[]) || [],
        }), post.updated_at || post.published_at);
      }
    }

    // ---- Blog index: /novidades ----
    if (path === "/novidades") {
      return servePage(buildHtml({
        title: "Novidades — Blog do QG do Mestre | Nuckturp",
        description: "Artigos, guias e dicas sobre RPG de mesa. Worldbuilding, narrativa, liderança e muito mais para mestres e jogadores.",
        image: FALLBACK_IMAGE,
        url: fullUrl,
      }));
    }

    // ---- Dictionary index: /novidades/dicionario ----
    if (path === "/novidades/dicionario") {
      return servePage(buildHtml({
        title: "Dicionário de RPG — Termos e Definições | Nuckturp",
        description: "Glossário completo de termos de RPG de mesa. De A a Z, tudo que você precisa saber sobre D&D, Pathfinder e outros sistemas.",
        image: `${SITE_URL}/og-dicionario.jpg`,
        url: fullUrl,
      }));
    }

    // ---- Dictionary entry: /novidades/dicionario/<slug> ----
    const dictEntryMatch = path.match(/^\/novidades\/dicionario\/([a-zA-Z0-9][a-zA-Z0-9%-]+)$/);
    if (dictEntryMatch) {
      const entrySlug = decodeURIComponent(dictEntryMatch[1]);

      const { data: entry } = await supabase
        .from("dictionary_entries")
        .select("term, definition, slug")
        .eq("slug", entrySlug)
        .maybeSingle();

      if (entry) {
        const plainDef = (entry.definition || "").replace(/<[^>]*>/g, "").slice(0, 155);
        return servePage(buildHtml({
          title: `${entry.term} — Dicionário de RPG | Nuckturp`,
          description: plainDef || `Definição de ${entry.term} no Dicionário de RPG do QG do Mestre.`,
          image: `${SITE_URL}/og-dicionario.jpg`,
          url: fullUrl,
        }));
      }
    }

    // ---- Author blog post: /m/<slug>/blog/<postSlug> ----
    const userBlogMatch = path.match(/^\/m\/([^/]+)\/blog\/([a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9])$/);
    if (userBlogMatch) {
      const authorSlug = userBlogMatch[1];
      const postSlug = userBlogMatch[2];

      const { data: post } = await supabase
        .from("posts")
        .select("title, seo_title, excerpt, seo_description, cover_url, og_image_url, content, published_at, updated_at, tags, blog_authors(name, slug), post_categories(name)")
        .eq("slug", postSlug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();

      if (post) {
        const ogImage = resolveOgImage(post.og_image_url, post.cover_url, post.content);
        const authorName = (post as any).blog_authors?.name || authorSlug;
        const sectionName = (post as any).post_categories?.name || undefined;

        // Canonical URL points to /novidades/:postSlug to avoid duplicate content
        const canonicalUrl = `${SITE_URL}/novidades/${postSlug}`;

        return servePage(buildHtml({
          title: `${post.seo_title || post.title} — ${authorName} | Nuckturp`,
          description: post.seo_description || post.excerpt || "",
          image: ogImage,
          url: canonicalUrl,
          type: "article",
          publishedTime: post.published_at || undefined,
          modifiedTime: post.updated_at || undefined,
          author: authorName,
          section: sectionName,
          tags: (post.tags as string[]) || [],
        }), post.updated_at || post.published_at);
      }
    }

    // ---- Author post shorthand: /m/<slug>/<postSlug> → redirect to canonical ----
    const authorShortMatch = path.match(/^\/m\/([^/]+)\/([a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9])$/);
    if (authorShortMatch && authorShortMatch[2] !== "blog") {
      const canonicalUrl = `${SITE_URL}/m/${authorShortMatch[1]}/blog/${authorShortMatch[2]}`;
      return new Response(null, {
        status: 301,
        headers: { ...corsHeaders, Location: canonicalUrl },
      });
    }

    // ---- Author blog index: /m/<slug>/blog ----
    const authorBlogMatch = path.match(/^\/m\/([^/]+)\/blog\/?$/);
    if (authorBlogMatch) {
      const authorSlug = authorBlogMatch[1];

      const { data: profile } = await supabase
        .from("public_profiles")
        .select("display_name, nickname, bio, avatar_url, banner_url")
        .eq("slug", authorSlug)
        .maybeSingle();

      if (profile) {
        const name = profile.display_name || profile.nickname || authorSlug;
        const ogImage = cdnUrl(profile.banner_url) || cdnUrl(profile.avatar_url) || FALLBACK_IMAGE;

        return servePage(buildHtml({
          title: `Blog de ${name} — Nuckturp`,
          description: profile.bio || `Artigos e publicações de ${name} no QG do Mestre.`,
          image: ogImage,
          url: fullUrl,
        }));
      }
    }

    // ---- Public profile: /m/<slug> ----
    const profileMatch = path.match(/^\/m\/([^/]+)\/?$/);
    if (profileMatch) {
      const profileSlug = profileMatch[1];

      const { data: profile } = await supabase
        .from("public_profiles")
        .select("display_name, nickname, bio, avatar_url, banner_url, tagline, master_title")
        .eq("slug", profileSlug)
        .maybeSingle();

      if (profile) {
        const name = profile.display_name || profile.nickname || profileSlug;
        // Use dynamic OG image generated by og-profile-image function
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const dynamicOgImage = `${supabaseUrl}/functions/v1/og-profile-image?slug=${encodeURIComponent(profileSlug)}`;
        // Description: tagline > bio > fallback
        const description = profile.tagline || profile.bio || `Perfil de ${name} no QG do Mestre.`;
        // Title: include master_title if available
        const titleParts = [name];
        if (profile.master_title) titleParts.push(profile.master_title);
        const title = `${titleParts.join(" — ")} | Nuckturp`;

        return servePage(buildHtml({
          title,
          description,
          image: dynamicOgImage,
          url: fullUrl,
          type: "profile",
        }));
      }
    }

    // ---- Public note: /n/<token> ----
    const noteMatch = path.match(/^\/n\/([a-zA-Z0-9_-]+)$/);
    if (noteMatch) {
      const token = noteMatch[1];

      const { data: notes } = await supabase.rpc("get_public_note", { _token: token });

      if (notes && notes.length > 0) {
        const note = notes[0];
        const name = note.owner_display_name || note.owner_nickname || "Mestre";
        // Strip HTML to create a brief description
        const plainContent = (note.content || "").replace(/<[^>]*>/g, " ").trim();
        const description = plainContent.length > 160 ? plainContent.substring(0, 157) + "..." : plainContent;

        return servePage(buildHtml({
          title: `${note.title} — ${name} | Nuckturp`,
          description: description || `Nota pública de ${name} no QG do Mestre.`,
          image: cdnUrl(note.cover_url) || cdnUrl(note.owner_avatar_url) || FALLBACK_IMAGE,
          url: fullUrl,
          type: "article",
        }));
      }
    }

    // ---- Session feedback: /f/<token> ----
    const feedbackMatch = path.match(/^\/f\/([a-zA-Z0-9_-]+)$/);
    if (feedbackMatch) {
      const token = feedbackMatch[1];

      const { data: configs } = await supabase.rpc("get_feedback_config_by_token", { _token: token });

      if (configs && configs.length > 0) {
        const cfg = configs[0];
        const masterName = cfg.master_nickname || cfg.master_name || "Mestre";

        return servePage(buildHtml({
          title: `Avalie a sessão "${cfg.session_name}" — ${masterName} | Nuckturp`,
          description: `Deixe seu feedback sobre a sessão "${cfg.session_name}" da campanha "${cfg.campaign_name}". Sua opinião ajuda o mestre a melhorar!`,
          image: cdnUrl(cfg.cover_url) || cdnUrl(cfg.campaign_cover_url) || FALLBACK_IMAGE,
          url: fullUrl,
        }));
      }
    }

    // ---- Landing pages with custom OG images (rotas alinhadas com App.tsx) ----
    if (path === "/o-livro-completo-do-mestre-de-rpg") {
      return servePage(buildHtml({
        title: "O Livro Completo do Mestre de RPG — Guia Prático para Mestres",
        description: "Domine a arte de mestrar RPG. 11 capítulos práticos com técnicas de worldbuilding, narrativa e liderança. De R$ 97 por R$ 19,40.",
        image: `${SITE_URL}/og-book.jpg`,
        url: fullUrl,
        type: "product",
      }));
    }

    if (path === "/checklist-do-mestre-metodico") {
      return servePage(buildHtml({
        title: "Checklist do Mestre Metódico — Prepare Sessões em Minutos",
        description: "Nunca mais entre despreparado. Checklist completo para preparar sessões profissionais de RPG. De R$ 17,90 por R$ 5,37 (70% OFF).",
        image: `${SITE_URL}/og-checklist.jpg`,
        url: fullUrl,
        type: "product",
      }));
    }

    if (path === "/curso-de-worldbuilding") {
      return servePage(buildHtml({
        title: "Curso de Worldbuilding | Crie Mundos Inesquecíveis para RPG e Ficção",
        description: "Método passo a passo para criar mundos ricos e coerentes. De R$ 297 por R$ 97.",
        image: `${SITE_URL}/og-worldbuilding.jpg`,
        url: fullUrl,
        type: "product",
      }));
    }

    // ---- Blog category page: /novidades/categorias/<slug> ----
    const categoryMatch = path.match(/^\/novidades\/categorias\/([a-zA-Z0-9][a-zA-Z0-9%-]+)$/);
    if (categoryMatch) {
      const catSlug = decodeURIComponent(categoryMatch[1]);

      const { data: category } = await supabase
        .from("post_categories")
        .select("name, description, slug")
        .eq("slug", catSlug)
        .maybeSingle();

      if (category) {
        return servePage(buildHtml({
          title: `${category.name} — Blog do QG do Mestre | Nuckturp`,
          description: category.description || `Artigos sobre ${category.name} no QG do Mestre. Dicas, guias e conteúdo para mestres e jogadores de RPG.`,
          image: FALLBACK_IMAGE,
          url: fullUrl,
        }));
      }
    }

    // ---- Fallback: default OG ----
    return serveFallback(fullUrl);
  } catch (error) {
    console.error("og-proxy error:", error);
    return serveFallback(`${SITE_URL}/`);
  }
});

/**
 * Serve OG HTML page with freshness headers for crawler caching.
 * Last-Modified and ETag help crawlers avoid re-fetching unchanged content.
 */
function servePage(html: string, lastModified?: string): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=900, s-maxage=3600",
  };

  // Add Last-Modified header if we have a date
  if (lastModified) {
    try {
      headers["Last-Modified"] = new Date(lastModified).toUTCString();
    } catch { /* ignore invalid dates */ }
  }

  // Generate ETag from content hash (simple but effective)
  const encoder = new TextEncoder();
  const data = encoder.encode(html);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data[i]) | 0;
  }
  headers["ETag"] = `"${Math.abs(hash).toString(36)}"`;

  return new Response(html, { status: 200, headers });
}

function serveFallback(url: string): Response {
  return servePage(buildHtml({
    title: "QG do Mestre — Nuckturp | Plataforma para Mestres de RPG",
    description: "O QG definitivo do mestre de RPG. Organize campanhas, sessões, notas e ideias de D&D, Pathfinder e qualquer sistema de RPG de mesa. Gratuito.",
    image: FALLBACK_IMAGE,
    url,
  }));
}
