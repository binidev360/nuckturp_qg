/**
 * redirect-legacy — Handles 301/410 redirects for old WordPress URLs.
 *
 * After migrating from WordPress to the new SPA, hundreds of old URLs
 * still get crawled by Google. This function maps them to their new
 * canonical locations (301) or marks them as permanently gone (410).
 *
 * ## Patterns handled:
 * 1. Pinterest concatenation: `/slug/br.pinterest.com/nuckturpstudios` → strip suffix
 * 2. WordPress assets: `/wp-content/*`, `/wp-admin/*` → 410 Gone
 * 3. RSS: `/rss.xml` → edge function RSS
 * 4. Old taxonomy: `/tag/*`, `/dicionario/*` (root), `/author/*` → appropriate new paths
 * 5. Date-based permalinks: `/2020/MM/DD/slug/` → `/novidades/slug`
 * 6. Root-level post slugs → `/novidades/slug`
 *
 * Usage: Called by Cloudflare Worker or directly:
 *   GET /functions/v1/redirect-legacy?path=/tag/rpg/br.pinterest.com/nuckturpstudios
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const SITE_URL = "https://nuckturp.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path") || "/";

    // ── 1. Strip Pinterest concatenation suffix ──
    // Pattern: /any-path/br.pinterest.com/nuckturpstudios
    const pinterestSuffix = /\/br\.pinterest\.com\/nuckturpstudios$/;
    if (pinterestSuffix.test(rawPath)) {
      const cleanPath = rawPath.replace(pinterestSuffix, "");
      // If the clean path itself is a legacy pattern, re-process it
      // Otherwise redirect to the clean path
      const redirectTarget = await resolveCleanPath(cleanPath);
      return redirect301(redirectTarget);
    }

    // ── 2. WordPress assets & admin → 410 Gone ──
    if (
      rawPath.startsWith("/wp-content/") ||
      rawPath.startsWith("/wp-admin/") ||
      rawPath.startsWith("/wp-") ||
      rawPath === "/cdn-cgi/l/email-protection"
    ) {
      return gone410();
    }

    // ── 3. RSS redirect ──
    if (rawPath === "/rss.xml") {
      const rssUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/rss`;
      return redirect301(rssUrl);
    }

    // ── 4. Resolve other legacy paths ──
    const resolved = await resolveCleanPath(rawPath);
    if (resolved !== rawPath) {
      return redirect301(resolved);
    }

    // ── 5. No match — return 404 with minimal HTML ──
    return new Response("Not Found", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });

  } catch (error) {
    console.error("redirect-legacy error:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});

/**
 * Resolve a clean (no Pinterest suffix) legacy path to its new canonical URL.
 * Returns the new path/URL if a redirect is needed, or the original path if no match.
 */
