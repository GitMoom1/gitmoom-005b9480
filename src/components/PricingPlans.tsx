import React from "react";
import { Check, ArrowRight, Star } from "lucide-react";
import { PlanTier } from "@/lib/plans.functions";

interface PricingPlan {
  name: string;
  tier: PlanTier;
  priceMonthly: string;
  priceYearly: string;
  period: string;
  desc: string;
  features: string[];
  priceId: string;
  priceIdYearly: string;
  cta: string;
  featured?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: "Starter",
    tier: "STARTER",
    priceMonthly: "R$ 0",
    priceYearly: "R$ 0",
    period: "/ forever",
    desc: "Para desenvolvedores solo e projetos pessoais.",
    features: [
      "2.500 tokens mensais",
      "Até 5 repositórios",
      "Limite de 5 contas por CPF",
      "Review IA básico",
    ],
    priceId: "free",
    priceIdYearly: "free",
    cta: "Começar grátis",
    featured: false,
  },
  {
    name: "Pro",
    tier: "PRO",
    priceMonthly: "R$ 19,90",
    priceYearly: "R$ 199,00",
    period: "/ mês",
    desc: "Para times em crescimento enviando código todo dia.",
    features: [
      "7.500 tokens mensais",
      "Até 20 repositórios",
      "Suporte prioritário",
      "Copilot Integration",
      "Review IA avançado",
    ],
    priceId: "gitmoon_pro_monthly",
    priceIdYearly: "gitmoon_pro_yearly",
    cta: "Assinar Pro",
    featured: true,
  },
  {
    name: "Business",
    tier: "BUSINESS",
    priceMonthly: "R$ 49,99",
    priceYearly: "R$ 499,00",
    period: "/ mês",
    desc: "Para profissionais e times que precisam de escala.",
    features: [
      "15.000 tokens mensais",
      "Até 40 repositórios",
      "Equipe de até 10 pessoas",
      "SSO & Segurança Avançada",
      "Exportação de dados",
    ],
    priceId: "gitmoon_business_monthly",
    priceIdYearly: "gitmoon_business_yearly",
    cta: "Assinar Business",
    featured: false,
  },
];

export function PricingPlans({ onSelectPlan, billingInterval = "MONTHLY" }: {
  onSelectPlan: (plan: PricingPlan & { selectedPriceId: string }) => void;
  billingInterval?: "MONTHLY" | "YEARLY";
}) {
  return (
    <div className="mt-16 grid gap-6 lg:grid-cols-3">
      {plans.map((p) => (
        <div
          key={p.name}
          className={`relative rounded-2xl p-8 transition flex flex-col ${
            p.featured
              ? "bg-gradient-cosmic text-primary-foreground shadow-glow"
              : "glass hover:-translate-y-1"
          }`}
        >
          {p.featured && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground">
              Mais popular
            </div>
          )}
          <h3 className="text-xl font-semibold">{p.name}</h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-bold">
              {billingInterval === "MONTHLY" ? p.priceMonthly : p.priceYearly}
            </span>
            <span className={p.featured ? "text-primary-foreground/80" : "text-muted-foreground"}>
              {billingInterval === "MONTHLY" ? "/ mês" : "/ ano"}
            </span>
          </div>
          <p className={`mt-2 text-sm ${p.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {p.desc}
          </p>
          <ul className="mt-6 space-y-3 text-sm flex-1">
            {p.features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              onSelectPlan({
                ...p,
                selectedPriceId: billingInterval === "MONTHLY" ? p.priceId : p.priceIdYearly,
              })
            }
            className={`mt-8 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-medium transition ${
              p.featured
                ? "bg-background text-foreground hover:bg-background/90"
                : "bg-gradient-cosmic text-primary-foreground hover:opacity-90"
            }`}
          >
            {p.cta} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
