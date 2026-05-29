/**
 * Sitemap Edge Function — Sitemap Index Architecture
 * ────────────────────────────────────────────────────
 * Serves a <sitemapindex> or individual sub-sitemaps depending on the query param.
 *
 * Routes:
 *   /sitemap          → <sitemapindex> (master index)
 *   /sitemap?type=posts&page=1  → blog posts (paginated, 1000/page)
 *   /sitemap?type=profiles      → public profiles (/m/:slug)
 *   /sitemap?type=dictionary    → dictionary entries
 *   /sitemap?type=static        → static/evergreen pages
 *   /sitemap?type=authors       → blog author pages
 *   /sitemap?type=notes         → public notes
 *   /sitemap?type=categories    → post category pages
 *
 * Pagination: posts use ?page=N (1000 URLs per page).
 * All other types fit in a single sitemap.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const SITE_URL = "https://nuckturp.com.br";
const FUNC_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sitemap`;
const PAGE_SIZE = 1000; // URLs per sub-sitemap page

const xmlHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};

/** Helper: wrap URLs in a <urlset> */
function urlset(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

/** Helper: format a single <url> entry */
function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/** Helper: create Supabase service client */
function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/** Helper: safe date formatting (YYYY-MM-DD) */
function fmtDate(d: string | null | undefined): string {
  if (!d) return new Date().toISOString().split("T")[0];
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// ─── Sub-sitemap: Static Pages ───────────────────────────────────────
async function buildStaticSitemap(): Promise<string> {
  const supabase = getSupabase();
  const today = fmtDate(null);

  // Get latest dictionary entry date for dynamic lastmod
  const { data: latestEntry } = await supabase
    .from("dictionary_entries")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const dictLastmod = latestEntry ? fmtDate(latestEntry.updated_at) : today;

  const pages = [
    { loc: "/", priority: "1.0", changefreq: "weekly", lastmod: today },
    { loc: "/novidades", priority: "0.9", changefreq: "daily", lastmod: today },
    { loc: "/novidades/dicionario", priority: "0.8", changefreq: "weekly", lastmod: dictLastmod },
    { loc: "/o-livro-completo-do-mestre-de-rpg", priority: "0.9", changefreq: "monthly", lastmod: "2026-03-01" },
    { loc: "/checklist-do-mestre-metodico", priority: "0.9", changefreq: "monthly", lastmod: "2026-03-01" },
    { loc: "/curso-de-worldbuilding", priority: "0.9", changefreq: "monthly", lastmod: "2026-03-01" },
  ];

  return urlset(pages.map(p => urlEntry(`${SITE_URL}${p.loc}`, p.lastmod, p.changefreq, p.priority)));
}

// ─── Sub-sitemap: Blog Posts (paginated) ─────────────────────────────
async function buildPostsSitemap(page: number): Promise<string> {
  const supabase = getSupabase();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: posts } = await supabase
    .from("posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (!posts || posts.length === 0) return urlset([]);

  const urls = posts.map(post =>
    urlEntry(
      `${SITE_URL}/novidades/${post.slug}`,
      fmtDate(post.updated_at || post.published_at),
      "monthly",
      "0.7"
    )
  );

  return urlset(urls);
}

// ─── Sub-sitemap: Public Profiles ────────────────────────────────────
async function buildProfilesSitemap(): Promise<string> {
  const supabase = getSupabase();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("slug, updated_at")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(50000);

  if (!profiles) return urlset([]);

  const urls = profiles
    .filter(p => p.slug)
    .map(p => urlEntry(`${SITE_URL}/m/${p.slug}`, fmtDate(p.updated_at), "monthly", "0.5"));

  return urlset(urls);
}

// ─── Sub-sitemap: Dictionary Entries ─────────────────────────────────
async function buildDictionarySitemap(): Promise<string> {
  const supabase = getSupabase();

  const { data: entries } = await supabase
    .from("dictionary_entries")
    .select("slug, updated_at")
    .order("term", { ascending: true })
    .limit(50000);

  if (!entries) return urlset([]);

  const urls = entries.map(e =>
    urlEntry(
      `${SITE_URL}/novidades/dicionario/${encodeURIComponent(e.slug)}`,
      fmtDate(e.updated_at),
      "monthly",
      "0.5"
    )
  );

  return urlset(urls);
}

// ─── Sub-sitemap: Blog Authors ───────────────────────────────────────
async function buildAuthorsSitemap(): Promise<string> {
  const supabase = getSupabase();

  // Get authors with published posts
  const { data: blogAuthors } = await supabase
    .from("blog_authors")
    .select("id, updated_at, profile_id")
    .not("profile_id", "is", null);

  if (!blogAuthors || blogAuthors.length === 0) return urlset([]);

  const profileIds = blogAuthors.map(a => a.profile_id).filter(Boolean);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, slug, updated_at")
    .in("id", profileIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  // Only include authors with published posts
  const { data: authorPostCounts } = await supabase
    .from("posts")
    .select("blog_author_id")
    .eq("status", "published")
    .eq("visibility", "public")
    .not("blog_author_id", "is", null);

  const authorPostSet = new Set((authorPostCounts || []).map(p => p.blog_author_id));

  const urls: string[] = [];
  for (const author of blogAuthors) {
    if (!authorPostSet.has(author.id)) continue;
    const profile = profileMap.get(author.profile_id);
    if (!profile?.slug) continue;
    urls.push(urlEntry(
      `${SITE_URL}/m/${profile.slug}/blog`,
      fmtDate(author.updated_at || profile.updated_at),
      "weekly",
      "0.6"
    ));
  }

  return urlset(urls);
}

// ─── Sub-sitemap: Public Notes ───────────────────────────────────────
async function buildNotesSitemap(): Promise<string> {
  const supabase = getSupabase();

  const { data: notes } = await supabase
    .from("notes")
    .select("public_token, updated_at, created_at")
    .eq("is_public", true)
    .not("public_token", "is", null)
    .order("updated_at", { ascending: false })
    .limit(50000);

  if (!notes) return urlset([]);

  const urls = notes
    .filter(n => n.public_token)
    .map(n => urlEntry(
      `${SITE_URL}/n/${n.public_token}`,
      fmtDate(n.updated_at || n.created_at),
      "monthly",
      "0.4"
    ));

  return urlset(urls);
}

// ─── Sub-sitemap: Post Categories ────────────────────────────────────
async function buildCategoriesSitemap(): Promise<string> {
  const supabase = getSupabase();
  const today = fmtDate(null);

  const { data: categories } = await supabase
    .from("post_categories")
    .select("slug")
    .order("sort_order", { ascending: true });

  if (!categories) return urlset([]);

  const urls = categories.map(cat =>
    urlEntry(
      `${SITE_URL}/novidades?cat=${encodeURIComponent(cat.slug)}`,
      today,
      "weekly",
      "0.6"
    )
  );

  return urlset(urls);
}

// ─── Sub-sitemap: Images (extracted from post content + covers) ──────
async function buildImagesSitemap(): Promise<string> {
  const supabase = getSupabase();

  const { data: posts } = await supabase
    .from("posts")
    .select("slug, title, cover_url, og_image_url, content, updated_at")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(5000);

  if (!posts || posts.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
</urlset>`;
  }

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;

  const urls = posts.map(post => {
    const images: { loc: string; title?: string }[] = [];

    // Add cover/OG image
    const coverImg = post.og_image_url || post.cover_url;
    if (coverImg) {
      images.push({ loc: escapeXml(coverImg), title: escapeXml(post.title) });
    }

    // Extract images from content
    if (post.content) {
      let m: RegExpExecArray | null;
      const seenUrls = new Set(coverImg ? [coverImg] : []);
      while ((m = imgRegex.exec(post.content)) !== null) {
        const imgUrl = m[1];
        if (!seenUrls.has(imgUrl) && imgUrl.startsWith("http")) {
          seenUrls.add(imgUrl);
          images.push({ loc: escapeXml(imgUrl), title: escapeXml(m[2] || post.title) });
        }
      }
      imgRegex.lastIndex = 0; // Reset regex state
    }

    if (images.length === 0) return "";

    const imageEntries = images.slice(0, 10).map(img =>
      `    <image:image>
      <image:loc>${img.loc}</image:loc>
      <image:title>${img.title || ""}</image:title>
    </image:image>`
    ).join("\n");

    return `  <url>
    <loc>${SITE_URL}/novidades/${post.slug}</loc>
    <lastmod>${fmtDate(post.updated_at)}</lastmod>
${imageEntries}
  </url>`;
  }).filter(Boolean);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;
}

/** Escape special XML characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Sitemap Index (master) ──────────────────────────────────────────
async function buildSitemapIndex(): Promise<string> {
  const supabase = getSupabase();
  const today = fmtDate(null);

  // Count total published posts to determine number of post pages
  const { count: postCount } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .eq("visibility", "public");

  const totalPostPages = Math.max(1, Math.ceil((postCount || 0) / PAGE_SIZE));

  const sitemaps: string[] = [];

  // Static pages
  sitemaps.push(`  <sitemap>
    <loc>${FUNC_URL}?type=static</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

  // Post pages (paginated)
  for (let page = 1; page <= totalPostPages; page++) {
    sitemaps.push(`  <sitemap>
    <loc>${FUNC_URL}?type=posts&page=${page}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
  }

  // Authors
  sitemaps.push(`  <sitemap>
    <loc>${FUNC_URL}?type=authors</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

  // Profiles
  sitemaps.push(`  <sitemap>
    <loc>${FUNC_URL}?type=profiles</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

  // Dictionary
  sitemaps.push(`  <sitemap>
    <loc>${FUNC_URL}?type=dictionary</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

  // Notes
  sitemaps.push(`  <sitemap>
    <loc>${FUNC_URL}?type=notes</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

  // Categories
  sitemaps.push(`  <sitemap>
    <loc>${FUNC_URL}?type=categories</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

  // Images (Google Image Search optimization)
  sitemaps.push(`  <sitemap>
    <loc>${FUNC_URL}?type=images</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join("\n")}
</sitemapindex>`;
}

// ─── Main Handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  try {
    let xml: string;

    switch (type) {
      case "static":
        xml = await buildStaticSitemap();
        break;
      case "posts":
        xml = await buildPostsSitemap(page);
        break;
      case "profiles":
        xml = await buildProfilesSitemap();
        break;
      case "dictionary":
        xml = await buildDictionarySitemap();
        break;
      case "authors":
        xml = await buildAuthorsSitemap();
        break;
      case "notes":
        xml = await buildNotesSitemap();
        break;
      case "categories":
        xml = await buildCategoriesSitemap();
        break;
      case "images":
        xml = await buildImagesSitemap();
        break;
      default:
        // No type = serve the master sitemap index
        xml = await buildSitemapIndex();
        break;
    }

    return new Response(xml, { headers: xmlHeaders });
  } catch (err) {
    console.error("Sitemap error:", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { status: 500, headers: xmlHeaders }
    );
  }
});
