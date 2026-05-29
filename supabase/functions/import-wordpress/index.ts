import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── XML parser helpers ──

function getTagContent(xml: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cdata = new RegExp(`<${escaped}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${escaped}>`, "i");
  const cdataMatch = xml.match(cdata);
  if (cdataMatch) return cdataMatch[1].trim();

  const plain = new RegExp(`<${escaped}>([\\s\\S]*?)</${escaped}>`, "i");
  const plainMatch = xml.match(plain);
  return plainMatch ? plainMatch[1].trim() : "";
}

function getAttr(tag: string, attr: string): string {
  const re = new RegExp(`${attr}="([^"]*)"`, "i");
  const m = tag.match(re);
  return m ? m[1] : "";
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200);
}

// Decode HTML entities (e.g. &amp; → &, &#8217; → ', &lt; → <)
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8212;/g, "\u2014")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&nbsp;/g, " ");
}

// Strip HTML tags and return plain text
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
}

// Auto-generate excerpt from HTML content (first ~160 chars)
function autoExcerpt(html: string, maxLen = 160): string {
  const text = stripHtml(html);
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf(" ", maxLen);
  return text.substring(0, cut > 0 ? cut : maxLen) + "…";
}

// ── MD5 hash for Gravatar ──
async function md5Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Image helpers ──

async function reHostImage(
  url: string,
  supabase: any,
  bucket: string,
  folder: string
): Promise<string | null> {
  try {
    const resp = await fetch(url, { redirect: "follow" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("gif") ? "gif" : "jpg";
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const arrayBuf = await blob.arrayBuffer();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filename, arrayBuf, { contentType, upsert: false });
    if (error) {
      console.error("Upload error:", error.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
    return urlData.publicUrl;
  } catch (e) {
    console.error("Re-host error:", e);
    return null;
  }
}

async function reHostContentImages(
  html: string,
  supabase: any,
  bucket: string
): Promise<string> {
  const imgRe = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi;
  const urls = new Set<string>();
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    if (m[1].startsWith("http")) urls.add(m[1]);
  }

  const hrefRe = /href=["'](https?:\/\/[^"']*\.(?:jpg|jpeg|png|gif|webp)[^"']*)["']/gi;
  while ((m = hrefRe.exec(html)) !== null) {
    urls.add(m[1]);
  }

  const urlMap = new Map<string, string>();
  const urlArr = Array.from(urls);
  for (let i = 0; i < urlArr.length; i += 5) {
    const batch = urlArr.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (url) => {
        const newUrl = await reHostImage(url, supabase, bucket, "content");
        return { url, newUrl };
      })
    );
    for (const { url, newUrl } of results) {
      if (newUrl) urlMap.set(url, newUrl);
    }
  }

  let result = html;
  for (const [old, newUrl] of urlMap) {
    result = result.split(old).join(newUrl);
  }
  return result;
}

// ── Extract a specific postmeta value by key (handles CDATA) ──
function getMetaValue(item: string, metaKey: string): string | null {
  const escaped = metaKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Try CDATA variant first
  const cdataRe = new RegExp(
    `<wp:postmeta>[\\s\\S]*?<wp:meta_key>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/wp:meta_key>[\\s\\S]*?<wp:meta_value>[\\s\\S]*?<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>[\\s\\S]*?<\\/wp:meta_value>[\\s\\S]*?<\\/wp:postmeta>`,
    "i"
  );
  const cdataMatch = item.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  // Plain variant
  const plainRe = new RegExp(
    `<wp:postmeta>[\\s\\S]*?<wp:meta_key>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/wp:meta_key>[\\s\\S]*?<wp:meta_value>([\\s\\S]*?)<\\/wp:meta_value>[\\s\\S]*?<\\/wp:postmeta>`,
    "i"
  );
  const plainMatch = item.match(plainRe);
  if (plainMatch) return plainMatch[1].trim();
  return null;
}

// ── Attachment map ──

function buildAttachmentMap(items: string[]): Map<string, { url: string; alt: string; caption: string; description: string }> {
  const map = new Map();
  for (const item of items) {
    const postType = getTagContent(item, "wp:post_type");
    if (postType !== "attachment") continue;
    const postId = getTagContent(item, "wp:post_id");
    const url = getTagContent(item, "wp:attachment_url");
    const caption = getTagContent(item, "excerpt:encoded") || getTagContent(item, "title");
    const description = getTagContent(item, "content:encoded");
    const altMeta = item.match(/<wp:postmeta>[\s\S]*?<wp:meta_key>_wp_attachment_image_alt<\/wp:meta_key>[\s\S]*?<wp:meta_value>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<\/wp:meta_value>[\s\S]*?<\/wp:postmeta>/i)
      || item.match(/<wp:postmeta>[\s\S]*?<wp:meta_key>_wp_attachment_image_alt<\/wp:meta_key>[\s\S]*?<wp:meta_value>([\s\S]*?)<\/wp:meta_value>[\s\S]*?<\/wp:postmeta>/i);
    const alt = altMeta ? altMeta[1].trim() : "";
    if (url) map.set(postId, { url, alt, caption, description });
  }
  return map;
}

