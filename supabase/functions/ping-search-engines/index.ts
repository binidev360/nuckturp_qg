/**
 * ping-search-engines
 * ───────────────────
 * Notifica Google e Bing que o sitemap foi atualizado ou que URLs
 * específicas foram publicadas/alteradas.
 *
 * Chamado automaticamente pelo process-scheduled-posts e pode ser
 * invocado manualmente pelo admin.
 *
 * Body (JSON):
 *   { "urls": ["/novidades/meu-post"] }     — pinga URLs específicas (IndexNow)
 *   { "sitemap": true }                      — pinga o sitemap completo
 *   {} ou sem body                           — pinga o sitemap completo
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://nuckturp.com.br";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

/**
 * Ping Google e Bing via endpoint de sitemap (método clássico)
 * Google descontinuou o ping em 2023, mas mantemos para compatibilidade.
 * Bing ainda suporta.
 */
async function pingSitemap(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  // Google Ping (legacy, may be ignored but harmless)
  try {
    const googleRes = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
    );
    results.google = `${googleRes.status} ${googleRes.statusText}`;
  } catch (err) {
    results.google = `error: ${(err as Error).message}`;
  }

  // Bing Ping (still supported)
  try {
    const bingRes = await fetch(
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
    );
    results.bing = `${bingRes.status} ${bingRes.statusText}`;
  } catch (err) {
    results.bing = `error: ${(err as Error).message}`;
  }

  return results;
}

/**
 * IndexNow — notificação instantânea de URLs para Bing, Yandex, Seznam, Naver
 * Usa a API IndexNow com uma chave estática hospedada em /indexnow-key.txt
 */
async function pingIndexNow(urls: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  // A chave IndexNow — será servida em /indexnow-key.txt
  const indexNowKey = "nuckturp2026indexnow";

  const absoluteUrls = urls.map(u =>
    u.startsWith("http") ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`
  );

  const body = JSON.stringify({
    host: "nuckturp.com.br",
    key: indexNowKey,
    keyLocation: `${SITE_URL}/${indexNowKey}.txt`,
    urlList: absoluteUrls,
  });

  // IndexNow endpoints (Bing e Yandex)
  const endpoints = [
    { name: "bing_indexnow", url: "https://www.bing.com/indexnow" },
    { name: "yandex_indexnow", url: "https://yandex.com/indexnow" },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
      });
      results[ep.name] = `${res.status} ${res.statusText}`;
    } catch (err) {
      results[ep.name] = `error: ${(err as Error).message}`;
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let urls: string[] = [];
    let pingSitemapFlag = true;

    // Parse body se houver
    try {
      const body = await req.json();
      if (body.urls && Array.isArray(body.urls) && body.urls.length > 0) {
        urls = body.urls.slice(0, 100); // Limitar a 100 URLs por chamada
        pingSitemapFlag = body.sitemap !== false; // Por padrão pinga sitemap também
      }
    } catch {
      // Sem body = apenas ping de sitemap
    }

    const results: Record<string, unknown> = {};

    // 1. Ping sitemap (Google + Bing clássico)
    if (pingSitemapFlag) {
      results.sitemap_ping = await pingSitemap();
    }

    // 2. IndexNow para URLs específicas
    if (urls.length > 0) {
      results.indexnow = await pingIndexNow(urls);
      results.urls_submitted = urls.length;
    }

    console.log("Search engine ping results:", JSON.stringify(results));

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Ping error:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao notificar motores de busca." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