async function resolveCleanPath(path: string): Promise<string> {
  // Normalize: remove trailing slash (except root)
  const p = path.length > 1 ? path.replace(/\/$/, "") : path;

  // ── Date-based permalinks: /2020/08/07/slug → /novidades/slug ──
  const dateMatch = p.match(/^\/\d{4}\/\d{2}\/\d{2}\/([a-zA-Z0-9-]+)$/);
  if (dateMatch) {
    return `${SITE_URL}/novidades/${dateMatch[1]}`;
  }

  // ── Old dictionary without /novidades prefix: /dicionario/term → /novidades/dicionario/term ──
  const dictMatch = p.match(/^\/dicionario\/([a-zA-Z0-9%-]+)$/);
  if (dictMatch) {
    return `${SITE_URL}/novidades/dicionario/${dictMatch[1]}`;
  }
  // /dicionario root
  if (p === "/dicionario") {
    return `${SITE_URL}/novidades/dicionario`;
  }

  // ── /dicionario_tag/* and /dicionario_categoria/* → /novidades/dicionario ──
  if (p.startsWith("/dicionario_tag/") || p.startsWith("/dicionario_categoria/")) {
    return `${SITE_URL}/novidades/dicionario`;
  }

  // ── /tag/* → /novidades (tag pages don't exist individually in new site) ──
  if (p.startsWith("/tag/")) {
    return `${SITE_URL}/novidades`;
  }

  // ── /author/* → try to find matching blog author ──
  const authorMatch = p.match(/^\/author\/([a-zA-Z0-9-]+)/);
  if (authorMatch) {
    const authorSlug = authorMatch[1];
    // Try to find the author in the new system
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const { data: author } = await supabase
        .from("blog_authors")
        .select("slug")
        .eq("slug", authorSlug)
        .maybeSingle();
      if (author) {
        return `${SITE_URL}/m/${author.slug}/blog`;
      }
    } catch (_e) { /* fallback below */ }
    return `${SITE_URL}/novidades`;
  }

  // ── /rpg/* category paths → /novidades ──
  if (p.startsWith("/rpg/")) {
    return `${SITE_URL}/novidades`;
  }

  // ── /geek-lifestyle/* → /novidades ──
  if (p.startsWith("/geek-lifestyle/")) {
    return `${SITE_URL}/novidades`;
  }

  // ── /serious-games/* → /novidades ──
  if (p.startsWith("/serious-games/")) {
    return `${SITE_URL}/novidades`;
  }

  // ── /cartas/* → /novidades ──
  if (p.startsWith("/cartas/")) {
    return `${SITE_URL}/novidades`;
  }

  // ── /tabuleiro/* → /novidades ──
  if (p.startsWith("/tabuleiro/")) {
    return `${SITE_URL}/novidades`;
  }

  // ── /cursos/* → landing pages or /novidades ──
  if (p === "/cursos/o-livro-completo-do-mestre-de-rpg") {
    return `${SITE_URL}/o-livro-completo-do-mestre-de-rpg`;
  }
  if (p === "/cursos/worldbuilding") {
    return `${SITE_URL}/curso-de-worldbuilding`;
  }
  if (p.startsWith("/cursos/")) {
    return `${SITE_URL}/novidades`;
  }

  // ── /postagens/* (old blog listing pages) → /novidades ──
  if (p.startsWith("/postagens/")) {
    return `${SITE_URL}/novidades`;
  }

  // ── /league-of-legends, /webcomics, etc. (old category pages at root) ──
  if (p === "/league-of-legends" || p === "/webcomics") {
    return `${SITE_URL}/novidades`;
  }

  // ── /page/* (old paginated listing) → /novidades ──
  const pageMatch = p.match(/^\/page\/\d+$/);
  if (pageMatch) {
    return `${SITE_URL}/novidades`;
  }

  // ── /politica-de-cookies, /politica-de-privacidade → home (or specific pages if they exist) ──
  if (p === "/politica-de-cookies" || p === "/politica-de-privacidade") {
    return `${SITE_URL}/`;
  }

  // ── /sobre → home ──
  if (p === "/sobre") {
    return `${SITE_URL}/`;
  }

  // ── /fichas-de-personagem-de-rpg and similar old standalone pages ──
  // Try to match as a blog post slug
  const slugMatch = p.match(/^\/([a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9])$/);
  if (slugMatch) {
    const slug = slugMatch[1];
    // Skip known non-post paths
    const knownPaths = [
      "auth", "dashboard", "campaigns", "diary", "whiteboard",
      "players", "journey", "tools", "profile", "plans",
      "checkout", "admin", "onboarding", "novidades",
      "redefinir-senha", "author-blog",
    ];
    if (!knownPaths.includes(slug)) {
      // Check if this slug exists as a post
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        const { data: post } = await supabase
          .from("posts")
          .select("slug")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();
        if (post) {
          return `${SITE_URL}/novidades/${post.slug}`;
        }
      } catch (_e) { /* fallback: still try the redirect */ }
      // Even if post not found, it's likely an old post — redirect to /novidades/slug
      // so the SPA can show its own 404 with proper context
      return `${SITE_URL}/novidades/${slug}`;
    }
  }

  // No match
  return path;
}

/** 301 Moved Permanently */
function redirect301(location: string): Response {
  return new Response(null, {
    status: 301,
    headers: {
      ...corsHeaders,
      Location: location,
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
  });
}

/** 410 Gone — resource permanently removed */
function gone410(): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta name="robots" content="noindex"></head><body><p>This resource has been permanently removed.</p></body></html>`,
    {
      status: 410,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "X-Robots-Tag": "noindex",
      },
    }
  );
}