// ── SEO metadata extraction ──

function extractSeoMeta(item: string, postTitle: string, postExcerpt: string | null, rawContent: string, postTags?: string[]): {
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[] | null;
  ogImageUrl: string | null;
} {
  const metaRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/gi;
  let m;
  const seoFields: Record<string, string> = {};
  const seoKeys = new Set([
    "_yoast_wpseo_title", "_yoast_wpseo_metadesc", "_yoast_wpseo_focuskw",
    "_yoast_wpseo_opengraph-image",
    "rank_math_title", "rank_math_description", "rank_math_focus_keyword",
    "rank_math_og_content_image",
  ]);
  while ((m = metaRe.exec(item)) !== null) {
    const block = m[1];
    const key = getTagContent(block, "wp:meta_key");
    const value = getTagContent(block, "wp:meta_value");
    if (key && value && seoKeys.has(key)) {
      seoFields[key] = value;
    }
  }

  // SEO Title — strip Yoast placeholders, fallback to post title (truncated to 60 chars for Google)
  let rawTitle = seoFields["_yoast_wpseo_title"] || seoFields["rank_math_title"] || null;
  let seoTitle: string | null = null;
  if (rawTitle) {
    seoTitle = rawTitle.replace(/%%[^%]+%%/g, "").replace(/\s{2,}/g, " ").trim() || null;
  }
  // Always provide a title — Google requires it, truncate to ~60 chars
  if (!seoTitle) {
    seoTitle = postTitle.length > 60
      ? postTitle.substring(0, postTitle.lastIndexOf(" ", 57) || 57) + "…"
      : postTitle;
  }

  // SEO Description — fallback chain: Yoast -> RankMath -> excerpt -> auto-generated
  // Google truncates at ~155-160 chars, so enforce max length
  let seoDescription = seoFields["_yoast_wpseo_metadesc"]
    || seoFields["rank_math_description"]
    || null;
  if (!seoDescription && postExcerpt) {
    seoDescription = stripHtml(postExcerpt);
  }
  if (!seoDescription) {
    seoDescription = autoExcerpt(rawContent, 155);
  }
  // Truncate to 155 chars if too long (Google-safe)
  if (seoDescription && seoDescription.length > 155) {
    const cut = seoDescription.lastIndexOf(" ", 152);
    seoDescription = seoDescription.substring(0, cut > 0 ? cut : 152) + "…";
  }

  // Focus keywords — fallback to WP tags if no Yoast/RankMath keyword
  const focusKw = seoFields["_yoast_wpseo_focuskw"] || seoFields["rank_math_focus_keyword"] || null;
  let seoKeywords: string[] | null = null;
  if (focusKw) {
    seoKeywords = focusKw.split(",").map(k => k.trim()).filter(Boolean);
  } else if (postTags && postTags.length > 0) {
    // Use WP tags as keywords (limit to 5 most relevant)
    seoKeywords = postTags.slice(0, 5);
  }

  // OG image
  const ogImageUrl = seoFields["_yoast_wpseo_opengraph-image"] || seoFields["rank_math_og_content_image"] || null;

  return {
    seoTitle: seoTitle ? decodeEntities(seoTitle) : null,
    seoDescription: seoDescription ? decodeEntities(seoDescription) : null,
    seoKeywords: seoKeywords ? seoKeywords.map(k => decodeEntities(k)) : null,
    ogImageUrl,
  };
}

// ── HTML cleaning ──

