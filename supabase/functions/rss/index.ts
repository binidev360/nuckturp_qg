/**
 * RSS Feed — Nuckturp Blog
 * 
 * Generates an enriched RSS 2.0 feed with:
 * - Media RSS namespace (media:content) for cover images
 * - content:encoded with article excerpts
 * - Reading time metadata
 * - Category + tag taxonomy
 * - Atom self-link for feed readers
 * 
 * Cache: 1h public, CDN-friendly
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const SITE_URL = "https://nuckturp.com.br";

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Strip HTML tags and truncate for safe XML CDATA alternative */
const stripHtml = (html: string, maxLen = 500) => {
  const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen - 3) + "..." : plain;
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch published + public posts with enriched data
  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug, excerpt, content, cover_url, published_at, updated_at, reading_time_min, tags, blog_authors(name), post_categories(name)")
    .eq("status", "published")
    .eq("visibility", "public")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(100);

  const items = (posts || []).map((p: any) => {
    const author = p.blog_authors?.name || "Nuckturp";
    const pubDate = p.published_at ? new Date(p.published_at).toUTCString() : new Date(p.updated_at).toUTCString();
    const postUrl = `${SITE_URL}/novidades/${escapeXml(p.slug)}`;

    // Build <category> tags from category + tags
    const categories: string[] = [];
    if (p.post_categories?.name) categories.push(p.post_categories.name);
    if (Array.isArray(p.tags)) {
      for (const tag of p.tags) {
        if (tag && !categories.includes(tag)) categories.push(tag);
      }
    }
    const categoryXml = categories.map((c: string) => `      <category>${escapeXml(c)}</category>`).join("\n");

    // Cover image as media:content (Media RSS)
    const mediaXml = p.cover_url
      ? `      <media:content url="${escapeXml(p.cover_url)}" medium="image" />\n      <media:thumbnail url="${escapeXml(p.cover_url)}" />`
      : "";

    // content:encoded with excerpt or stripped content snippet
    const contentSnippet = p.excerpt || (p.content ? stripHtml(p.content) : "");
    const contentEncoded = contentSnippet
      ? `      <content:encoded><![CDATA[<p>${contentSnippet}</p>${p.cover_url ? `<p><img src="${p.cover_url}" alt="${p.title}" /></p>` : ""}]]></content:encoded>`
      : "";

    return `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${p.excerpt || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      <dc:creator><![CDATA[${author}]]></dc:creator>
${categoryXml}
${mediaXml}
${contentEncoded}
    </item>`;
  });

  const lastBuildDate = posts?.[0]?.published_at
    ? new Date(posts[0].published_at).toUTCString()
    : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Novidades — Nuckturp</title>
    <link>${SITE_URL}/novidades</link>
    <description>Artigos, dicas e guias sobre RPG de mesa para mestres e jogadores.</description>
    <language>pt-BR</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/nuckturp-logo-white.png</url>
      <title>Nuckturp</title>
      <link>${SITE_URL}/novidades</link>
    </image>
${items.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
