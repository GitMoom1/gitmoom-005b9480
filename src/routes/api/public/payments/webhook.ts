import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function resolvePriceId(item: any): string | undefined {
  return (
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    item?.price?.id
  );
}

const PRICE_TIERS: Record<string, "PRO" | "BUSINESS"> = {
  gitmoon_pro_monthly: "PRO",
  gitmoon_pro_yearly: "PRO",
  gitmoon_business_monthly: "BUSINESS",
  gitmoon_business_yearly: "BUSINESS",
};

function resolveTier(priceId: string | undefined): "STARTER" | "PRO" | "BUSINESS" {
  return (priceId && PRICE_TIERS[priceId]) || "STARTER";
}

const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Aplica os limites do plano (tokens, repositórios, validade) para o usuário.
 * Upgrade vale imediatamente; cancelamento mantém acesso até o fim do ciclo.
 */
async function applyEntitlements(
  userId: string,
  tier: "STARTER" | "PRO" | "BUSINESS",
  periodEnd: string | null,
  reference: string,
) {
  const supabase = getSupabase() as any;
  const { error } = await supabase.rpc("apply_plan_entitlements", {
    _user_id: userId,
    _tier: tier,
    _period_end: periodEnd,
    _reference: reference,
  });
  if (error) console.error("apply_plan_entitlements failed", error);
}

async function findUserId(subscription: any): Promise<string | undefined> {
  if (subscription.metadata?.userId) return subscription.metadata.userId;
  const supabase = getSupabase() as any;
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  return data?.user_id;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const priceId = resolvePriceId(item);
  const tier = resolveTier(priceId);
  const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const supabase = getSupabase() as any;
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: item?.price?.product,
      price_id: priceId,
      plan_tier: tier,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEndIso,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (ENTITLED_STATUSES.has(subscription.status)) {
    await applyEntitlements(userId, tier, periodEndIso, subscription.id);
  }
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const priceId = resolvePriceId(item);
  const tier = resolveTier(priceId);
  const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const supabase = getSupabase() as any;
  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: item?.price?.product,
      price_id: priceId,
      plan_tier: tier,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEndIso,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  const userId = await findUserId(subscription);
  if (!userId) return;

  if (ENTITLED_STATUSES.has(subscription.status)) {
    // Upgrade/downgrade de preço e renovação: reaplica limites do plano atual.
    await applyEntitlements(userId, tier, periodEndIso, subscription.id);
  } else {
    await applyEntitlements(userId, "STARTER", null, subscription.id);
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const supabase = getSupabase() as any;
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  // Cancelamento efetivo (fim do ciclo já ocorreu): volta para Starter.
  const userId = await findUserId(subscription);
  if (userId) await applyEntitlements(userId, "STARTER", null, subscription.id);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") {
        console.log("Checkout fulfilled", session.id);
      }
      break;
    }
    case "checkout.session.async_payment_succeeded":
      console.log("Async payment succeeded", event.data.object?.id);
      break;
    case "checkout.session.async_payment_failed":
      console.log("Async payment failed", event.data.object?.id);
      break;
    case "invoice.paid":
      console.log("Invoice paid", event.data.object?.id);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid or missing env query parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
