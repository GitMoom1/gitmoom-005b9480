import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const PLAN_LIMITS = {
  STARTER: {
    tokens: 2500,
    repos: 5,
    maxAccountsPerCPF: 5,
    priceMonthly: 0,
    priceYearly: 0,
  },
  PRO: {
    tokens: 7500,
    repos: 20,
    priceMonthly: 19.90,
    priceYearly: 199.00,
  },
  BUSINESS: {
    tokens: 15000,
    repos: 40,
    priceMonthly: 49.99,
    priceYearly: 499.00,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export const getPlans = createServerFn({ method: "GET" })
  .handler(async () => {
    return PLAN_LIMITS;
  });

export const getUserSubscription = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    
    if (!user) return null;

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions" as any)
      .select("*")
      .eq("user_id", user.id)
      .single() as any;

    return subscription || { tier: 'STARTER', status: 'active' };
  });
