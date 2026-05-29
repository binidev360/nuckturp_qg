/**
 * optimize-images – Edge Function para otimização em lote de imagens do blog
 *
 * Converte PNG/JPEG → WebP com qualidade 92% e redimensiona conforme contexto.
 * Processa UMA imagem por chamada para controle granular e logging.
 *
 * Actions:
 *   list    → retorna todas as imagens convertíveis no bucket blog-assets
 *   process → converte uma imagem (path obrigatório)
 *   stats   → retorna estatísticas de storage
 *
 * Apenas admins podem executar.
 *
 * Timeouts:
 *   - Supabase Transform: 15s
 *   - weserv.nl: 40s
 *   - Imagens > 25MB são puladas automaticamente
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "blog-assets";

/** Limite máximo de tamanho de imagem para processar (25MB) */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Timeout para Supabase Image Transform (15s) */
const TRANSFORM_TIMEOUT_MS = 15_000;

/** Timeout para weserv.nl (40s) */
const WESERV_TIMEOUT_MS = 40_000;

/** Dimensões máximas por pasta */
const DIMS: Record<string, { w: number; h: number }> = {
  covers: { w: 2400, h: 1260 },
  content: { w: 1800, h: 1200 },
  "blog-custom": { w: 3000, h: 1000 },
};

/** Retorna as dimensões máximas para um dado path */
function getDims(path: string): { w: number; h: number } {
  for (const [prefix, size] of Object.entries(DIMS)) {
    if (path.startsWith(prefix)) return size;
  }
  return { w: 1800, h: 1200 };
}

/** Troca a extensão do path para .webp */
function toWebp(p: string): string {
  return p.replace(/\.(png|jpe?g|bmp|tiff?)$/i, ".webp");
}

/** Verifica se o arquivo é convertível (não é webp/gif) */
function canConvert(name: string): boolean {
  return /\.(png|jpe?g|bmp|tiff?)$/i.test(name);
}

/** Helper para resposta JSON */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Fetch com AbortController timeout */
async function fetchWithTimeout(url: string, opts: RequestInit & { timeout: number }): Promise<Response> {
  const { timeout, ...fetchOpts } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { ...fetchOpts, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

// ── Handler principal ───────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = createClient(SB_URL, SRK);

  try {
    // ── Auth: verificar admin ─────────────────────────────────────
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing authorization header" }, 401);

    const { data: { user }, error: authErr } = await sb.auth.getUser(jwt);
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const { data: roleData } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return json({ error: "Admin access required" }, 403);

    // ── Roteamento ────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    switch (action) {
      case "list":
        return await actionList(sb);
      case "process":
        return await actionProcess(sb, body.path);
      case "stats": {
        const { data } = await sb.rpc("admin_storage_stats");
        return json(data);
      }
      default:
        return json({ error: "action deve ser: list | process | stats" }, 400);
    }
  } catch (err) {
    // Detectar AbortError (timeout) vs erro genérico
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    console.error("[optimize-images] Erro geral:", isTimeout ? "Timeout na operação" : err);
    return json({
      error: isTimeout
        ? "Timeout: imagem muito grande ou serviço lento. Tente novamente."
        : "Erro interno ao processar imagem",
    }, isTimeout ? 504 : 500);
  }
});

// ── Tipos ───────────────────────────────────────────────────────────
interface FileInfo {
  path: string;
  size: number;
  size_mb: string;
  mimetype: string;
}

// ── LIST: listar todos os arquivos convertíveis ─────────────────────
async function actionList(sb: ReturnType<typeof createClient>) {
  const files: FileInfo[] = [];

  // Pastas de nível superior
  for (const folder of ["covers", "content"]) {
    await collectFiles(sb, folder, files);
  }

  // blog-custom tem subpastas por user_id
  const { data: customItems } = await sb.storage
    .from(BUCKET)
    .list("blog-custom", { limit: 500 });

  for (const item of customItems ?? []) {
    // Subpastas não possuem metadata.size
    if (!item.metadata?.size) {
      await collectFiles(sb, `blog-custom/${item.name}`, files);
    } else if (canConvert(item.name)) {
      files.push({
        path: `blog-custom/${item.name}`,
        size: item.metadata.size,
        size_mb: (item.metadata.size / 1048576).toFixed(2),
        mimetype: item.metadata.mimetype ?? "",
      });
    }
  }

  // Ordenar do maior para o menor
  files.sort((a, b) => b.size - a.size);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  return json({
    total: files.length,
    total_size_mb: (totalBytes / 1048576).toFixed(2),
    files,
  });
}

