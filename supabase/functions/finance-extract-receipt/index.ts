// ================================================================
// finance-extract-receipt
//
// Lê uma foto/PDF de recibo, NF ou comprovante (já subido pelo mestre
// no bucket PRIVADO `finance-receipts`) e extrai dados estruturados via
// IA com visão (Lovable AI Gateway · Gemini multimodal).
//
// IMPORTANTE: esta função APENAS LÊ e SUGERE. Nunca grava um lançamento.
// O mestre confirma no front antes de qualquer escrita no caixa.
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withMetrics } from "../_shared/withMetrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Converte ArrayBuffer → base64 sem estourar a stack em arquivos grandes.
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

serve(withMetrics("finance-extract-receipt", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // ── Auth: exige usuário autenticado ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { storage_path } = await req.json();
    if (!storage_path || typeof storage_path !== "string") {
      return json({ error: "storage_path obrigatório" }, 400);
    }

    // Defesa em profundidade: o caminho precisa começar com a pasta do próprio usuário.
    if (!storage_path.startsWith(`${user.id}/`)) {
      return json({ error: "Forbidden" }, 403);
    }

    // ── Baixa o arquivo do bucket privado ──
    const { data: file, error: dlError } = await supabaseClient.storage
      .from("finance-receipts")
      .download(storage_path);
    if (dlError || !file) return json({ error: "Arquivo não encontrado" }, 404);

    const buf = await file.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return json({ error: "Arquivo grande demais (máx 10 MB)" }, 413);
    }

    const mime = file.type || "application/octet-stream";
    const dataUrl = `data:${mime};base64,${toBase64(buf)}`;

    const systemPrompt =
      "Você extrai dados financeiros de recibos, notas fiscais e comprovantes brasileiros. " +
      "Responda SOMENTE chamando a função extract_receipt. " +
      "Valores em centavos (inteiro): R$ 12,50 = 1250. Datas em ISO (YYYY-MM-DD). " +
      "Se um campo não estiver legível, use null. Sugira a categoria mais provável entre: " +
      "mapas, vtt, patreon, marketing, design, ilustracao, plataforma, software, outros.";

    const aiResp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia os dados deste documento." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt",
              description: "Dados estruturados extraídos do documento financeiro.",
              parameters: {
                type: "object",
                properties: {
                  vendor: { type: ["string", "null"], description: "Fornecedor/emitente" },
                  doc_type: {
                    type: ["string", "null"],
                    enum: ["recibo", "nota_fiscal", "comprovante", "fatura", "outro", null],
                  },
                  total_cents: { type: ["integer", "null"], description: "Valor total em centavos" },
                  doc_date: { type: ["string", "null"], description: "Data do documento (YYYY-MM-DD)" },
                  suggested_category: { type: ["string", "null"] },
                  line_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        amount_cents: { type: ["integer", "null"] },
                      },
                      required: ["description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["vendor", "doc_type", "total_cents", "doc_date", "suggested_category"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Limite de requisições excedido. Tente em instantes." }, 429);
      if (aiResp.status === 402) return json({ error: "Créditos de IA insuficientes." }, 402);
      const tt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, tt);
      return json({ error: "Não consegui ler o documento. Tente uma foto mais nítida." }, 502);
    }

    const aiData = await aiResp.json();
    let extracted: Record<string, unknown> | null = null;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) extracted = JSON.parse(toolCall.function.arguments);
    } catch (_) {
      extracted = null;
    }

    if (!extracted) {
      return json({ error: "Não consegui interpretar os dados do documento." }, 422);
    }

    // Log de uso (fire-and-forget)
    supabaseClient.from("ai_usage_logs").insert({
      user_id: user.id,
      feature: "finance_receipt_ocr",
      model: MODEL,
    }).then(() => {}).catch(() => {});

    return json({ extracted });
  } catch (e) {
    console.error("finance-extract-receipt error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
}));
