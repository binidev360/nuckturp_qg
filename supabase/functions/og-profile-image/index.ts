/**
 * og-profile-image — Generates a dynamic 1200×630 OG image for master profiles.
 *
 * Uses an SVG-based approach to create a branded card with:
 * - Master's avatar (circular)
 * - Display name
 * - Master title / tagline
 * - Favorite systems (as tags)
 * - Nuckturp branding
 *
 * Query params:
 *   ?slug=<profile-slug>
 *
 * Returns: image/png (via SVG → PNG pipeline) or image/svg+xml as fallback
 *
 * Caching: CDN cache 24h, browser cache 1h
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const SITE_URL = "https://nuckturp.com.br";
const FALLBACK_IMAGE_URL = `${SITE_URL}/og-image.jpg`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Escape special XML chars for safe SVG embedding */
function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Truncate text to maxLen chars with ellipsis */
function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "…";
}

/** Fetch an image URL and return its base64 data URI, or null on failure */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(buf);
    // Manual base64 encoding for Deno compatibility
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    return `data:${contentType};base64,${b64}`;
  } catch (_e) {
    return null;
  }
}

/** Build the SVG card (1200×630) */
function buildSvg(opts: {
  name: string;
  masterTitle: string | null;
  tagline: string | null;
  systems: string[];
  avatarDataUri: string | null;
  initials: string;
}): string {
  const { name, masterTitle, tagline, systems, avatarDataUri, initials } = opts;

  // Colors matching the Nuckturp design system (Noir Void + Cyber Lime)
  const bgColor = "#0a0a0a";
  const primaryColor = "#a3e635"; // lime-400
  const textColor = "#fafafa";
  const mutedColor = "#a1a1aa";
  const cardBg = "#18181b";
  const borderColor = "#27272a";

  // Layout positions
  const cardX = 60;
  const cardY = 40;
  const cardW = 1080;
  const cardH = 550;
  const avatarCx = 200;
  const avatarCy = 260;
  const avatarR = 80;
  const textX = 320;

  // Display name (truncated)
  const displayName = escXml(truncate(name, 32));

  // Subtitle: master_title or tagline
  const subtitle = masterTitle || tagline || null;
  const subtitleSvg = subtitle
    ? `<text x="${textX}" y="280" font-family="'Inter', 'Segoe UI', sans-serif" font-size="26" fill="${mutedColor}" font-weight="400">${escXml(truncate(subtitle, 50))}</text>`
    : "";

  // Systems tags (max 5)
  const displaySystems = systems.slice(0, 5);
  const systemsSvg = displaySystems.length > 0
    ? displaySystems
        .map((sys, i) => {
          const tx = textX + i * 140;
          const ty = subtitle ? 340 : 310;
          return `
            <rect x="${tx}" y="${ty - 22}" width="130" height="32" rx="16" fill="${borderColor}" />
            <text x="${tx + 65}" y="${ty + 1}" font-family="'Inter', sans-serif" font-size="14" fill="${primaryColor}" text-anchor="middle" font-weight="500">${escXml(truncate(sys, 14))}</text>
          `;
        })
        .join("")
    : "";

  // Avatar: embed image or show initials
  const avatarSvg = avatarDataUri
    ? `
      <defs>
        <clipPath id="avatarClip">
          <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" />
        </clipPath>
      </defs>
      <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 3}" fill="${primaryColor}" opacity="0.6" />
      <image href="${avatarDataUri}" x="${avatarCx - avatarR}" y="${avatarCy - avatarR}" width="${avatarR * 2}" height="${avatarR * 2}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice" />
    `
    : `
      <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 3}" fill="${primaryColor}" opacity="0.6" />
      <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="${borderColor}" />
      <text x="${avatarCx}" y="${avatarCy + 14}" font-family="'Inter', sans-serif" font-size="40" fill="${primaryColor}" text-anchor="middle" font-weight="700">${escXml(initials)}</text>
    `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- Background -->
  <rect width="1200" height="630" fill="${bgColor}" />
  
  <!-- Subtle gradient overlay -->
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.05" />
      <stop offset="100%" stop-color="${bgColor}" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  
  <!-- Card -->
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="24" fill="${cardBg}" stroke="${borderColor}" stroke-width="1.5" />
  
  <!-- Avatar -->
  ${avatarSvg}
  
  <!-- Name -->
  <text x="${textX}" y="240" font-family="'Space Grotesk', 'Inter', sans-serif" font-size="42" fill="${textColor}" font-weight="700">${displayName}</text>
  
  <!-- Subtitle (master_title or tagline) -->
  ${subtitleSvg}
  
  <!-- Systems tags -->
  ${systemsSvg}
  
  <!-- Divider line -->
  <line x1="${cardX + 40}" y1="${cardH - 20}" x2="${cardX + cardW - 40}" y2="${cardH - 20}" stroke="${borderColor}" stroke-width="1" />
  
  <!-- Nuckturp branding -->
  <text x="${cardX + cardW - 40}" y="${cardH + 10}" font-family="'Space Grotesk', 'Inter', sans-serif" font-size="18" fill="${mutedColor}" text-anchor="end" font-weight="600">QG do Mestre — Nuckturp</text>
  
  <!-- Accent bar at bottom -->
  <rect x="0" y="614" width="1200" height="16" fill="${primaryColor}" opacity="0.7" />
</svg>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      // Redirect to fallback image
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: FALLBACK_IMAGE_URL },
      });
    }

    // Fetch profile from public_profiles view
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: profile, error } = await supabase
      .from("public_profiles")
      .select("display_name, nickname, avatar_url, tagline, master_title, favorite_systems")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !profile) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: FALLBACK_IMAGE_URL },
      });
    }

    const name = profile.display_name || profile.nickname || slug;
    const initials = name.slice(0, 2).toUpperCase();
    const systems = Array.isArray(profile.favorite_systems)
      ? (profile.favorite_systems as string[]).filter(Boolean)
      : [];

    // Try to fetch avatar as base64 for embedding in SVG
    let avatarDataUri: string | null = null;
    if (profile.avatar_url) {
      avatarDataUri = await fetchImageAsBase64(profile.avatar_url);
    }

    const svg = buildSvg({
      name,
      masterTitle: profile.master_title || null,
      tagline: profile.tagline || null,
      systems,
      avatarDataUri,
      initials,
    });

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        // CDN cache 24h, browser cache 1h
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("og-profile-image error:", err);
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: FALLBACK_IMAGE_URL },
    });
  }
});