/** Lista arquivos de uma pasta com paginação */
async function collectFiles(
  sb: ReturnType<typeof createClient>,
  folder: string,
  out: FileInfo[],
) {
  let offset = 0;
  const PAGE = 500;

  while (true) {
    const { data, error } = await sb.storage.from(BUCKET).list(folder, {
      limit: PAGE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      console.error(`[optimize-images] Erro listando ${folder}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const item of data) {
      if (canConvert(item.name) && item.metadata?.size) {
        out.push({
          path: `${folder}/${item.name}`,
          size: item.metadata.size,
          size_mb: (item.metadata.size / 1048576).toFixed(2),
          mimetype: item.metadata.mimetype ?? "",
        });
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }
}

// ── PROCESS: converter uma única imagem ─────────────────────────────
async function actionProcess(sb: ReturnType<typeof createClient>, path?: string) {
  if (!path) return json({ error: "Parâmetro 'path' obrigatório" }, 400);

  const t0 = Date.now();

  // Skip se já é webp ou gif
  if (/\.(webp|gif)$/i.test(path)) {
    return json({ status: "skipped", path, reason: "Já é WebP ou GIF" });
  }

  // 1) Download do arquivo original
  console.log(`[optimize-images] Processando: ${path}`);
  const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(path);
  if (dlErr || !blob) {
    return json({ status: "error", path, step: "download", error: dlErr?.message ?? "Blob vazio" });
  }
  const origSize = blob.size;

  // Guard: pular imagens muito grandes para evitar timeout
  if (origSize > MAX_FILE_SIZE) {
    console.log(`[optimize-images] ⚠️ Imagem muito grande (${(origSize / 1048576).toFixed(1)}MB), pulando: ${path}`);
    return json({
      status: "skipped",
      path,
      reason: `Imagem muito grande (${(origSize / 1048576).toFixed(1)}MB). Limite: ${(MAX_FILE_SIZE / 1048576).toFixed(0)}MB`,
      original_kb: +(origSize / 1024).toFixed(1),
    });
  }

  // 2) Converter para WebP via serviço externo
  const d = getDims(path);
  const pubUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;

  let webpBlob: Blob | null = null;
  let method = "";

  // Tentativa A: Supabase Image Transform (disponível em planos Pro+)
  try {
    const transformUrl =
      `${SB_URL}/storage/v1/render/image/public/${BUCKET}/${path}` +
      `?width=${d.w}&height=${d.h}&resize=contain&format=webp&quality=92`;

    const resp = await fetchWithTimeout(transformUrl, {
      headers: { Authorization: `Bearer ${SRK}` },
      timeout: TRANSFORM_TIMEOUT_MS,
    });

    if (resp.ok && (resp.headers.get("content-type") ?? "").includes("webp")) {
      webpBlob = await resp.blob();
      method = "supabase-transform";
      console.log(`[optimize-images] Supabase transform OK para ${path}`);
    } else {
      await resp.text(); // consumir body
      console.log(`[optimize-images] Supabase transform indisponível (${resp.status}), tentando weserv.nl`);
    }
  } catch (_e) {
    const isTimeout = _e instanceof DOMException && _e.name === "AbortError";
    console.log(`[optimize-images] Supabase transform ${isTimeout ? "timeout" : "erro"}, tentando weserv.nl`);
  }

  // Tentativa B: weserv.nl (proxy de imagem gratuito com suporte WebP)
  if (!webpBlob) {
    try {
      const weservUrl =
        `https://images.weserv.nl/?url=${encodeURIComponent(pubUrl)}` +
        `&w=${d.w}&h=${d.h}&fit=inside&output=webp&q=92&n=-1`;

      const resp = await fetchWithTimeout(weservUrl, {
        timeout: WESERV_TIMEOUT_MS,
      });

      if (resp.ok) {
        webpBlob = await resp.blob();
        method = "weserv.nl";
        console.log(`[optimize-images] weserv.nl OK para ${path}`);
      } else {
        await resp.text(); // consumir body
        return json({
          status: "error",
          path,
          step: "convert",
          error: `Serviço de conversão retornou erro (${resp.status})`,
        });
      }
    } catch (_e) {
      const isTimeout = _e instanceof DOMException && _e.name === "AbortError";
      return json({
        status: "error",
        path,
        step: "convert",
        error: isTimeout
          ? `Timeout na conversão (${WESERV_TIMEOUT_MS / 1000}s). Imagem muito grande ou serviço lento.`
          : "Erro na conexão com serviço de conversão",
      });
    }
  }

  if (!webpBlob || webpBlob.size === 0) {
    return json({ status: "error", path, step: "convert", error: "Resultado vazio" });
  }

  // Se o arquivo convertido é maior que o original, pular
  if (webpBlob.size >= origSize) {
    return json({
      status: "skipped",
      path,
      reason: "Arquivo convertido não é menor que o original",
      original_kb: +(origSize / 1024).toFixed(1),
      converted_kb: +(webpBlob.size / 1024).toFixed(1),
    });
  }

  // 3) Upload do arquivo WebP
  const wp = toWebp(path);
  const { error: upErr } = await sb.storage.from(BUCKET).upload(wp, webpBlob, {
    contentType: "image/webp",
    upsert: true,
  });

  if (upErr) {
    console.error(`[optimize-images] ❌ Upload falhou para ${wp}:`, upErr.message);
    return json({ status: "error", path, step: "upload", error: "Erro ao fazer upload do arquivo convertido" });
  }

  // 4) VERIFICAÇÃO PÓS-UPLOAD — Confirmar que o WebP existe e tem tamanho válido
  //    Isso previne perda de dados: só deletamos o original após esta confirmação.
  let verified = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data: checkBlob, error: checkErr } = await sb.storage.from(BUCKET).download(wp);
      if (!checkErr && checkBlob && checkBlob.size > 0) {
        verified = true;
        console.log(`[optimize-images] ✅ Verificação OK para ${wp} (${(checkBlob.size / 1024).toFixed(0)}KB, tentativa ${attempt + 1})`);
        break;
      }
    } catch (_e) {
      // Retry
    }
    // Esperar 1s antes de tentar novamente
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!verified) {
    // ROLLBACK: remover o WebP potencialmente corrompido, manter o original intacto
    console.error(`[optimize-images] ❌ Verificação FALHOU para ${wp} — mantendo original ${path}`);
    try {
      await sb.storage.from(BUCKET).remove([wp]);
    } catch (_e) {
      // Ignorar erro de limpeza
    }
    return json({
      status: "error",
      path,
      step: "verify",
      error: "Upload realizado mas verificação falhou. Original mantido intacto.",
    });
  }

  // 5) Atualizar referências no banco de dados (só após verificação)
  const oldUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  const newUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${wp}`;
  const dbLog: string[] = [];

  // Campos diretos em várias tabelas
  const fieldsToUpdate: Array<[string, string]> = [
    ["posts", "cover_url"],
    ["posts", "og_image_url"],
    ["blog_authors", "blog_banner_url"],
    ["blog_authors", "blog_bg_image_url"],
    ["blog_authors", "avatar_url"],
  ];

  for (const [table, col] of fieldsToUpdate) {
    try {
      const { data } = await sb
        .from(table)
        .update({ [col]: newUrl } as any)
        .eq(col as any, oldUrl)
        .select("id");

      if (data?.length) {
        dbLog.push(`${table}.${col}: ${data.length} registro(s)`);
      }
    } catch (_e) {
      // Ignorar erros de tabelas/colunas que não existem
    }
  }

  // Substituição no HTML do conteúdo dos posts via RPC
  try {
    const { data: affected } = await sb.rpc("admin_replace_content_url", {
      _old_url: oldUrl,
      _new_url: newUrl,
    });
    if (affected && affected > 0) {
      dbLog.push(`posts.content: ${affected} registro(s)`);
    }
  } catch (_e) {
    dbLog.push("posts.content: erro no RPC (verificar função)");
  }

  // 6) Deletar arquivo original — SOMENTE após upload verificado + DB atualizado
  const { error: rmErr } = await sb.storage.from(BUCKET).remove([path]);
  if (rmErr) {
    // Não é crítico — ambos os arquivos existem, DB já aponta para o novo
    console.warn(`[optimize-images] ⚠️ Original não deletado (${path}): ${rmErr.message}`);
    dbLog.push(`original: não deletado (${rmErr.message})`);
  }

  const elapsed = Date.now() - t0;

  console.log(
    `[optimize-images] ✅ ${path} → ${wp} | ` +
    `${(origSize / 1024).toFixed(0)}KB → ${(webpBlob.size / 1024).toFixed(0)}KB | ` +
    `${((1 - webpBlob.size / origSize) * 100).toFixed(0)}% menor | ${elapsed}ms`
  );

  return json({
    status: "success",
    path,
    webp_path: wp,
    method,
    original_kb: +(origSize / 1024).toFixed(1),
    webp_kb: +(webpBlob.size / 1024).toFixed(1),
    savings: ((1 - webpBlob.size / origSize) * 100).toFixed(1) + "%",
    db_updates: dbLog,
    old_deleted: !rmErr,
    verified: true,
    elapsed_ms: elapsed,
  });
}
