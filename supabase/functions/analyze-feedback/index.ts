import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const body = await req.json();
    const { config_id, master_overview, master_user_id } = body;

    const apiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ADMIN: Master Overview ──
    if (master_overview && master_user_id) {
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .limit(1)
        .single();
      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: membership } = await supabase
        .from("memberships")
        .select("tenant_id")
        .eq("user_id", master_user_id)
        .single();
      if (!membership) {
        return new Response(JSON.stringify({ error: "Master not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: configs } = await supabase
        .from("session_feedback_configs")
        .select("id, session_id, sessions(name, campaign_id, campaigns(name))")
        .eq("tenant_id", membership.tenant_id);

      const allResponses: any[] = [];
      for (const c of configs ?? []) {
        const { data: responses } = await supabase
          .from("session_feedback_responses")
          .select("nps_score, liked_chips, improve_chips, highlight, liked_detail, improve_detail")
          .eq("config_id", c.id);
        allResponses.push(...(responses ?? []).map(r => ({
          ...r,
          session: (c.sessions as any)?.name,
          campaign: (c.sessions as any)?.campaigns?.name,
        })));
      }

      if (allResponses.length === 0) {
        return new Response(JSON.stringify({ error: "Sem respostas para analisar" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const avgNps = allResponses.reduce((s, r) => s + r.nps_score, 0) / allResponses.length;
      const feedbackSummary = allResponses.map((r) =>
        `[${r.campaign}/${r.session}] NPS=${r.nps_score}, Gostou=[${(r.liked_chips??[]).join(",")}], Melhorar=[${(r.improve_chips??[]).join(",")}], Highlight="${r.highlight || ""}", Detalhe+="${r.liked_detail || ""}", Sugestão="${r.improve_detail || ""}"`
      ).join("\n");

      const overviewPrompt = `Você é um consultor especialista em RPG de mesa.

REGRA DE CAPITALIZAÇÃO (OBRIGATÓRIA): Use SEMPRE caixa de frase (sentence case) em português. Apenas a primeira letra da frase e nomes próprios são maiúsculas. NUNCA use Title Case. Siglas (RPG, NPC, D&D) e nomes próprios mantêm suas maiúsculas naturais.

CONTEXTO:
- Total de sessões avaliadas: ${configs?.length ?? 0}
- Total de respostas: ${allResponses.length}
- NPS médio geral: ${avgNps.toFixed(1)}/10

FEEDBACK CONSOLIDADO:
${feedbackSummary}

TAREFA:
Faça uma avaliação geral deste mestre com base em TODOS os feedbacks. Identifique:
1. Padrões recorrentes positivos (o que atrai os jogadores)
2. Padrões recorrentes negativos (o que precisa melhorar)
3. Evolução percebida ao longo das sessões
4. Sugestão de desenvolvimento prioritário

Seja direto, objetivo e construtivo. Escreva em texto corrido, como uma nota profissional de 3-5 parágrafos.`;

      const aiResponse = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: overviewPrompt }],
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI API error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "AI analysis failed" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      const { error: saveErr } = await supabase
        .from("admin_master_notes")
        .insert({
          tenant_id: membership.tenant_id,
          content,
          created_by: userId,
        });
      if (saveErr) throw saveErr;

      return new Response(JSON.stringify({ success: true, content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SESSION ANALYSIS ──
    if (!config_id) {
      return new Response(JSON.stringify({ error: "config_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch config with session, campaign, and session date
    const { data: config } = await supabase
      .from("session_feedback_configs")
      .select("*, sessions(name, summary, session_date, campaign_id, campaigns(name, system, setting, description))")
      .eq("id", config_id)
      .single();

    if (!config) {
      return new Response(JSON.stringify({ error: "Config not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!membership || membership.tenant_id !== config.tenant_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check AI usage limit (2/month for free users)
    const { data: userAdminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1)
      .single();

    const { data: subData } = await supabase.functions.invoke("check-subscription", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const isSubscribed = subData?.subscribed === true;

    if (!isSubscribed && !userAdminRole) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("feature", "feedback_analysis")
        .gte("created_at", startOfMonth.toISOString());

      if ((count ?? 0) >= 2) {
        return new Response(JSON.stringify({
          error: "Limite mensal atingido",
          message: "Você atingiu o limite de 2 análises por mês. Assine o Premium para uso ilimitado.",
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check 80% response threshold
    const { count: totalResponses } = await supabase
      .from("session_feedback_responses")
      .select("*", { count: "exact", head: true })
      .eq("config_id", config_id);

    const expectedResponses = config.expected_responses || 1;
    const responseRate = (totalResponses ?? 0) / expectedResponses;

    if (responseRate < 0.8) {
      return new Response(JSON.stringify({
        error: "Respostas insuficientes",
        message: `É necessário ter ao menos 80% das respostas (${Math.ceil(expectedResponses * 0.8)} de ${expectedResponses}).`,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // *** FIX: Query responses directly instead of using auth-dependent RPC ***
    const { data: responses } = await supabase
      .from("session_feedback_responses")
      .select("id, config_id, nps_score, liked_chips, liked_detail, improve_chips, improve_detail, highlight, custom_answers, created_at")
      .eq("config_id", config_id);

    console.log(`[analyze-feedback] Found ${(responses ?? []).length} responses for config ${config_id}`);

    const session = config.sessions as any;
    const campaign = session?.campaigns as any;

    // Fetch players and characters for this campaign
    let playerContext = "";
    if (session?.campaign_id) {
      const { data: sessionPlayers } = await supabase
        .from("session_players")
        .select("present, player_campaign_id, player_campaigns(character_name, character_class, character_species, players(name, nickname))")
        .eq("session_id", config.session_id);

      if (sessionPlayers && sessionPlayers.length > 0) {
        const playerLines = sessionPlayers.map((sp: any) => {
          const pc = sp.player_campaigns;
          const player = pc?.players;
          const playerName = player?.nickname || player?.name || "Desconhecido";
          const charName = pc?.character_name || "Sem personagem";
          const charInfo = [pc?.character_species, pc?.character_class].filter(Boolean).join(" ");
          const presence = sp.present ? "presente" : "ausente";
          return `  - ${playerName} → ${charName}${charInfo ? ` (${charInfo})` : ""} [${presence}]`;
        }).join("\n");
        playerContext = `\nJOGADORES E PERSONAGENS:\n${playerLines}\n`;
      }
    }

    // Format session date
    const sessionDateStr = session?.session_date
      ? new Date(session.session_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      : "não informada";

    const feedbackSummary = (responses ?? []).map((r: any, i: number) => {
      const customAnswers = r.custom_answers && typeof r.custom_answers === "object"
        ? Object.entries(r.custom_answers).filter(([, v]) => v && String(v).trim()).map(([q, a]) => `${q}: "${a}"`).join(", ")
        : "";
      return `Jogador ${i+1}: NPS=${r.nps_score}, Gostou=[${(r.liked_chips??[]).join(",")}], Melhorar=[${(r.improve_chips??[]).join(",")}], Highlight="${r.highlight || ""}", Detalhe positivo="${r.liked_detail || ""}", Sugestão="${r.improve_detail || ""}"${customAnswers ? `, Respostas extras: [${customAnswers}]` : ""}`;
    }).join("\n");

    const avgNps = (responses ?? []).reduce((s: number, r: any) => s + r.nps_score, 0) / ((responses ?? []).length || 1);

    const selfEvaluation = config.self_evaluation || "";
    const sessionSummary = session?.summary || "";

    const prompt = `Você é um consultor especialista em RPG de mesa, com profundo conhecimento sobre narrativa, game design, gestão de grupo e técnicas de mestrar.

REGRA DE CAPITALIZAÇÃO (OBRIGATÓRIA): Use SEMPRE caixa de frase (sentence case) em português. Apenas a primeira letra da frase e nomes próprios são maiúsculas. NUNCA use Title Case (capitalizar cada palavra). Siglas (RPG, NPC, D&D) e nomes próprios mantêm suas maiúsculas naturais.

CONTEXTO:
- Campanha: ${campaign?.name || "N/A"}
- Sistema: ${campaign?.system || "N/A"}
- Cenário: ${campaign?.setting || "N/A"}
- Descrição da campanha: ${campaign?.description || "N/A"}
- Sessão: ${session?.name || "N/A"}
- Data da sessão: ${sessionDateStr}
${sessionSummary ? `- Resumo da sessão: ${sessionSummary}\n` : ""}- NPS médio: ${avgNps.toFixed(1)}/10
- Total de respostas: ${(responses ?? []).length} de ${expectedResponses} jogadores
${playerContext}${selfEvaluation ? `\nAUTOAVALIAÇÃO DO MESTRE:\n${selfEvaluation}\n` : ""}
FEEDBACK DOS JOGADORES:
${feedbackSummary}

TAREFA:
Analise os feedbacks e gere uma avaliação construtiva para o mestre. ${selfEvaluation ? "Considere também a autoavaliação do mestre — compare a percepção dele com a dos jogadores, destacando convergências e divergências." : ""} Sua análise deve conter:
1. Três elogios específicos baseados no que os jogadores destacaram positivamente
2. Um ponto de melhoria concreto e acionável
3. Uma sugestão de estudo ou ação prática (pode ser um exercício, técnica narrativa, dinâmica de grupo, ou referência de estudo sobre mestrar RPG — sem citar fontes específicas)
4. Um resumo geral em 2-3 frases que contextualize a sessão, os jogadores e os personagens

Use a ferramenta fornecida para estruturar sua resposta.`;

    console.log(`[analyze-feedback] Prompt length: ${prompt.length}, responses: ${(responses ?? []).length}`);

    // Use tool calling for structured output
    const aiResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        tools: [
          {
            type: "function",
            function: {
              name: "feedback_analysis",
              description: "Return structured feedback analysis for the RPG session master.",
              parameters: {
                type: "object",
                properties: {
                  compliments: {
                    type: "array",
                    items: { type: "string" },
                    description: "Three specific compliments based on player feedback"
                  },
                  improvement: {
                    type: "string",
                    description: "One concrete and actionable improvement point"
                  },
                  study_suggestion: {
                    type: "string",
                    description: "A study or practical action suggestion"
                  },
                  summary: {
                    type: "string",
                    description: "General summary in 2-3 sentences contextualizing the session, players and characters"
                  }
                },
                required: ["compliments", "improvement", "study_suggestion", "summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "feedback_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    
    let analysis;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        analysis = JSON.parse(toolCall.function.arguments);
      } else {
        const content = aiData.choices?.[0]?.message?.content || "";
        analysis = JSON.parse(content);
      }
    } catch {
      const content = aiData.choices?.[0]?.message?.content || "";
      analysis = { summary: content, compliments: [], improvement: "", study_suggestion: "" };
    }

    // Save analysis
    const { data: saved, error: saveErr } = await supabase
      .from("session_feedback_ai_analyses")
      .insert({
        config_id,
        analysis_type: "session",
        result: analysis,
        created_by: userId,
      })
      .select()
      .single();

    if (saveErr) throw saveErr;

    // Log usage
    await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      feature: "feedback_analysis",
      model: "google/gemini-2.5-flash",
    });

    return new Response(JSON.stringify({ success: true, analysis: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-feedback error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
