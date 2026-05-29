import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withMetrics } from "../_shared/withMetrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(withMetrics("generate-adventure", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check - require authenticated user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    // Get user from token (gateway already verified JWT)
    const token = req.headers.get("Authorization")!.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { mode } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ─── Mode: check if AI knows the game system ───
    if (mode === "check-system") {
      const { gameSystem } = body;
      if (!gameSystem?.trim()) {
        return new Response(JSON.stringify({ known: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const checkResp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "Você é um especialista em RPG de mesa. Responda APENAS com JSON: {\"known\": true} se conhecer o sistema de RPG informado, ou {\"known\": false} se não conhecer. Considere sistemas populares e obscuros. Só responda false se realmente não existir ou for algo inventado/irreconhecível.",
            },
            { role: "user", content: `O sistema de RPG é: "${gameSystem}"` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "check_system",
                description: "Return whether the RPG system is known.",
                parameters: {
                  type: "object",
                  properties: {
                    known: { type: "boolean" },
                  },
                  required: ["known"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "check_system" } },
        }),
      });

      if (!checkResp.ok) {
        console.error("check-system error:", checkResp.status);
        // Default to known=true to not block user
        return new Response(JSON.stringify({ known: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const checkData = await checkResp.json();
      try {
        const toolCall = checkData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          const args = JSON.parse(toolCall.function.arguments);
          return new Response(JSON.stringify({ known: !!args.known }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {
        // fallback
      }
      return new Response(JSON.stringify({ known: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Mode: generate adventure (default) ───
    const { diceResults, gameSystem, pillars, additionalInfo, systemDescription } = body;

    const diceContext = diceResults
      ? Object.entries(diceResults)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join("\n")
      : "Nenhum resultado de dado fornecido.";

    const pillarsText = pillars?.length
      ? pillars.join(", ")
      : "Não especificado";

    const systemBlock = systemDescription
      ? `- Sistema de jogo: ${gameSystem || "Personalizado"}\n- Descrição do sistema (fornecida pelo usuário): ${systemDescription}`
      : `- Sistema de jogo: ${gameSystem || "Não especificado"}`;

    const systemPrompt = `Você é um mestre de RPG experiente e criativo. Sua tarefa é criar uma sinopse envolvente de aventura de RPG de mesa com base nos resultados dos dados do Gerador de Aventuras Nuckturp e nas informações adicionais fornecidas pelo usuário.

REGRAS:
- Escreva em português brasileiro.
- COMECE SEMPRE com um título criativo, chamativo e inspirador para a aventura, formatado como "# Título da Aventura". O título deve ser evocativo, curto (3-8 palavras) e gerar curiosidade.
- REGRA DE CAPITALIZAÇÃO (OBRIGATÓRIA): Use SEMPRE caixa de frase (sentence case) em português. Apenas a primeira letra da frase e nomes próprios são maiúsculas. NUNCA use Title Case (capitalizar cada palavra). Exemplos corretos: "# A sombra sobre as terras perdidas", "# O último bastião de Korth". Exemplos ERRADOS: "# A Sombra Sobre As Terras Perdidas". Siglas (RPG, NPC, D&D) e nomes próprios mantêm suas maiúsculas naturais.
- Crie uma narrativa coesa que conecte TODOS os elementos dos dados rolados.
- Adapte o tom, vocabulário e mecânicas ao sistema de jogo informado.
- Dê ênfase aos pilares de jogo escolhidos pelo usuário (${pillarsText}).
- A sinopse deve ter entre 3 e 5 parágrafos (SEM contar o título).
- Inclua: gancho inicial, desenvolvimento do conflito, possíveis reviravoltas e sugestão de clímax.
- Dê nomes criativos a NPCs e locais quando apropriado.
- NÃO liste os elementos separadamente; integre-os organicamente na narrativa.
- Use **negrito** para nomes de NPCs, locais importantes e itens-chave.
- Use *itálico* para falas, pensamentos ou termos especiais do sistema.
- Termine com uma frase de efeito que motive os jogadores.`;

    const userPrompt = `## Resultados dos Dados (Gerador de Aventuras Nuckturp)
${diceContext}

## Informações do Usuário
${systemBlock}
- Pilares desejados: ${pillarsText}
- Informações adicionais: ${additionalInfo || "Nenhuma informação adicional."}

Com base em todos esses elementos, crie uma sinopse de aventura envolvente e detalhada.`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar aventura. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log AI usage (fire-and-forget)
    supabaseClient.from("ai_usage_logs").insert({
      user_id: user.id,
      feature: mode === "check-system" ? "check_system" : "adventure_generator",
      model: "google/gemini-3-flash-preview",
    }).then(() => {}).catch(() => {});

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-adventure error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
