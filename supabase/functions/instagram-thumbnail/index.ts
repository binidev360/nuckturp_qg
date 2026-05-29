import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IG_BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1)";

async function tryFetchImage(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": IG_BOT_UA,
        "Referer": "https://www.instagram.com/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    return res;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawPostUrl = url.searchParams.get("url");

    if (!rawPostUrl) {
      return new Response("URL required", { status: 400, headers: corsHeaders });
    }

    let postUrl: URL;
    try {
      postUrl = new URL(rawPostUrl);
    } catch {
      return new Response("Invalid URL", { status: 400, headers: corsHeaders });
    }

    if (!["https:", "http:"].includes(postUrl.protocol)) {
      return new Response("Unsupported protocol", { status: 400, headers: corsHeaders });
    }

    // Attempt 1: direct Instagram media endpoint (best for clean single image output)
    const normalized = rawPostUrl.replace(/\/+$/, "");
    const mediaEndpoint = `${normalized}/media/?size=l`;
    let imgRes = await tryFetchImage(mediaEndpoint);

    // Attempt 2: oEmbed thumbnail
    if (!imgRes) {
      const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(rawPostUrl)}&maxwidth=1080`;
      const oembedRes = await fetch(oembedUrl, {
        headers: { "User-Agent": IG_BOT_UA },
      });

      if (oembedRes.ok) {
        const data = await oembedRes.json();
        const thumbnailUrl = data?.thumbnail_url as string | undefined;
        if (thumbnailUrl) {
          imgRes = await tryFetchImage(thumbnailUrl);
        }
      }
    }

    // Attempt 3: og:image fallback
    if (!imgRes) {
      const pageRes = await fetch(rawPostUrl, {
        headers: { "User-Agent": IG_BOT_UA },
        redirect: "follow",
      });
      const html = await pageRes.text();
      const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
      const ogImage = ogMatch?.[1];
      if (ogImage) {
        imgRes = await tryFetchImage(ogImage);
      }
    }

    if (!imgRes) {
      return new Response("Image fetch failed", { status: 502, headers: corsHeaders });
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const imageData = await imgRes.arrayBuffer();

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
