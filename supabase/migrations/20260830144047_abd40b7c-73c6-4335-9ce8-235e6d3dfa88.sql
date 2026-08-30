-- GitMoon billing core: profiles, subscriptions, token_ledger
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'STARTER',
  tokens_remaining INTEGER NOT NULL DEFAULT 2500,
  repo_limit INTEGER NOT NULL DEFAULT 5,
  plan_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  product_id TEXT,
  price_id TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'PRO',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.token_ledger (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_ledger_user_id ON public.token_ledger(user_id);

GRANT SELECT ON public.token_ledger TO authenticated;
GRANT ALL ON public.token_ledger TO service_role;
ALTER TABLE public.token_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_ledger_select_own" ON public.token_ledger;
CREATE POLICY "token_ledger_select_own" ON public.token_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.apply_plan_entitlements(
  _user_id UUID,
  _tier TEXT,
  _period_end TIMESTAMPTZ,
  _reference TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tokens INTEGER;
  _repos INTEGER;
BEGIN
  IF _tier = 'PRO' THEN
    _tokens := 7500; _repos := 20;
  ELSIF _tier = 'BUSINESS' THEN
    _tokens := 15000; _repos := 40;
  ELSE
    _tokens := 2500; _repos := 5;
  END IF;

  INSERT INTO public.profiles (id, plan_tier, tokens_remaining, repo_limit, plan_expires_at, updated_at)
  VALUES (_user_id, _tier, _tokens, _repos, _period_end, now())
  ON CONFLICT (id) DO UPDATE
    SET plan_tier = EXCLUDED.plan_tier,
        tokens_remaining = EXCLUDED.tokens_remaining,
        repo_limit = EXCLUDED.repo_limit,
        plan_expires_at = EXCLUDED.plan_expires_at,
        updated_at = now();

  INSERT INTO public.token_ledger (user_id, amount, reason, reference)
  VALUES (_user_id, _tokens, 'plan_grant_' || _tier, _reference);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_plan_entitlements(UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_plan_entitlements(UUID, TEXT, TIMESTAMPTZ, TEXT) TO service_role;