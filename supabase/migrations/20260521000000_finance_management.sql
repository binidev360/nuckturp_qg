-- ================================================================
-- 20260521000000_finance_management.sql
--
-- Gestão Financeira do Mestre Comissionado.
-- 5 tabelas + bucket privado + view de resumo mensal.
-- Todos os dados são PRIVADOS do tenant (mestre). Sem política de admin:
-- nem o admin da plataforma enxerga as finanças do mestre.
--
-- Valores monetários são sempre INTEIROS em CENTAVOS (amount_cents),
-- nunca float — elimina erro de arredondamento.
--
-- Migration idempotente: segura para re-executar.
-- ================================================================


-- ── 1. Configurações financeiras (1 por tenant) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_settings (
  id                      UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  platform_fee_enabled    BOOLEAN NOT NULL DEFAULT true,
  platform_fee_pct        NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  currency                TEXT NOT NULL DEFAULT 'BRL',

  monthly_goal_cents      INTEGER NOT NULL DEFAULT 0,
  reserve_pct             NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  -- Alerta estratégico: ganho líquido por sessão abaixo deste valor acende aviso.
  min_session_alert_cents INTEGER NOT NULL DEFAULT 10000, -- R$100,00

  created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT finance_settings_fee_pct_check    CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 100),
  CONSTRAINT finance_settings_reserve_check    CHECK (reserve_pct >= 0 AND reserve_pct <= 100),
  CONSTRAINT finance_settings_goal_check       CHECK (monthly_goal_cents >= 0),
  CONSTRAINT finance_settings_min_alert_check  CHECK (min_session_alert_cents >= 0)
);


-- ── 2. Precificações salvas (modelos de mesa) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_pricing_models (
  id                     UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name                   TEXT NOT NULL,
  table_type             TEXT NOT NULL DEFAULT 'one_shot',

  price_per_person_cents INTEGER NOT NULL DEFAULT 0,
  num_players            INTEGER NOT NULL DEFAULT 4,

  platform_fee_enabled   BOOLEAN NOT NULL DEFAULT true,
  platform_fee_pct       NUMERIC(5,2) NOT NULL DEFAULT 15.00,

  -- Aventura: nº de sessões do projeto (default 4). One-shot ignora (=1).
  num_sessions           INTEGER NOT NULL DEFAULT 4,
  -- Opcional: lucro por hora (não obrigatório, não conta prep/pós-sessão).
  hours_per_session      NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Sessão Zero: sessão extra geralmente gratuita (custo de qualidade de serviço).
  has_session_zero       BOOLEAN NOT NULL DEFAULT false,

  -- Vínculo opcional com uma campanha real → alimenta a gestão mensal.
  campaign_id            UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  notes                  TEXT NOT NULL DEFAULT '',

  created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT finance_pricing_type_check    CHECK (table_type IN ('one_shot', 'adventure', 'campaign')),
  CONSTRAINT finance_pricing_price_check   CHECK (price_per_person_cents >= 0),
  CONSTRAINT finance_pricing_players_check CHECK (num_players >= 1),
  CONSTRAINT finance_pricing_fee_check     CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 100),
  CONSTRAINT finance_pricing_sessions_check CHECK (num_sessions >= 1),
  CONSTRAINT finance_pricing_hours_check   CHECK (hours_per_session >= 0)
);


-- ── 3. Custos vinculados a uma precificação ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_pricing_costs (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pricing_model_id  UUID NOT NULL REFERENCES public.finance_pricing_models(id) ON DELETE CASCADE,

  label             TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'other',
  amount_cents      INTEGER NOT NULL DEFAULT 0,
  -- one_off  → custo único do projeto/mês
  -- per_session → multiplica pelo nº de sessões
  -- monthly  → recorrente mensal
  recurrence        TEXT NOT NULL DEFAULT 'monthly',

  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT finance_costs_amount_check     CHECK (amount_cents >= 0),
  CONSTRAINT finance_costs_recurrence_check CHECK (recurrence IN ('one_off', 'per_session', 'monthly'))
);


-- ── 4. Recibos / NF subidos (lidos pela IA) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_receipts (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  storage_path  TEXT NOT NULL,
  mime          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  -- JSON extraído pela IA: { vendor, doc_type, total_cents, doc_date, suggested_category, line_items }
  extracted     JSONB,

  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT finance_receipts_status_check CHECK (status IN ('pending', 'processed', 'failed', 'confirmed'))
);


-- ── 5. Livro-caixa (lançamentos) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id                 UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  occurred_on        DATE NOT NULL DEFAULT CURRENT_DATE,
  -- income → receita | expense → despesa | withdrawal → retirada (pró-labore)
  kind               TEXT NOT NULL DEFAULT 'income',
  category           TEXT NOT NULL DEFAULT 'other',
  description        TEXT NOT NULL DEFAULT '',
  -- Sempre POSITIVO; o sinal vem do kind.
  amount_cents       INTEGER NOT NULL DEFAULT 0,
  -- Taxa da plataforma embutida em receitas de mesa (0 quando não se aplica).
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  -- 'table' = receita de mesa | 'other' = outras receitas/despesas
  source             TEXT NOT NULL DEFAULT 'other',

  player_id          UUID REFERENCES public.players(id) ON DELETE SET NULL,
  pricing_model_id   UUID REFERENCES public.finance_pricing_models(id) ON DELETE SET NULL,
  receipt_id         UUID REFERENCES public.finance_receipts(id) ON DELETE SET NULL,

  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT finance_tx_kind_check   CHECK (kind IN ('income', 'expense', 'withdrawal')),
  CONSTRAINT finance_tx_source_check CHECK (source IN ('table', 'other')),
  CONSTRAINT finance_tx_amount_check CHECK (amount_cents >= 0),
  CONSTRAINT finance_tx_fee_check    CHECK (platform_fee_cents >= 0 AND platform_fee_cents <= amount_cents)
);


