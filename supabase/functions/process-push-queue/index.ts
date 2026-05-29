/**
 * process-push-queue — Processa fila de push pendentes com agrupamento inteligente.
 * Chamado via cron a cada 5 minutos.
 * 
 * Lógica:
 * 1. Busca itens pendentes cuja scheduled_for já passou
 * 2. Agrupa por user_id — se 3+ pendentes, envia resumo agrupado
 * 3. Se 1-2 pendentes, envia individualmente
 * 4. Marca como 'sent' ou 'grouped'
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withMetrics } from "../_shared/withMetrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GROUPING_THRESHOLD = 3; // Agrupa quando 3+ notificações acumulam

serve(withMetrics("process-push-queue", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const now = new Date();

    // Guard clause: verifica se há itens pendentes antes de processar (query leve)
    const { count, error: countErr } = await supabase
      .from("pending_push_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lte("scheduled_for", now.toISOString());

    if (countErr) throw countErr;
    if (!count || count === 0) {
      return new Response(JSON.stringify({ processed: 0, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca itens pendentes cuja hora agendada já passou
    const { data: pendingItems, error: fetchErr } = await supabase
      .from("pending_push_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now.toISOString())
      .order("created_at", { ascending: true })
      .limit(1000);

    if (fetchErr) throw fetchErr;
    if (!pendingItems || pendingItems.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agrupa por user_id
    const byUser: Record<string, any[]> = {};
    for (const item of pendingItems) {
      if (!byUser[item.user_id]) byUser[item.user_id] = [];
      byUser[item.user_id].push(item);
    }

    const pushUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let totalSent = 0;
    let totalGrouped = 0;

    for (const [userId, items] of Object.entries(byUser)) {
      if (items.length >= GROUPING_THRESHOLD) {
        // Agrupamento inteligente: envia um único push resumo
        const groupTitle = "QG do Mestre";
        const groupBody = `Você tem ${items.length} novas atualizações`;
        const latestUrl = items[items.length - 1].url || "/dashboard";

        try {
          await fetch(pushUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_ids: [userId],
              title: groupTitle,
              body: groupBody,
              url: latestUrl,
            }),
          });
        } catch (pushErr) {
          console.error("Grouped push error:", pushErr);
        }

        // Marca todos como 'grouped'
        const itemIds = items.map((i) => i.id);
        for (let i = 0; i < itemIds.length; i += 500) {
          await supabase
            .from("pending_push_queue")
            .update({ status: "grouped" })
            .in("id", itemIds.slice(i, i + 500));
        }
        totalGrouped += items.length;
      } else {
        // Envia individualmente (1-2 notificações)
        for (const item of items) {
          try {
            await fetch(pushUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                notification_id: item.notification_id,
                user_ids: [userId],
                title: item.title,
                body: item.body,
                url: item.url,
                image: item.image_url,
              }),
            });
          } catch (pushErr) {
            console.error("Individual push error:", pushErr);
          }

          await supabase
            .from("pending_push_queue")
            .update({ status: "sent" })
            .eq("id", item.id);
        }
        totalSent += items.length;
      }
    }

    // Limpa itens processados com mais de 7 dias
    await supabase
      .from("pending_push_queue")
      .delete()
      .in("status", ["sent", "grouped"])
      .lt("created_at", new Date(now.getTime() - 7 * 86400000).toISOString());

    return new Response(
      JSON.stringify({
        processed: pendingItems.length,
        sent_individually: totalSent,
        sent_grouped: totalGrouped,
        users_affected: Object.keys(byUser).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-push-queue error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
