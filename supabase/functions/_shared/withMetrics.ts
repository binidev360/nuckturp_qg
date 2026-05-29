// ================================================================
// withMetrics — instrumentação portátil de Edge Functions
//
// Envolve um handler Deno.serve e registra cada invocação em
// public.edge_function_metrics (status, duração, erro, request_id).
//
// Funciona em QUALQUER stack Postgres + Deno (Supabase managed,
// self-hosted, Fly, Deno Deploy). Não depende de painel do provedor.
//
// Uso:
//   import { withMetrics } from "../_shared/withMetrics.ts";
//   serve(withMetrics("minha-funcao", async (req) => { ... }));
//
// O registro é fire-and-forget (não bloqueia a resposta).
// ================================================================

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

type Handler = (req: Request) => Promise<Response> | Response;

// Cliente único reaproveitado entre invocações (warm starts).
let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (_client) return _client;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

function extractUserId(req: Request): string | null {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const payload = token.split(".")[1];
    if (!payload) return null;
    // base64url decode
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    const json = JSON.parse(atob(b64));
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

async function record(row: {
  function_name: string;
  status_code: number;
  duration_ms: number;
  error_message?: string | null;
  request_id?: string | null;
  user_id?: string | null;
}) {
  const client = getClient();
  if (!client) return;
  try {
    await client.from("edge_function_metrics").insert(row);
  } catch (_e) {
    // Métricas nunca devem quebrar a função.
  }
}

export function withMetrics(name: string, handler: Handler): Handler {
  return async (req: Request) => {
    // CORS preflight não é medido (ruído).
    if (req.method === "OPTIONS") return handler(req);

    const start = performance.now();
    const requestId =
      req.headers.get("x-request-id") ??
      (crypto.randomUUID ? crypto.randomUUID() : null);
    const userId = extractUserId(req);

    let status = 500;
    let errorMessage: string | null = null;
    try {
      const res = await handler(req);
      status = res.status;
      if (status >= 500) {
        // Tenta ler o corpo de erro sem consumir o stream original.
        try {
          const clone = res.clone();
          const txt = await clone.text();
          errorMessage = txt.slice(0, 500) || null;
        } catch {
          /* ignore */
        }
      }
      return res;
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      const duration = Math.round(performance.now() - start);
      // fire-and-forget
      record({
        function_name: name,
        status_code: status,
        duration_ms: duration,
        error_message: errorMessage,
        request_id: requestId,
        user_id: userId,
      }).catch(() => {});
    }
  };
}
