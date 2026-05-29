/**
 * apply-link-corrections — Edge Function (Onda 3)
 * 
 * Aplica correções de links em posts do blog, substituindo apenas
 * o atributo href das tags <a>, sem alterar texto visível.
 * 
 * Parâmetros (POST body):
 *   - post_ids: string[]   — IDs dos posts a corrigir (obrigatório)
 *   - max_posts: number    — limite por execução (default: 5)
 *   - dry_run: boolean     — se true, retorna preview sem aplicar (default: false)
 * 
 * Retorna: { corrected: number, results: CorrectionResult[] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Bug #3 fix: CORS headers completos para compatibilidade com Lovable/Supabase client
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Tipos ───────────────────────────────────────────────────────────
interface CorrectionResult {
  post_id: string;
  post_title: string;
  corrections: Array<{
    original_url: string;
    new_url: string;
  }>;
  applied: boolean;
  error?: string;
}

// ─── Handler principal ──────────────────────────────────────────────
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Auth: apenas admins ───────────────────────────────────────
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

    // Valida sessão via getClaims (compatível com signing-keys)
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Verifica admin via user_roles (consistente com is_admin() DB function)
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
      max_posts = 5,
      dry_run = false,
    } = body as {
      post_ids?: string[];
      max_posts?: number;
      dry_run?: boolean;
    };

    if (!Array.isArray(post_ids) || post_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "post_ids é obrigatório (array de UUIDs)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limita quantidade de posts por execução
    const limitedIds = post_ids.slice(0, Math.min(max_posts, 20));

    // ─── Busca análises com status "mapped" (correções pendentes) ─
    const { data: analyses, error: analysesErr } = await supabaseAdmin
      .from("link_analysis_results")
      .select("post_id, original_url, suggested_url")
      .in("post_id", limitedIds)
      .eq("status", "mapped")
      .not("suggested_url", "is", null);

    if (analysesErr) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar análises", detail: analysesErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!analyses || analyses.length === 0) {
      return new Response(
        JSON.stringify({ corrected: 0, message: "Nenhuma correção pendente encontrada", results: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Agrupa correções por post_id ────────────────────────────
    const correctionsByPost = new Map<string, Array<{ original_url: string; suggested_url: string }>>();
    for (const a of analyses) {
      if (!a.suggested_url) continue;
      const list = correctionsByPost.get(a.post_id) || [];
      list.push({ original_url: a.original_url, suggested_url: a.suggested_url });
      correctionsByPost.set(a.post_id, list);
    }

    // ─── Busca posts que precisam de correção ────────────────────
    const postIds = Array.from(correctionsByPost.keys());
    const { data: posts, error: postsErr } = await supabaseAdmin
      .from("posts")
      .select("id, content, title, slug")
      .in("id", postIds);

    if (postsErr || !posts) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar posts", detail: postsErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: CorrectionResult[] = [];

    for (const post of posts) {
      const corrections = correctionsByPost.get(post.id);
      if (!corrections || corrections.length === 0 || !post.content) {
        continue;
      }

      const result: CorrectionResult = {
        post_id: post.id,
        post_title: post.title,
        corrections: [],
        applied: false,
      };

      // ─── Aplica substituições no conteúdo ────────────────────
      let updatedContent = post.content;

      for (const corr of corrections) {
        // Substituição segura: troca apenas href="original" por href="suggested"
        // Usa regex para garantir que só altera dentro de atributos href
        const escapedOriginal = corr.original_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const hrefRegex = new RegExp(
          `(href\\s*=\\s*["'])${escapedOriginal}(["'])`,
          "gi"
        );

        const before = updatedContent;
        updatedContent = updatedContent.replace(hrefRegex, `$1${corr.suggested_url}$2`);

        // Só registra se houve mudança real
        if (updatedContent !== before) {
          result.corrections.push({
            original_url: corr.original_url,
            new_url: corr.suggested_url,
          });
        }
      }

      // Se não houve mudanças efetivas, pula
      if (result.corrections.length === 0) {
        continue;
      }

      // ─── Modo dry_run: apenas retorna preview ────────────────
      if (dry_run) {
        result.applied = false;
        results.push(result);
        continue;
      }

      // ─── Aplica correção no banco ────────────────────────────
      try {
        // 1. Salva backup + log na tabela link_corrections_log
        await supabaseAdmin.from("link_corrections_log").insert({
          post_id: post.id,
          applied_by: userId,
          content_backup: post.content,
          corrections_applied: result.corrections,
        });

        // 2. Atualiza o conteúdo do post
        const { error: updateErr } = await supabaseAdmin
          .from("posts")
          .update({ content: updatedContent, updated_at: new Date().toISOString() })
          .eq("id", post.id);

        if (updateErr) {
          result.error = updateErr.message;
          result.applied = false;
        } else {
          result.applied = true;

          // 3. Atualiza status das análises para "ok"
          for (const corr of result.corrections) {
            await supabaseAdmin
              .from("link_analysis_results")
              .update({ status: "ok", suggested_url: null })
              .eq("post_id", post.id)
              .eq("original_url", corr.original_url);
          }
        }
      } catch (_e) {
        result.error = "Erro inesperado ao salvar correção";
        result.applied = false;
      }

      results.push(result);
    }

    // ─── Resposta ────────────────────────────────────────────────
    const correctedCount = results.filter((r) => r.applied).length;

    return new Response(
      JSON.stringify({
        dry_run,
        corrected: correctedCount,
        total_corrections: results.reduce((sum, r) => sum + r.corrections.length, 0),
        results,
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
