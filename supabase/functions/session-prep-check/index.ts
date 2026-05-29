import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const CATEGORIES = ["narrativa", "mecanica", "npcs", "locais", "recompensas"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from token (gateway already verified JWT)
    const token = req.headers.get("Authorization")!.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Get user tenant
    const { data: tenantData } = await supabase.rpc("get_user_tenant_id", { _user_id: userId });
    if (!tenantData) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tenantId = tenantData;

    const body = await req.json();
    const { session_id, campaign_id, mode } = body;
    const isQuickMode = mode === "quick";

    if (!session_id || !campaign_id) {
      return new Response(JSON.stringify({ error: "session_id and campaign_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ─── Fetch all necessary data ───

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, description, system, setting, arc_summary, is_one_shot")
      .eq("id", campaign_id)
      .eq("tenant_id", tenantId)
      .single();

    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOneShot = campaign.is_one_shot ?? false;

    const { data: targetSession } = await supabase
      .from("sessions")
      .select("name, summary, status, session_date, checklist_pre, checklist_post, estimated_duration_min, sort_order, ai_questions")
      .eq("id", session_id)
      .eq("tenant_id", tenantId)
      .single();

    if (!targetSession) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Previous sessions (with summaries)
    let previousSessions: any[] = [];

    if (isQuickMode) {
      const { data } = await supabase
        .from("sessions")
        .select("name, summary, status, session_date, sort_order")
        .eq("campaign_id", campaign_id)
        .eq("tenant_id", tenantId)
        .neq("id", session_id)
        .order("sort_order", { ascending: false })
        .limit(1);
      previousSessions = data ?? [];
    } else if (!isOneShot) {
      const { data } = await supabase
        .from("sessions")
        .select("name, summary, status, session_date, sort_order")
        .eq("campaign_id", campaign_id)
        .eq("tenant_id", tenantId)
        .neq("id", session_id)
        .order("sort_order", { ascending: true })
        .limit(20);
      previousSessions = data ?? [];
    }

    // ─── Fetch campaign notes (notes linked to this campaign) ───
    const { data: campaignNotes } = await supabase
      .from("notes")
      .select("title, content, type, tags")
      .eq("campaign_id", campaign_id)
      .eq("tenant_id", tenantId)
      .limit(20);

    // Check admin via user_roles table
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .single();

    // ─── Fetch all session notes for this campaign's sessions ───
    const { data: allCampaignSessions } = await supabase
      .from("sessions")
      .select("id, name")
      .eq("campaign_id", campaign_id)
      .eq("tenant_id", tenantId);

    const sessionIds = (allCampaignSessions ?? []).map(s => s.id);

    // ─── Fetch session-specific notes (from the notes table linked to sessions) ───
    let sessionNotes: any[] = [];
    if (sessionIds.length > 0) {
      const { data } = await supabase
        .from("notes")
        .select("title, content, session_id")
        .in("session_id", sessionIds)
        .eq("tenant_id", tenantId)
        .limit(50);
      sessionNotes = data ?? [];
    }

    // ─── Fetch characters (player_campaigns) with player info ───
    const { data: characters } = await supabase
      .from("player_campaigns")
      .select("id, character_name, character_class, character_species, appearance, mannerisms, motivation_purpose, personal_goal, backstory, notes, tags, active, players(name, tags, playstyle_tags)")
      .eq("campaign_id", campaign_id)
      .eq("active", true);

    // ─── Fetch character session notes ───
    const characterIds = (characters ?? []).map(c => c.id);
    let charSessionNotes: any[] = [];
    if (characterIds.length > 0) {
      const { data } = await supabase
        .from("character_session_notes")
        .select("content, player_campaign_id, sessions(name, session_date)")
        .in("player_campaign_id", characterIds)
        .order("created_at", { ascending: false })
        .limit(100);
      charSessionNotes = data ?? [];
    }

    // ─── Fetch NPCs (character_relationships) ───
    let npcs: any[] = [];
    if (characterIds.length > 0) {
      const { data } = await supabase
        .from("character_relationships")
        .select("name, entity_type, relationship_type, appearance, mannerisms, motivation, current_goal, npc_notes, player_campaign_id")
        .in("player_campaign_id", characterIds)
        .eq("entity_type", "npc");
      npcs = data ?? [];
    }

    // ─── Fetch player presence data ───
    let presenceData: any[] = [];
    if (characterIds.length > 0) {
      const { data } = await supabase
        .from("session_players")
        .select("present, player_campaign_id")
        .in("player_campaign_id", characterIds);
      presenceData = data ?? [];
    }

    // ─── Build context ───
    const checklistPreItems = Array.isArray(targetSession.checklist_pre) ? targetSession.checklist_pre : [];
    const checklistPreText = checklistPreItems.length > 0
      ? checklistPreItems.map((item: any) => `- [${item.checked ? "x" : " "}] ${item.text}`).join("\n")
      : "Nenhum item no checklist de pré-sessão.";

    const existingAiQuestions: any[] = Array.isArray(targetSession.ai_questions) ? targetSession.ai_questions : [];
    const existingQuestionsText = existingAiQuestions.length > 0
      ? existingAiQuestions.map((q: any) => `- [${q.category || "geral"}] ${typeof q === "string" ? q : q.text}`).join("\n")
      : "";

    const prevSessionsText = previousSessions.length > 0
      ? previousSessions.map((s: any, i: number) =>
          `### Sessão ${i + 1}: ${s.name}\nStatus: ${s.status}\nResumo: ${s.summary || "Sem resumo"}`
        ).join("\n\n")
      : "Nenhuma sessão anterior encontrada.";

    // Build characters context
    const charactersText = (characters ?? []).map((c: any) => {
      const player = c.players as any;
      const charNotes = charSessionNotes
        .filter(n => n.player_campaign_id === c.id)
        .map(n => `  - [${(n.sessions as any)?.name || "Sessão"}] ${n.content}`)
        .join("\n");
      const charNpcs = npcs
        .filter(n => n.player_campaign_id === c.id)
        .map(n => `  - ${n.name} (${n.relationship_type}): ${[n.appearance, n.motivation, n.current_goal].filter(Boolean).join(" | ")}${n.npc_notes ? ` | Notas: ${n.npc_notes.substring(0, 200)}` : ""}`)
        .join("\n");
      const presenceForChar = presenceData.filter(p => p.player_campaign_id === c.id);
      const totalSessions = presenceForChar.length;
      const presentCount = presenceForChar.filter(p => p.present).length;

      let text = `### ${c.character_name || "Sem nome"} (${c.character_species || "?"} ${c.character_class || "?"})`;
      if (player) {
        text += `\nJogador: ${player.name || "Desconhecido"}`;
        if (player.tags?.length > 0) text += `\nGostos pessoais: ${player.tags.join(", ")}`;
        if (player.playstyle_tags?.length > 0) text += `\nEstilo de jogo: ${player.playstyle_tags.join(", ")}`;
        if (totalSessions > 0) text += `\nPresença: ${presentCount}/${totalSessions} sessões (${Math.round(presentCount/totalSessions*100)}%)`;
      }
      if (c.appearance) text += `\nAparência: ${c.appearance}`;
      if (c.mannerisms) text += `\nManeirismos: ${c.mannerisms}`;
      if (c.motivation_purpose) text += `\nMotivação: ${c.motivation_purpose}`;
      if (c.personal_goal) text += `\nObjetivo pessoal: ${c.personal_goal}`;
      if (c.backstory) text += `\nBackstory: ${c.backstory.substring(0, 300)}`;
      if (c.notes) text += `\nAnotações do mestre: ${c.notes.substring(0, 300)}`;
      if (charNotes) text += `\nAnotações por sessão:\n${charNotes}`;
      if (charNpcs) text += `\nNPCs vinculados:\n${charNpcs}`;
      return text;
    }).join("\n\n");

    // Build campaign notes context
    const campaignNotesText = (campaignNotes ?? []).length > 0
      ? (campaignNotes ?? []).map((n: any) => `- [${n.type}] ${n.title}: ${(n.content || "").replace(/<[^>]*>/g, " ").substring(0, 200)}`).join("\n")
      : "";

    // Build session notes context
    const sessionNotesText = sessionNotes.length > 0
      ? sessionNotes.map((n: any) => {
          const sessionName = (allCampaignSessions ?? []).find(s => s.id === n.session_id)?.name || "Sessão";
          return `- [${sessionName}] ${n.title}: ${(n.content || "").replace(/<[^>]*>/g, " ").substring(0, 200)}`;
        }).join("\n")
      : "";

    // ─── Build prompts ───
    const questionCount = isQuickMode ? 2 : 5;
    const categoryInstruction = isQuickMode
      ? `Retorne exatamente 2 perguntas essenciais. Escolha as 2 categorias mais relevantes.`
      : `Retorne de 2 a 5 perguntas. Distribua entre as categorias conforme as lacunas encontradas.`;

    const rhythmInstruction = isQuickMode
      ? ""
      : `\n\nANÁLISE DE RITMO NARRATIVO (obrigatória se houver sessões anteriores):
Ao final, forneça uma breve análise (máximo 2 frases) sobre o ritmo narrativo da campanha.
Compare com as sessões anteriores e indique se a história está acelerando, desacelerando, ou em ritmo adequado.
Se não houver sessões anteriores, diga "Primeira sessão — ritmo a ser definido."`;

    const systemPrompt = `Você é um consultor de preparação de sessões de RPG de mesa, especialista no método do Mestre Metódico (Nuckturp). Sua função é EXCLUSIVAMENTE fazer perguntas ao mestre para ajudá-lo a melhorar a preparação da sessão. Você NÃO fornece respostas, sugestões criativas ou conteúdo narrativo — apenas perguntas reflexivas e estratégicas.

REGRAS ABSOLUTAS:
1. Responda APENAS com perguntas. NUNCA dê respostas, dicas ou sugestões.
2. ${categoryInstruction}
3. As perguntas devem ser específicas e acionáveis, baseadas nos dados analisados.
4. As perguntas devem ajudar o mestre a identificar lacunas na preparação.
5. Escreva em português brasileiro, de forma direta e objetiva.
6. NÃO repita informações que o mestre já preencheu.
7. NÃO faça perguntas genéricas. Cada pergunta deve se basear no conteúdo real fornecido.
8. Se a sessão já parece bem preparada, faça perguntas que levem a um nível mais profundo de preparação.
9. NUNCA repita perguntas que já foram feitas anteriormente (listadas em "Perguntas já feitas"). Crie perguntas COMPLETAMENTE DIFERENTES em tema, foco e abordagem. Se uma pergunta anterior abordou um tema, explore um ângulo totalmente diferente ou um tema novo.
10. Se a sessão está COMPLETAMENTE preparada e não há lacunas, retorne um array VAZIO de perguntas e coloque na rhythm_analysis: "✅ Você está preparado para sua sessão! Todos os pontos do checklist estão cobertos e a preparação está consistente."
11. PRIORIZE a evolução da história com foco nos personagens dos jogadores. Use as informações dos personagens (motivações, objetivos, backstory) para criar perguntas que conectem a narrativa aos arcos pessoais.
12. Analise os NPCs vinculados aos personagens para sugerir perguntas sobre como esses NPCs podem influenciar a sessão.
13. Sobre os jogadores, você só sabe: nome, gostos pessoais, estilo de jogo e histórico de presença. NÃO invente informações além dessas.
14. REGRA DE CAPITALIZAÇÃO (OBRIGATÓRIA): Use SEMPRE caixa de frase (sentence case) em português. Apenas a primeira letra da frase e nomes próprios são maiúsculas. NUNCA use Title Case (capitalizar cada palavra). Siglas (RPG, NPC, D&D) e nomes próprios mantêm suas maiúsculas naturais.

CATEGORIAS DE PERGUNTAS:
Cada pergunta DEVE pertencer a uma das seguintes categorias:
- "narrativa" — Perguntas sobre a história, arco narrativo, conflitos, motivações
- "mecanica" — Perguntas sobre regras do sistema, encontros de combate, desafios mecânicos
- "npcs" — Perguntas sobre NPCs, seus objetivos, personalidades, falas
- "locais" — Perguntas sobre locais, mapas, ambientação, descrições sensoriais
- "recompensas" — Perguntas sobre tesouros, recompensas, progressão, consequências

CHECKLIST DO MESTRE METÓDICO (PRÉ-SESSÃO) — Use como base de análise:
- Relembrar quem são os personagens da sessão
- Definir o Começo Impactante
- Pensar no que os jogadores podem fazer na sessão
- Anotar 10 informações e segredos que podem ser revelados na sessão
- Criar de 3 a 5 locais fantásticos
- Criar de 3 a 5 NPCs importantes
- Definir 2 a 3 encontros de luta possíveis
- Criar as recompensas
- Preparar as músicas (jornada, tensão, combate)
- Escolher ou criar Mapas, Tokens e Imagens
- Criar a ficha dos NPCs e Inimigos

ANÁLISE OBRIGATÓRIA:
1. Verifique quais itens do checklist estão marcados e quais não estão.
2. Analise o resumo/conteúdo da sessão para ver se há lacunas narrativas.
3. ${isOneShot || isQuickMode ? "Analise apenas esta sessão isoladamente." : "Analise a coerência com sessões anteriores e se a história está progredindo."}
4. Considere o sistema de jogo (${campaign.system || "não especificado"}) e o cenário (${campaign.setting || "não especificado"}).
5. Avalie se a preparação tem profundidade suficiente para a duração estimada.
6. Analise as informações dos personagens (aparência, maneirismos, motivação, objetivo pessoal, backstory) e dos NPCs vinculados para criar perguntas que conectem a narrativa aos arcos pessoais dos personagens.
${rhythmInstruction}

FORMATO DE SAÍDA:
Use a tool "session_prep_result" para retornar as perguntas categorizadas e a análise de ritmo.`;

    const userPrompt = `## Campanha
Nome: ${campaign.name}
Tipo: ${isOneShot ? "One-shot (sessão única)" : "Campanha contínua"}
Sistema: ${campaign.system || "Não especificado"}
Cenário/Ambientação: ${campaign.setting || "Não especificado"}
Descrição: ${campaign.description || "Sem descrição"}
${campaign.arc_summary ? `Resumo do Arco Narrativo: ${campaign.arc_summary}` : ""}

${campaignNotesText ? `## Notas da Campanha\n${campaignNotesText}\n` : ""}

${isQuickMode ? "## Modo Revisão Rápida\nAnalisando apenas a sessão atual e a sessão anterior." : ""}

## Sessão a ser avaliada: "${targetSession.name}"
Status: ${targetSession.status}
Data: ${targetSession.session_date || "Sem data definida"}
Duração estimada: ${targetSession.estimated_duration_min ? `${targetSession.estimated_duration_min} minutos` : "Não definida"}

### Resumo/Conteúdo da Sessão
${targetSession.summary || "Nenhum conteúdo registrado na sessão."}

### Checklist de Pré-Sessão
${checklistPreText}

${sessionNotesText ? `## Notas vinculadas a sessões\n${sessionNotesText}\n` : ""}

## Personagens da Campanha
${charactersText || "Nenhum personagem registrado."}

## ${isQuickMode ? "Sessão Anterior" : "Sessões Anteriores"} (contexto)
${prevSessionsText}

${existingQuestionsText ? `## Perguntas já feitas (NÃO repita NENHUMA dessas, NÃO faça perguntas parecidas, busque temas e ângulos COMPLETAMENTE NOVOS)\n${existingQuestionsText}\n` : ""}
${isQuickMode ? "Forneça exatamente 2 perguntas essenciais categorizadas. Se a sessão estiver completamente preparada, retorne array vazio." : "Forneça de 2 a 5 perguntas categorizadas e uma análise de ritmo narrativo. Se a sessão estiver completamente preparada, retorne array vazio."}`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "session_prep_result",
              description: "Return categorized prep questions and rhythm analysis.",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: CATEGORIES,
                          description: "Question category",
                        },
                        text: {
                          type: "string",
                          description: "The reflective question text",
                        },
                      },
                      required: ["category", "text"],
                    },
                    minItems: 0,
                    maxItems: 5,
                    description: "2-5 categorized reflective questions.",
                  },
                  rhythm_analysis: {
                    type: "string",
                    description: "Brief narrative rhythm analysis (1-2 sentences). Empty string if quick mode.",
                  },
                },
                required: ["questions", "rhythm_analysis"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "session_prep_result" } },
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
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao analisar sessão. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    let questions: { category: string; text: string }[] = [];
    let rhythm_analysis = "";

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const args = JSON.parse(toolCall.function.arguments);
        questions = (args.questions || []).slice(0, questionCount).map((q: any) => ({
          category: CATEGORIES.includes(q.category) ? q.category : "narrativa",
          text: String(q.text || ""),
        }));
        rhythm_analysis = String(args.rhythm_analysis || "");
      }
    } catch {
      console.error("Failed to parse AI response");
    }

    if (questions.length === 0 && rhythm_analysis) {
      return new Response(JSON.stringify({ questions: [], rhythm_analysis, ready: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Não foi possível gerar perguntas. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log AI usage
    supabase.from("ai_usage_logs").insert({
      user_id: userId,
      feature: "session_prep_check",
      model: "google/gemini-3-flash-preview",
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({ questions, rhythm_analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("session-prep-check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
