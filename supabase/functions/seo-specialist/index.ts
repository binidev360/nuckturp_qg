/**
 * seo-specialist — Edge Function para análise e sugestão de metadados SEO de posts.
 *
 * Recebe dados do post (título, conteúdo, slug, excerpt, tags, categorias, SEO fields)
 * e retorna sugestões estruturadas via Tool Calling (Lovable AI Gateway).
 *
 * Modos:
 *  - "suggest": campos vazios → preenche com sugestões
 *  - "review":  campos preenchidos → aponta melhorias
 *
 * Regras:
 *  - Nunca comenta o conteúdo criativo do autor
 *  - Pode alertar se o título do post for longo (>60 chars)
 *  - Sugere categorias existentes; se não houver, sugere criação
 *  - Gera 5 tags relevantes
 *  - Palavras-chave são palavras/conceitos (ex: "mestre de rpg", "Dungeons & Dragons")
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── System Prompt baseado no .agent/agents/seo-specialist.md ────────────────
const SYSTEM_PROMPT = `Você é o Especialista de SEO da plataforma Nuckturp — um blog sobre RPG de mesa, mestres de RPG, campanhas, sessões e cultura geek/nerd.

## Sua função
Você analisa posts do blog e sugere/melhora metadados de SEO para maximizar visibilidade em buscadores (Google) e motores de IA (ChatGPT, Claude, Perplexity).

## Filosofia
"Conteúdo para humanos, estruturado para máquinas. Conquiste o Google e o ChatGPT."

## Princípios E-E-A-T
- Experience: conhecimento de primeira mão
- Expertise: credenciais e domínio do assunto
- Authoritativeness: reconhecimento e menções
- Trustworthiness: transparência e confiabilidade

## Regras ABSOLUTAS
1. NUNCA comente, critique ou elogie o conteúdo criativo do autor. Você NÃO fala sobre o texto em si.
2. A ÚNICA exceção: se o título do post tiver mais de 60 caracteres, você pode alertar que está longo para SEO.
3. Foque EXCLUSIVAMENTE na otimização técnica de SEO dos metadados.
4. Fale em português brasileiro, tom profissional mas acessível.
5. Palavras-chave devem ser palavras ou conceitos (ex: "mestre de rpg", "Dungeons & Dragons", "dados de RPG"), não frases longas.
6. A meta descrição deve ter no máximo 160 caracteres, ser atraente e incluir a palavra-chave principal.
7. O título SEO deve ser atraente para busca, com no máximo 60 caracteres.
8. Sugira exatamente 5 tags relevantes para o post.
9. O excerpt/resumo deve ser atraente, manter o tom de voz do autor, e ter entre 1-3 frases curtas.
10. O slug deve ser curto, descritivo e amigável para URL (sem acentos, sem caracteres especiais).
11. Sugira de 1 a 3 categorias existentes que combinem. Se nenhuma existente for adequada, sugira criação de nova categoria.
12. REGRA DE CAPITALIZAÇÃO (OBRIGATÓRIA): Use SEMPRE caixa de frase (sentence case) em português. Apenas a primeira letra da frase e nomes próprios são maiúsculas. NUNCA use Title Case (capitalizar cada palavra). Exemplos corretos: "Dicionário de RPG: um guia para iniciantes", "Como preparar sua primeira sessão", "O que todo mestre precisa saber sobre D&D". Exemplos ERRADOS: "Dicionário De RPG: Um Guia Para Iniciantes", "Como Preparar Sua Primeira Sessão". Siglas (RPG, NPC, D&D) e nomes próprios (Dungeons & Dragons, Tormenta) mantêm suas maiúsculas naturais.

## Sobre GEO (Generative Engine Optimization)
Otimize para que motores de IA citem o conteúdo:
- Definições claras e extraíveis
- Dados e estatísticas com fontes
- Estruturas do tipo FAQ
- Guias passo a passo

## Contexto do site
- Nicho: RPG de mesa, mestres de RPG, campanhas, sessões, ferramentas, dicas
- URL base: https://nuckturp.com.br
- Público: mestres de RPG, jogadores, entusiastas de RPG de mesa no Brasil`;

// ─── Tool definition para structured output ─────────────────────────────────
const SEO_TOOL = {
  type: "function" as const,
  function: {
    name: "seo_analysis",
    description:
      "Retorna a análise completa de SEO com sugestões e revisões para os metadados do post.",
    parameters: {
      type: "object",
      properties: {
        seo_title: {
          type: "string",
          description: "Título SEO otimizado (máx 60 caracteres). Atraente para busca.",
        },
        seo_description: {
          type: "string",
          description:
            "Meta descrição otimizada (máx 160 caracteres). Inclui palavra-chave principal, atraente para clique.",
        },
        seo_keywords: {
          type: "array",
          items: { type: "string" },
          description:
            "Lista de palavras-chave SEO. Cada item é uma palavra ou conceito curto (ex: 'mestre de rpg', 'Dungeons & Dragons').",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Exatamente 5 tags relevantes para o post.",
        },
        category_ids: {
          type: "array",
          items: { type: "string" },
          description:
            "IDs das categorias existentes sugeridas (1-3). Use APENAS IDs da lista fornecida.",
        },
        suggested_new_categories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nome da nova categoria sugerida" },
              slug: { type: "string", description: "Slug da nova categoria" },
            },
            required: ["name", "slug"],
          },
          description:
            "Novas categorias sugeridas APENAS se nenhuma existente for adequada. Normalmente vazio.",
        },
        slug: {
          type: "string",
          description:
            "Slug otimizado para URL. Curto, descritivo, sem acentos, sem caracteres especiais. Usar hífens.",
        },
        excerpt: {
          type: "string",
          description:
            "Resumo/excerpt atraente do post (1-3 frases). Mantém o tom de voz do autor.",
        },
        title_warning: {
          type: "string",
          description:
            "Alerta sobre o título do post se tiver mais de 60 caracteres. Vazio se estiver ok.",
        },
        review_notes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: {
                type: "string",
                enum: [
                  "seo_title",
                  "seo_description",
                  "seo_keywords",
                  "tags",
                  "category_ids",
                  "slug",
                  "excerpt",
                ],
              },
              current_issue: {
                type: "string",
                description: "Problema identificado no valor atual",
              },
              suggestion: {
                type: "string",
                description: "Sugestão de melhoria",
              },
            },
            required: ["field", "current_issue", "suggestion"],
          },
          description:
            "Notas de revisão para campos que já têm conteúdo mas podem ser melhorados. Vazio se tudo está ótimo.",
        },
      },
      required: [
        "seo_title",
        "seo_description",
        "seo_keywords",
        "tags",
        "category_ids",
        "suggested_new_categories",
        "slug",
        "excerpt",
        "title_warning",
        "review_notes",
      ],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Autenticação ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Usa getUser() em vez de getClaims() para autenticação confiável
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;

    // ─── Parse body ────────────────────────────────────────────────
    const body = await req.json();
    const {
      title,
      content,
      slug,
      excerpt,
      tags,
      category_ids,
      seo_title,
      seo_description,
      seo_keywords,
      categories, // lista de categorias existentes [{id, name, slug}]
      content_hash, // hash do conteúdo para cache
      post_id, // id do post para histórico
    } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Cache: verificar se já existe análise para este hash ──────
    if (content_hash && post_id) {
      const { data: cached } = await supabase
        .from("seo_analysis_history")
        .select("suggestions, mode, score_before, score_after")
        .eq("content_hash", content_hash)
        .eq("post_id", post_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cached?.suggestions) {
        console.log("SEO cache hit for hash:", content_hash);
        return new Response(
          JSON.stringify({
            mode: cached.mode,
            suggestions: cached.suggestions,
            cached: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ─── Construir prompt do usuário ───────────────────────────────
    // Strip HTML do conteúdo para reduzir tokens
    const plainContent = (content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000); // Limitar tamanho

    const categoriesList = (categories || [])
      .map((c: { id: string; name: string; slug: string }) => `- ${c.name} (id: ${c.id}, slug: ${c.slug})`)
      .join("\n");

    const hasExistingSeo =
      seo_title || seo_description || (seo_keywords && seo_keywords.length > 0);
    const mode = hasExistingSeo ? "review" : "suggest";

    const userPrompt = `## Modo: ${mode === "review" ? "REVISÃO (campos já preenchidos — aponte melhorias)" : "SUGESTÃO (campos vazios — preencha)"}

## Dados do Post
- **Título**: ${title}
- **Slug atual**: ${slug || "(vazio)"}
- **Excerpt atual**: ${excerpt || "(vazio)"}
- **Tags atuais**: ${tags && tags.length > 0 ? tags.join(", ") : "(vazio)"}
- **Categorias atuais (IDs)**: ${category_ids && category_ids.length > 0 ? category_ids.join(", ") : "(vazio)"}

## SEO Atual
- **Título SEO**: ${seo_title || "(vazio)"}
- **Descrição SEO**: ${seo_description || "(vazio)"}
- **Palavras-chave SEO**: ${seo_keywords && seo_keywords.length > 0 ? seo_keywords.join(", ") : "(vazio)"}

## Categorias Disponíveis no Site
${categoriesList || "(nenhuma categoria cadastrada)"}

## Conteúdo do Post (texto limpo, primeiros 8000 chars)
${plainContent || "(conteúdo vazio)"}

---
Analise o post e retorne as sugestões/revisões usando a função seo_analysis.`;

    // ─── Chamar Lovable AI Gateway ─────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log de uso será registrado APÓS sucesso da IA (evita contagem prematura)

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          tools: [SEO_TOOL],
          tool_choice: {
            type: "function",
            function: { name: "seo_analysis" },
          },
        }),
      }
    );

    // ─── Tratamento de erros do gateway ────────────────────────────
    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "rate_limit",
            message:
              "O Especialista está ocupado no momento. Tente novamente em alguns segundos.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "credits_exhausted",
            message:
              "Créditos de IA esgotados. Entre em contato com o administrador.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "ai_error", message: "Erro ao consultar o Especialista." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ─── Parsear resposta do Tool Calling ───────────────────────────
    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function?.name !== "seo_analysis") {
      console.error("Unexpected AI response structure:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({
          error: "parse_error",
          message: "Resposta inesperada do Especialista. Tente novamente.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;
    try {
      result =
        typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
    } catch (_e) {
      console.error("Failed to parse tool arguments:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({
          error: "parse_error",
          message: "Erro ao processar sugestões. Tente novamente.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ─── Log de uso de IA (somente após sucesso) ─────────────────
    await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      feature: "seo_specialist",
      model: "google/gemini-3-flash-preview",
    });

    // ─── Salvar no histórico de análises SEO (cache + histórico) ──
    if (post_id && content_hash) {
      await supabase.from("seo_analysis_history").insert({
        post_id,
        user_id: userId,
        content_hash,
        mode,
        score_before: body.score_before || 0,
        score_after: body.score_after || 0,
        suggestions: result,
      });
    }

    // ─── Retornar resultado ────────────────────────────────────────
    return new Response(
      JSON.stringify({
        mode,
        suggestions: result,
        cached: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("seo-specialist error:", e);
    return new Response(
      JSON.stringify({
        error: "internal_error",
        message: e instanceof Error ? e.message : "Erro interno",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