-- ── 6. Triggers updated_at ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_finance_settings_updated_at ON public.finance_settings;
CREATE TRIGGER update_finance_settings_updated_at
  BEFORE UPDATE ON public.finance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_pricing_models_updated_at ON public.finance_pricing_models;
CREATE TRIGGER update_finance_pricing_models_updated_at
  BEFORE UPDATE ON public.finance_pricing_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_pricing_costs_updated_at ON public.finance_pricing_costs;
CREATE TRIGGER update_finance_pricing_costs_updated_at
  BEFORE UPDATE ON public.finance_pricing_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_receipts_updated_at ON public.finance_receipts;
CREATE TRIGGER update_finance_receipts_updated_at
  BEFORE UPDATE ON public.finance_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_transactions_updated_at ON public.finance_transactions;
CREATE TRIGGER update_finance_transactions_updated_at
  BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ── 7. Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_finance_pricing_tenant      ON public.finance_pricing_models (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_pricing_campaign    ON public.finance_pricing_models (campaign_id);
CREATE INDEX IF NOT EXISTS idx_finance_costs_tenant        ON public.finance_pricing_costs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_costs_model         ON public.finance_pricing_costs (pricing_model_id);
CREATE INDEX IF NOT EXISTS idx_finance_receipts_tenant     ON public.finance_receipts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_tx_tenant           ON public.finance_transactions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_tx_tenant_date      ON public.finance_transactions (tenant_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_finance_tx_player           ON public.finance_transactions (player_id);


-- ── 8. Row Level Security (privado do tenant — SEM acesso de admin) ──────────

ALTER TABLE public.finance_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_pricing_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_pricing_costs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_receipts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions   ENABLE ROW LEVEL SECURITY;

-- Helper macro aplicado tabela a tabela: owner = dono do tenant.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'finance_settings',
    'finance_pricing_models',
    'finance_pricing_costs',
    'finance_receipts',
    'finance_transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Owner can select %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owner can insert %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owner can update %1$s" ON public.%1$s;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owner can delete %1$s" ON public.%1$s;', t);

    EXECUTE format($f$
      CREATE POLICY "Owner can select %1$s" ON public.%1$s FOR SELECT
        USING (tenant_id = public.get_user_tenant_id(auth.uid()));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owner can insert %1$s" ON public.%1$s FOR INSERT
        WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owner can update %1$s" ON public.%1$s FOR UPDATE
        USING (tenant_id = public.get_user_tenant_id(auth.uid()))
        WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owner can delete %1$s" ON public.%1$s FOR DELETE
        USING (tenant_id = public.get_user_tenant_id(auth.uid()));
    $f$, t);
  END LOOP;
END $$;


-- ── 9. View de resumo mensal (herda RLS via security_invoker) ─────────────────

DROP VIEW IF EXISTS public.finance_monthly_summary;
CREATE VIEW public.finance_monthly_summary
  WITH (security_invoker = true) AS
SELECT
  tenant_id,
  date_trunc('month', occurred_on)::date AS month,
  COALESCE(SUM(amount_cents)       FILTER (WHERE kind = 'income'), 0)     AS gross_income_cents,
  COALESCE(SUM(platform_fee_cents) FILTER (WHERE kind = 'income'), 0)     AS platform_fee_cents,
  COALESCE(SUM(amount_cents)       FILTER (WHERE kind = 'income'), 0)
    - COALESCE(SUM(platform_fee_cents) FILTER (WHERE kind = 'income'), 0) AS net_income_cents,
  COALESCE(SUM(amount_cents)       FILTER (WHERE kind = 'expense'), 0)    AS expense_cents,
  COALESCE(SUM(amount_cents)       FILTER (WHERE kind = 'withdrawal'), 0) AS withdrawal_cents,
  COUNT(*)                         FILTER (WHERE kind = 'income')         AS income_count
FROM public.finance_transactions
GROUP BY tenant_id, date_trunc('month', occurred_on);


-- ── 10. Bucket PRIVADO para recibos/NF ───────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-receipts', 'finance-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Acesso restrito: arquivos ficam em pasta {user_id}/... e só o dono lê/escreve.
DROP POLICY IF EXISTS "Owner read finance receipts"   ON storage.objects;
DROP POLICY IF EXISTS "Owner upload finance receipts"  ON storage.objects;
DROP POLICY IF EXISTS "Owner update finance receipts"  ON storage.objects;
DROP POLICY IF EXISTS "Owner delete finance receipts"  ON storage.objects;

CREATE POLICY "Owner read finance receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'finance-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner upload finance receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'finance-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner update finance receipts"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'finance-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner delete finance receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'finance-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
