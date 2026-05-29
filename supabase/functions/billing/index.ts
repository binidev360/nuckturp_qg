/**
 * billing — Router unificado para todas as operações de billing.
 * 
 * Actions:
 *   - check:    Verifica status da assinatura (override DB, override env, Stripe)
 *   - checkout: Cria sessão de checkout Stripe
 *   - portal:   Cria sessão do Customer Portal Stripe
 *   - invoices: Lista faturas pagas do usuário
 * 
 * Consolidação de 4 edge functions em 1 para eliminar cold starts.
 * O check-subscription (chamado frequentemente) mantém a função quente,
 * beneficiando checkout/portal/invoices que são chamados esporadicamente.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Cria Supabase client com service role para acesso admin */
function createSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

/** Valida o JWT e retorna o usuário autenticado */
async function authenticateUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user;
}

/** Cria instância do Stripe */
function createStripe() {
  return new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
}

// ─── Action: check ──────────────────────────────────────────────────────────

async function handleCheck(
  user: { id: string; email?: string },
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe
) {
  // 1. Check DB premium override first
  const { data: override } = await supabase
    .from("premium_overrides")
    .select("starts_at, ends_at")
    .eq("user_id", user.id)
    .single();

  if (override) {
    const now = new Date();
    const starts = new Date(override.starts_at);
    const ends = override.ends_at ? new Date(override.ends_at) : null;
    if (now >= starts && (!ends || now <= ends)) {
      return {
        subscribed: true,
        product_id: "admin_override",
        subscription_end: ends?.toISOString() || null,
        subscription_start: override.starts_at,
        override: true,
      };
    }
  }

  // 2. Legacy env-var override (backward compat)
  const premiumOverrides = Deno.env.get("PREMIUM_OVERRIDE_EMAILS");
  if (premiumOverrides) {
    const overrideList = premiumOverrides.split(",").map((e) => e.trim().toLowerCase());
    if (overrideList.includes(user.email!.toLowerCase())) {
      return {
        subscribed: true,
        product_id: "override",
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  }

  // 3. Check Stripe
  const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
  if (customers.data.length === 0) {
    return { subscribed: false };
  }

  const customerId = customers.data[0].id;
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return { subscribed: false };
  }

  const sub = subscriptions.data[0];
  return {
    subscribed: true,
    product_id: sub.items.data[0].price.product,
    subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
    subscription_start: new Date(sub.start_date * 1000).toISOString(),
  };
}

// ─── Action: checkout ───────────────────────────────────────────────────────

async function handleCheckout(
  user: { id: string; email?: string },
  stripe: Stripe,
  body: Record<string, unknown>,
  origin: string
) {
  const { priceId } = body;

  // Validate priceId format
  if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
    return { error: "Invalid price ID", _status: 400 };
  }

  const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
  let customerId: string | undefined;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: customerId ? undefined : user.email!,
    line_items: [{ price: priceId as string, quantity: 1 }],
    mode: "subscription",
    success_url: `${origin}/checkout?checkout=success`,
    cancel_url: `${origin}/checkout?checkout=cancel`,
  });

  return { url: session.url };
}

// ─── Action: portal ─────────────────────────────────────────────────────────

async function handlePortal(
  user: { id: string; email?: string },
  stripe: Stripe,
  origin: string
) {
  const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
  if (customers.data.length === 0) {
    return { error: "Customer not found", _status: 404 };
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${origin}/plans`,
  });

  return { url: portalSession.url };
}

// ─── Action: invoices ───────────────────────────────────────────────────────

async function handleInvoices(
  user: { id: string; email?: string },
  stripe: Stripe
) {
  const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
  if (customers.data.length === 0) {
    return { invoices: [] };
  }

  const customerId = customers.data[0].id;
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 24,
    status: "paid",
  });

  const mapped = invoices.data.map((inv) => {
    const discount = inv.discount;
    const couponName = discount?.coupon?.name || discount?.coupon?.id || null;
    const couponPercent = discount?.coupon?.percent_off || null;
    const couponAmountOff = discount?.coupon?.amount_off || null;

    return {
      id: inv.id,
      date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      amount_paid: (inv.amount_paid || 0) / 100,
      amount_total: (inv.total || 0) / 100,
      subtotal: (inv.subtotal || 0) / 100,
      currency: inv.currency,
      status: inv.status,
      invoice_pdf: inv.invoice_pdf,
      coupon_name: couponName,
      coupon_percent: couponPercent,
      coupon_amount_off: couponAmountOff ? couponAmountOff / 100 : null,
    };
  });

  return { invoices: mapped };
}

// ─── Main Router ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createSupabaseClient();

  try {
    // Autenticação obrigatória para todas as actions
    const user = await authenticateUser(req, supabase);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body para extrair action
    const body = await req.json().catch(() => ({}));
    const action = (body as Record<string, unknown>).action as string;

    if (!action || !["check", "checkout", "portal", "invoices"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use: check, checkout, portal, invoices" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = createStripe();
    const origin = req.headers.get("origin") || "http://localhost:3000";

    let result: Record<string, unknown>;

    switch (action) {
      case "check":
        result = await handleCheck(user, supabase, stripe);
        break;
      case "checkout":
        result = await handleCheckout(user, stripe, body as Record<string, unknown>, origin);
        break;
      case "portal":
        result = await handlePortal(user, stripe, origin);
        break;
      case "invoices":
        result = await handleInvoices(user, stripe);
        break;
      default:
        result = { error: "Unknown action" };
    }

    // Suporte a status HTTP customizado via _status
    const status = (result._status as number) || 200;
    const { _status: _, ...responseData } = result;

    return new Response(JSON.stringify(responseData), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("billing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