function cleanWpHtml(html: string, attachmentMap?: Map<string, { url: string; alt: string; caption: string; description: string }>): string {
  let clean = html;

  // Convert [caption] shortcodes to <figure> with figcaption
  clean = clean.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, (_, inner) => {
    const innerTrimmed = inner.trim();
    const imgMatch = innerTrimmed.match(/<img[^>]*>/i);
    const linkMatch = innerTrimmed.match(/<a[^>]*>([\s\S]*?<img[^>]*>[\s\S]*?)<\/a>/i);
    let captionText = innerTrimmed;
    if (linkMatch) {
      captionText = innerTrimmed.replace(linkMatch[0], "").trim();
    } else if (imgMatch) {
      captionText = innerTrimmed.replace(imgMatch[0], "").trim();
    }
    captionText = captionText.replace(/<[^>]+>/g, "").trim();

    const imgTag = imgMatch ? imgMatch[0] : "";
    const href = linkMatch ? getAttr(linkMatch[0], "href") : "";

    let figure = `<figure data-type="custom-image">`;
    if (href) {
      figure += `<a href="${href}">${imgTag}</a>`;
    } else {
      figure += imgTag;
    }
    if (captionText) {
      figure += `<figcaption class="text-xs text-center mt-2 italic opacity-70">${captionText}</figcaption>`;
    }
    figure += `</figure>`;
    return figure;
  });

  // Convert [embed]url[/embed] to proper embeds (YouTube, Twitter, etc.)
  clean = clean.replace(/\[embed\]([\s\S]*?)\[\/embed\]/gi, (_, url) => {
    const trimmedUrl = url.trim();
    // YouTube
    const ytMatch = trimmedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) {
      return `<div data-youtube-video><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
    }
    // Generic: render as a link
    return `<p><a href="${trimmedUrl}" target="_blank" rel="noopener">${trimmedUrl}</a></p>`;
  });

  // Convert standalone <a><img></a> patterns to figure with link
  clean = clean.replace(/<a([^>]*)>(\s*<img[^>]*>\s*)<\/a>/gi, (full, aAttrs, imgTag) => {
    const href = getAttr(`<a${aAttrs}>`, "href");
    if (!href) return full;
    if (!href.match(/\.(jpg|jpeg|png|gif|webp)/i) && !href.includes("wp-content")) return full;
    return `<figure data-type="custom-image"><a href="${href}">${imgTag.trim()}</a></figure>`;
  });

  // Apply attachment metadata: enrich img tags with alt text
  if (attachmentMap) {
    clean = clean.replace(/<img([^>]*)>/gi, (full, attrs) => {
      const classAttr = getAttr(full, "class");
      const idMatch = classAttr.match(/wp-image-(\d+)/);
      if (idMatch) {
        const attachId = idMatch[1];
        const attach = attachmentMap.get(attachId);
        if (attach) {
          const existingAlt = getAttr(full, "alt");
          if (!existingAlt && attach.alt) {
            return `<img alt="${attach.alt}"${attrs}>`;
          }
        }
      }
      return full;
    });
  }

  // Remove remaining WordPress shortcodes (but preserve content inside)
  clean = clean.replace(/\[\/?[a-z_]+[^\]]*\]/gi, "");

  // Clean up empty paragraphs and excessive whitespace
  clean = clean.replace(/<p>\s*<\/p>/gi, "");
  clean = clean.replace(/(<br\s*\/?>){3,}/gi, "<br><br>");

  // Convert double newlines to paragraphs if no block-level tags exist
  clean = clean.replace(/\r\n/g, "\n");
  if (!clean.includes("<p>") && !clean.includes("<div>")) {
    clean = clean
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  return clean;
}

// ── Category/tag extraction helpers ──

function extractCategories(item: string): string[] {
  const catTags = item.match(/<category[^>]*domain="category"[^>]*>[\s\S]*?<\/category>/gi) || [];
  const categories: string[] = [];
  for (const catTag of catTags) {
    const cdataMatch = catTag.match(/<!\[CDATA\[(.*?)\]\]>/);
    const plainMatch = catTag.match(/>([^<]+)</);
    const name = cdataMatch ? cdataMatch[1] : plainMatch ? plainMatch[1] : "";
    if (name.trim()) categories.push(decodeEntities(name.trim()));
  }
  return categories;
}

function extractTags(item: string): string[] {
  const tagTags = item.match(/<category[^>]*domain="post_tag"[^>]*>[\s\S]*?<\/category>/gi) || [];
  const tags: string[] = [];
  for (const tagTag of tagTags) {
    const cdataMatch = tagTag.match(/<!\[CDATA\[(.*?)\]\]>/);
    const plainMatch = tagTag.match(/>([^<]+)</);
    const name = cdataMatch ? cdataMatch[1] : plainMatch ? plainMatch[1] : "";
    if (name.trim()) tags.push(decodeEntities(name.trim()));
  }
  return tags;
}

function getCategoryNicenames(item: string): string[] {
  const catTags = item.match(/<category[^>]*domain="category"[^>]*>[\s\S]*?<\/category>/gi) || [];
  return catTags.map(t => getAttr(t, "nicename")).filter(Boolean);
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Admin check via user_roles table
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Parse request
    const contentType = req.headers.get("content-type") || "";
    let xmlContent: string;
    let mode: "preview" | "import" | "sync_categories" | "sync_categories_preview" = "import";
    let createSlugs: string[] | null = null;
    let selectedSlugs: string[] | null = null;
    let updateExisting = false;
    let urlRewrites: Array<{ from: string; to: string }> = [];
    let urlOverrides: Record<string, string | null> = {};
    let authorMapping: Record<string, { action: string; target_id?: string }> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      xmlContent = await file.text();
      const modeStr = formData.get("mode") as string;
      mode = modeStr === "preview" ? "preview" : modeStr === "sync_categories" ? "sync_categories" : modeStr === "sync_categories_preview" ? "sync_categories_preview" : "import";
      const createSlugsStr = formData.get("create_slugs") as string;
      if (createSlugsStr) {
        try { createSlugs = JSON.parse(createSlugsStr); } catch { /* ignore */ }
      }
      const slugsStr = formData.get("selected_slugs") as string;
      if (slugsStr) {
        try { selectedSlugs = JSON.parse(slugsStr); } catch { /* ignore */ }
      }
      updateExisting = formData.get("update_existing") === "true";
      const rewritesStr = formData.get("url_rewrites") as string;
      if (rewritesStr) {
        try { urlRewrites = JSON.parse(rewritesStr); } catch { /* ignore */ }
      }
      const overridesStr = formData.get("url_overrides") as string;
      if (overridesStr) {
        try { urlOverrides = JSON.parse(overridesStr); } catch { /* ignore */ }
      }
      const authorMapStr = formData.get("author_mapping") as string;
      if (authorMapStr) {
        try { authorMapping = JSON.parse(authorMapStr); } catch { /* ignore */ }
      }
    } else {
      const body = await req.json();
      xmlContent = body.xml;
      mode = body.mode === "preview" ? "preview" : body.mode === "sync_categories" ? "sync_categories" : body.mode === "sync_categories_preview" ? "sync_categories_preview" : "import";
      createSlugs = body.create_slugs || null;
      selectedSlugs = body.selected_slugs || null;
      updateExisting = body.update_existing === true;
      urlRewrites = body.url_rewrites || [];
      urlOverrides = body.url_overrides || {};
      authorMapping = body.author_mapping || {};
    }

    if (!xmlContent || xmlContent.length < 100) {
      return new Response(JSON.stringify({ error: "Invalid XML content" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // ── Parse WXR XML ──
    const itemRe = /<item>([\s\S]*?)<\/item>/gi;
    const items: string[] = [];
    let itemMatch;
    while ((itemMatch = itemRe.exec(xmlContent)) !== null) {
      items.push(itemMatch[1]);
    }

    const postItems = items.filter((item) => {
      const postType = getTagContent(item, "wp:post_type");
      return postType === "post";
    });

    // ── Extract authors ──
    const wpAuthorRe = /<wp:author>([\s\S]*?)<\/wp:author>/gi;
    const wpAuthors: Array<{ login: string; email: string; display_name: string; first_name: string; last_name: string }> = [];
    let authorMatch;
    while ((authorMatch = wpAuthorRe.exec(xmlContent)) !== null) {
      const authorXml = authorMatch[1];
      wpAuthors.push({
        login: getTagContent(authorXml, "wp:author_login"),
        email: getTagContent(authorXml, "wp:author_email"),
        display_name: getTagContent(authorXml, "wp:author_display_name"),
        first_name: getTagContent(authorXml, "wp:author_first_name"),
        last_name: getTagContent(authorXml, "wp:author_last_name"),
      });
    }

    // ── Extract categories ──
    const wpCatRe = /<wp:category>([\s\S]*?)<\/wp:category>/gi;
    const wpCategories: Array<{ slug: string; name: string; parent: string }> = [];
    let catMatch;
    while ((catMatch = wpCatRe.exec(xmlContent)) !== null) {
      const catXml = catMatch[1];
      wpCategories.push({
        slug: getTagContent(catXml, "wp:category_nicename"),
        name: decodeEntities(getTagContent(catXml, "wp:cat_name")),
        parent: getTagContent(catXml, "wp:category_parent"),
      });
    }

    // ── PREVIEW MODE ──
    if (mode === "preview") {
      const allSlugs = postItems.map(item => {
        const title = getTagContent(item, "title");
        return getTagContent(item, "wp:post_name") || generateSlug(title);
      });

      const existingSlugs = new Set<string>();
      for (let i = 0; i < allSlugs.length; i += 50) {
        const batch = allSlugs.slice(i, i + 50);
        const { data } = await supabase
          .from("posts")
          .select("slug")
          .in("slug", batch);
        (data || []).forEach((d: any) => existingSlugs.add(d.slug));
      }

      // Build attachment map for cover detection in preview
      const previewAttachmentMap = buildAttachmentMap(items);

      const preview = postItems.map((item) => {
        const title = decodeEntities(getTagContent(item, "title"));
        const slug = getTagContent(item, "wp:post_name") || generateSlug(title);
        const pubDate = getTagContent(item, "wp:post_date");
        const wpStatus = getTagContent(item, "wp:status");
        const rawExcerpt = getTagContent(item, "excerpt:encoded");
        const creator = getTagContent(item, "dc:creator");
        const rawContent = getTagContent(item, "content:encoded");

        const categories = extractCategories(item);
        const tags = extractTags(item);

        const imgCount = (rawContent.match(/<img[^>]*>/gi) || []).length;
        
        // Detect cover using robust getMetaValue helper (handles CDATA)
        const thumbId = getMetaValue(item, "_thumbnail_id");
        const hasCoverFromThumb = !!thumbId && previewAttachmentMap.has(thumbId);
        const hasCoverFromContent = rawContent.match(/<img[^>]*\ssrc=["']https?:\/\/[^"']+["'][^>]*>/i) !== null;
        const hasCover = hasCoverFromThumb || hasCoverFromContent;
        
        // Get the actual cover URL for preview
        let coverPreviewUrl: string | null = null;
        if (thumbId && previewAttachmentMap.has(thumbId)) {
          coverPreviewUrl = previewAttachmentMap.get(thumbId)!.url;
        }
        
        const captionCount = (rawContent.match(/\[caption[^\]]*\]/gi) || []).length;
        const contentPlain = stripHtml(rawContent);
        const contentLength = contentPlain.length;
        const wordCount = contentPlain.split(/\s+/).filter(Boolean).length;
        const readingTimeMin = Math.max(1, Math.round(wordCount / 200));

        // Extract image URLs for thumbnail preview
        const imgMatches = rawContent.match(/<img[^>]*\ssrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi) || [];
        const imageUrls = imgMatches.slice(0, 6).map((tag: string) => {
          const m = tag.match(/src=["'](https?:\/\/[^"']+)["']/i);
          return m ? m[1] : null;
        }).filter(Boolean);

        // Extract link URLs (href) for URL management
        const linkMatches = rawContent.match(/href=["'](https?:\/\/[^"']+)["']/gi) || [];
        const linkUrls = [...new Set(linkMatches.map((tag: string) => {
          const m = tag.match(/href=["'](https?:\/\/[^"']+)["']/i);
          return m ? m[1] : null;
        }).filter(Boolean))] as string[];

        // Extract custom fields count
        const customFieldMatches = item.match(/<wp:postmeta>/gi) || [];
        const customFieldsCount = customFieldMatches.length;

        const alreadyExists = existingSlugs.has(slug);
        const authorInfo = wpAuthors.find(a => a.login === creator);

        // Extract SEO info for preview
        const seo = extractSeoMeta(item, title, rawExcerpt || null, rawContent, tags);

        return {
          title,
          slug,
          date: pubDate || null,
          wp_status: wpStatus,
          excerpt: rawExcerpt ? rawExcerpt.substring(0, 200) : null,
          categories,
          tags,
          image_count: imgCount,
          has_cover: hasCover,
          cover_preview_url: coverPreviewUrl,
          caption_count: captionCount,
          content_length: contentLength,
          word_count: wordCount,
          reading_time_min: readingTimeMin,
          image_urls: imageUrls,
          link_urls: linkUrls,
          custom_fields_count: customFieldsCount,
          already_exists: alreadyExists,
          author: authorInfo ? { login: authorInfo.login, display_name: authorInfo.display_name || authorInfo.login, email: authorInfo.email } : null,
          seo: {
            title: seo.seoTitle || null,
            description: seo.seoDescription || null,
            keywords: seo.seoKeywords || [],
            og_image: seo.ogImageUrl || null,
            has_title: !!seo.seoTitle,
            has_description: !!seo.seoDescription,
            has_keywords: !!(seo.seoKeywords && seo.seoKeywords.length > 0),
            has_og_image: !!seo.ogImageUrl,
            focus_keyword: seo.seoKeywords?.[0] || null,
          },
        };
      });

      // Check which authors already exist in DB
      const authorPreviews = [];
      for (const a of wpAuthors) {
        const authorSlug = generateSlug(a.display_name || a.login);
        const { data: existing } = await supabase
          .from("blog_authors")
          .select("id, name, slug")
          .eq("slug", authorSlug)
          .maybeSingle();
        authorPreviews.push({
          login: a.login,
          display_name: a.display_name || a.login,
          email: a.email,
          exists: !!existing,
          existing_id: existing?.id || null,
          existing_name: existing?.name || null,
        });
      }

      // Also fetch all existing blog authors for mapping UI
      const { data: allDbAuthors } = await supabase
        .from("blog_authors")
        .select("id, name, slug")
        .order("name");

      return new Response(JSON.stringify({
        mode: "preview",
        total: preview.length,
        already_existing: preview.filter(p => p.already_exists).length,
        categories: wpCategories.map(c => ({ name: c.name, slug: c.slug, parent: c.parent })),
        authors: authorPreviews,
        db_authors: allDbAuthors || [],
        posts: preview,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SYNC CATEGORIES PREVIEW MODE ──
    if (mode === "sync_categories_preview") {
      console.log("[sync_categories_preview] Checking missing categories. WP categories:", wpCategories.length);
      
      // Fetch all existing categories in one query instead of N queries
      const { data: allDbCats } = await supabase
        .from("post_categories")
        .select("slug")
        .limit(1000);
      const dbSlugs = new Set((allDbCats || []).map((c: any) => c.slug));
      
      const existing: Array<{ slug: string; name: string; parent: string }> = [];
      const missing: Array<{ slug: string; name: string; parent: string }> = [];
      
      for (const cat of wpCategories) {
        if (dbSlugs.has(cat.slug)) {
          existing.push({ slug: cat.slug, name: cat.name, parent: cat.parent || "" });
        } else {
          missing.push({ slug: cat.slug, name: cat.name, parent: cat.parent || "" });
        }
      }
      
      return new Response(JSON.stringify({
        mode: "sync_categories_preview",
        total: wpCategories.length,
        existing_count: existing.length,
        missing_count: missing.length,
        existing,
        missing,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (mode === "sync_categories") {
      console.log("[sync_categories] Starting. WP categories found:", wpCategories.length, "Post items:", postItems.length);
      
      // 1. Ensure all WP categories exist in DB (parents first, then children)
      const categoryMap = new Map<string, string>();
      let categoriesCreated = 0;

      for (const cat of wpCategories) {
        if (cat.parent) continue;
        const { data: existing } = await supabase
          .from("post_categories")
          .select("id")
          .eq("slug", cat.slug)
          .maybeSingle();
        if (existing) {
          categoryMap.set(cat.slug, existing.id);
        } else if (!createSlugs || createSlugs.includes(cat.slug)) {
          const { data: created } = await supabase
            .from("post_categories")
            .insert({ name: cat.name, slug: cat.slug })
            .select("id")
            .single();
          if (created) {
            categoryMap.set(cat.slug, created.id);
            categoriesCreated++;
          }
        }
      }

      for (const cat of wpCategories) {
        if (!cat.parent) continue;
      const parentSlug = wpCategories.find(c => c.slug === cat.parent || c.name === cat.parent)?.slug || cat.parent.toLowerCase().replace(/\s+/g, "-");
        const parentId = categoryMap.get(parentSlug) || null;
        const { data: existing } = await supabase
          .from("post_categories")
          .select("id, parent_id")
          .eq("slug", cat.slug)
          .maybeSingle();
        if (existing) {
          categoryMap.set(cat.slug, existing.id);
          // Fix parent_id if missing or wrong
          if (parentId && existing.parent_id !== parentId) {
            await supabase.from("post_categories").update({ parent_id: parentId }).eq("id", existing.id);
            console.log(`Fixed parent for category "${cat.name}" → parent_id=${parentId}`);
          }
        } else if (!createSlugs || createSlugs.includes(cat.slug)) {
          const { data: created } = await supabase
            .from("post_categories")
            .insert({ name: cat.name, slug: cat.slug, parent_id: parentId })
            .select("id")
            .single();
          if (created) {
            categoryMap.set(cat.slug, created.id);
            categoriesCreated++;
          }
        }
      }

      // 2. For each post in XML, match by slug and update category_ids
      let updatedCount = 0;
      let skippedCount = 0;
      let notFoundCount = 0;
      const details: Array<{ title: string; slug: string; status: string; categories: string[]; category_ids: string[] }> = [];

      for (const item of postItems) {
        const title = decodeEntities(getTagContent(item, "title"));
        const wpSlug = getTagContent(item, "wp:post_name") || generateSlug(title);

        // Get ALL category nicenames for this post
        const nicenames = getCategoryNicenames(item);
        const categoryNames = extractCategories(item);
        const resolvedIds: string[] = [];

        for (const n of nicenames) {
          if (categoryMap.has(n)) {
            resolvedIds.push(categoryMap.get(n)!);
          }
        }

        if (resolvedIds.length === 0) {
          skippedCount++;
          details.push({ title, slug: wpSlug, status: "skipped", categories: categoryNames, category_ids: [] });
          continue;
        }

        // Find existing post by slug
        const { data: existingPost } = await supabase
          .from("posts")
          .select("id, category_ids")
          .eq("slug", wpSlug)
          .maybeSingle();

        if (!existingPost) {
          notFoundCount++;
          details.push({ title, slug: wpSlug, status: "not_found", categories: categoryNames, category_ids: resolvedIds });
          continue;
        }

        // Update category_ids and category_id (first one)
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            category_ids: resolvedIds,
            category_id: resolvedIds[0],
          })
          .eq("id", existingPost.id);

        if (updateError) {
          details.push({ title, slug: wpSlug, status: "error", categories: categoryNames, category_ids: resolvedIds });
        } else {
          updatedCount++;
          details.push({ title, slug: wpSlug, status: "updated", categories: categoryNames, category_ids: resolvedIds });
        }
      }

      console.log("[sync_categories] Done. Updated:", updatedCount, "Skipped:", skippedCount, "Not found:", notFoundCount, "Categories created:", categoriesCreated);

      return new Response(JSON.stringify({
        mode: "sync_categories",
        total: postItems.length,
        updated: updatedCount,
        skipped: skippedCount,
        not_found: notFoundCount,
        categories_created: categoriesCreated,
        categories_total: categoryMap.size,
        details,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── IMPORT MODE ──
    // Create/update authors in DB with Gravatar bio fetching
    const authorMap = new Map<string, string>();
    for (const author of wpAuthors) {
      const mapping = authorMapping[author.login];
      
      // If mapped to existing author, use that directly
      if (mapping?.action === "map" && mapping.target_id) {
        authorMap.set(author.login, mapping.target_id);
        continue;
      }

      // If action is "skip", don't create
      if (mapping?.action === "skip") {
        continue;
      }

      const authorSlug = generateSlug(author.display_name || author.login);
      const authorName = author.display_name || `${author.first_name} ${author.last_name}`.trim() || author.login;
      const authorEmail = author.email || null;

      // Try to fetch bio from Gravatar profile
      let gravatarBio: string | null = null;
      if (authorEmail) {
        try {
          const emailHash = await md5Hash(authorEmail.trim().toLowerCase());
          const gResp = await fetch(`https://en.gravatar.com/${emailHash}.json`, { signal: AbortSignal.timeout(5000) });
          if (gResp.ok) {
            const gData = await gResp.json();
            const entry = gData?.entry?.[0];
            if (entry?.aboutMe) gravatarBio = entry.aboutMe;
            else if (entry?.currentLocation) gravatarBio = entry.currentLocation;
          }
        } catch { /* Gravatar profile not found or timeout — skip */ }
      }

      const { data: existing } = await supabase
        .from("blog_authors")
        .select("id, email, bio")
        .eq("slug", authorSlug)
        .maybeSingle();

      if (existing) {
        authorMap.set(author.login, existing.id);
        // Update author if missing email or bio
        const updates: Record<string, string> = {};
        if (!existing.email && authorEmail) updates.email = authorEmail;
        if (!existing.bio && gravatarBio) updates.bio = gravatarBio;
        if (Object.keys(updates).length > 0) {
          await supabase.from("blog_authors").update(updates).eq("id", existing.id);
          console.log(`Updated author "${authorName}" with:`, Object.keys(updates).join(", "));
        }
      } else {
        const { data: created } = await supabase
          .from("blog_authors")
          .insert({
            name: authorName,
            email: authorEmail,
            bio: gravatarBio,
            slug: authorSlug,
          })
          .select("id")
          .single();
        if (created) {
          authorMap.set(author.login, created.id);
          console.log(`Created author "${authorName}"${gravatarBio ? " with Gravatar bio" : ""}`);
        }
      }
    }

    // Create categories in DB (parents first, then children)
    const categoryMap = new Map<string, string>();
    let importCategoriesCreated = 0;

    for (const cat of wpCategories) {
      if (cat.parent) continue;
      const { data: existing } = await supabase
        .from("post_categories")
        .select("id")
        .eq("slug", cat.slug)
        .maybeSingle();
      if (existing) {
        categoryMap.set(cat.slug, existing.id);
      } else {
        const { data: created } = await supabase
          .from("post_categories")
          .insert({ name: cat.name, slug: cat.slug })
          .select("id")
          .single();
        if (created) { categoryMap.set(cat.slug, created.id); importCategoriesCreated++; }
      }
    }

    for (const cat of wpCategories) {
      if (!cat.parent) continue;
      const parentSlug = wpCategories.find(c => c.slug === cat.parent || c.name === cat.parent)?.slug || cat.parent.toLowerCase().replace(/\s+/g, "-");
      const parentId = categoryMap.get(parentSlug) || null;
      const { data: existing } = await supabase
        .from("post_categories")
        .select("id, parent_id")
        .eq("slug", cat.slug)
        .maybeSingle();
      if (existing) {
        categoryMap.set(cat.slug, existing.id);
        if (parentId && existing.parent_id !== parentId) {
          await supabase.from("post_categories").update({ parent_id: parentId }).eq("id", existing.id);
        }
      } else {
        const { data: created } = await supabase
          .from("post_categories")
          .insert({ name: cat.name, slug: cat.slug, parent_id: parentId })
          .select("id")
          .single();
        if (created) { categoryMap.set(cat.slug, created.id); importCategoriesCreated++; }
      }
    }

    // Filter posts by selected slugs
    const postsToImport = selectedSlugs
      ? postItems.filter(item => {
          const title = getTagContent(item, "title");
          const slug = getTagContent(item, "wp:post_name") || generateSlug(title);
          return selectedSlugs!.includes(slug);
        })
      : postItems;

    const attachmentMap = buildAttachmentMap(items);
    const results: Array<{ title: string; status: string; error?: string }> = [];
    const authorId = userData.user.id;

    for (const item of postsToImport) {
      const title = decodeEntities(getTagContent(item, "title"));
      const wpSlug = getTagContent(item, "wp:post_name") || generateSlug(title);
      const rawContent = getTagContent(item, "content:encoded");
      const rawExcerpt = getTagContent(item, "excerpt:encoded");
      const pubDate = getTagContent(item, "wp:post_date");
      const wpStatus = getTagContent(item, "wp:status");
      const creator = getTagContent(item, "dc:creator");
      const blogAuthorId = authorMap.get(creator) || null;

      // Resolve categories (all matching IDs + primary)
      const nicenames = getCategoryNicenames(item);
      const resolvedCategoryIds: string[] = [];
      for (const n of nicenames) {
        if (categoryMap.has(n)) resolvedCategoryIds.push(categoryMap.get(n)!);
      }
      const postCategoryId = resolvedCategoryIds.length > 0 ? resolvedCategoryIds[0] : null;

      // Resolve tags
      const postTags = extractTags(item).map(t => t.toLowerCase());

      // Check existing
      const { data: existingPost } = await supabase
        .from("posts")
        .select("id, cover_url, og_image_url")
        .eq("slug", wpSlug)
        .maybeSingle();

      if (existingPost && !updateExisting) {
        results.push({ title, status: "skipped", error: "Slug já existe" });
        continue;
      }

      try {
        // Clean HTML
        let cleanedContent = cleanWpHtml(rawContent, attachmentMap);
        cleanedContent = await reHostContentImages(cleanedContent, supabase, "blog-assets");

        // Apply URL rewrite rules
        for (const rule of urlRewrites) {
          if (rule.from && rule.to) {
            cleanedContent = cleanedContent.split(rule.from).join(rule.to);
          }
        }

        // Apply per-post URL overrides (edit or delete specific URLs)
        for (const [originalUrl, newUrl] of Object.entries(urlOverrides)) {
          if (newUrl === null) {
            // Delete: remove <a> tags wrapping this URL, keeping inner text
            const linkRe = new RegExp(`<a[^>]*href=["']${originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>(.*?)<\\/a>`, "gi");
            cleanedContent = cleanedContent.replace(linkRe, "$1");
          } else if (newUrl) {
            // Replace URL
            cleanedContent = cleanedContent.split(originalUrl).join(newUrl);
          }
        }

        const seo = extractSeoMeta(item, title, rawExcerpt || null, rawContent, postTags);

        // Excerpt: use WP excerpt, or auto-generate from content
        const excerpt = decodeEntities(rawExcerpt || autoExcerpt(rawContent));

        // Cover image: try _thumbnail_id first
        let coverUrl: string | null = null;

        // On upsert, skip re-hosting if cover already exists
        if (existingPost?.cover_url && updateExisting) {
          coverUrl = existingPost.cover_url;
        } else {
          const thumbId = getMetaValue(item, "_thumbnail_id");
          if (thumbId) {
            const attachInfo = attachmentMap.get(thumbId);
            if (attachInfo) {
              coverUrl = await reHostImage(attachInfo.url, supabase, "blog-assets", "covers");
            } else {
              const attachmentItem = items.find(i => {
                const postId = getTagContent(i, "wp:post_id");
                const postType = getTagContent(i, "wp:post_type");
                return postId === thumbId && postType === "attachment";
              });
              if (attachmentItem) {
                const attachUrl = getTagContent(attachmentItem, "wp:attachment_url");
                if (attachUrl) {
                  coverUrl = await reHostImage(attachUrl, supabase, "blog-assets", "covers");
                }
              }
            }
          }

          // Fallback: first image in content
          if (!coverUrl) {
            const firstImgMatch = rawContent.match(/<img[^>]*\ssrc=["'](https?:\/\/[^"']+)["'][^>]*>/i);
            if (firstImgMatch) {
              coverUrl = await reHostImage(firstImgMatch[1], supabase, "blog-assets", "covers");
            }
          }
        }

        // OG image from Yoast — skip re-hosting on upsert if already exists
        let ogImageUrl: string | null = null;
        if (existingPost?.og_image_url && updateExisting) {
          ogImageUrl = existingPost.og_image_url;
        } else if (seo.ogImageUrl) {
          ogImageUrl = await reHostImage(seo.ogImageUrl, supabase, "blog-assets", "covers");
        }

        const status = wpStatus === "publish" ? "published" : "draft";
        const publishedAt = wpStatus === "publish" && pubDate ? new Date(pubDate).toISOString() : null;

        const postData: Record<string, any> = {
          title: decodeEntities(title),
          slug: wpSlug,
          content: cleanedContent,
          excerpt: excerpt ? decodeEntities(excerpt) : null,
          cover_url: coverUrl,
          category_id: postCategoryId,
          category_ids: resolvedCategoryIds.length > 0 ? resolvedCategoryIds : [],
          blog_author_id: blogAuthorId,
          tags: postTags.length > 0 ? postTags : null,
          status,
          visibility: "public",
          published_at: publishedAt,
          seo_title: seo.seoTitle || null,
          seo_description: seo.seoDescription || null,
          seo_keywords: seo.seoKeywords && seo.seoKeywords.length > 0 ? seo.seoKeywords : null,
          og_image_url: ogImageUrl || coverUrl,
        };

        if (existingPost && updateExisting) {
          postData.updated_at = new Date().toISOString();
          const { error: updateError } = await supabase
            .from("posts")
            .update(postData)
            .eq("id", existingPost.id);

          if (updateError) {
            results.push({ title, status: "error", error: updateError.message });
          } else {
            results.push({ title, status: "updated" });
          }
        } else {
          postData.author_id = authorId;
          postData.pinned = false;

          const { error: insertError } = await supabase.from("posts").insert(postData);

          if (insertError) {
            results.push({ title, status: "error", error: insertError.message });
          } else {
            results.push({ title, status: "imported" });
          }
        }
      } catch (e: any) {
        results.push({ title, status: "error", error: e.message });
      }
    }

    const imported = results.filter(r => r.status === "imported").length;
    const updated = results.filter(r => r.status === "updated").length;
    const skipped = results.filter(r => r.status === "skipped").length;
    const errors = results.filter(r => r.status === "error").length;

    return new Response(JSON.stringify({
      mode: "import",
      total: postsToImport.length,
      imported,
      updated,
      skipped,
      errors,
      categories_created: importCategoriesCreated,
      details: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("import-wordpress error:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      message: "Ocorreu um erro ao processar a importação. Tente novamente.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
