import { createFileRoute, Link } from "@tanstack/react-router";





import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GitBranch,
  GitPullRequest,
  Moon,
  Sun,
  Sparkles,
  Shield,
  Zap,
  Bot,
  GitMerge,
  Rocket,
  Check,
  ArrowRight,
  Star,
  Github,
  LayoutDashboard,
  Users
} from "lucide-react";
import logoAsset from "@/assets/gitmoon-logo-new.webp.asset.json";
const logo = logoAsset.url;
import hero from "@/assets/gitmoon-hero.jpg";
import { useTheme } from "@/lib/theme";
import { track } from "@/lib/analytics";
import { captureLead } from "@/lib/leads.functions";
import { z } from "zod";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { supabase } from "@/integrations/supabase/client";
import { PricingPlans } from "@/components/PricingPlans";


const emailSchema = z.string().trim().toLowerCase().email().max(320);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GitMoon — Ship code at the speed of light" },
      {
        name: "description",
        content:
          "AI-powered git workflow that automates reviews, merges, and releases for modern engineering teams.",
      },
      { property: "og:title", content: "GitMoon — Ship code at the speed of light" },
      {
        property: "og:description",
        content: "AI-powered git workflow that automates reviews, merges, and releases.",
      },
      { property: "og:url", content: "https://gitmoom.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://gitmoom.lovable.app/" }],
  }),
  component: Index,
});

const features = [
  {
    icon: Bot,
    title: "AI Code Review",
    desc: "Catch bugs, smells, and security issues before they ever reach main.",
  },
  {
    icon: GitMerge,
    title: "Auto-merge Queue",
    desc: "A serialized merge queue that keeps your main branch green forever.",
  },
  {
    icon: Rocket,
    title: "One-click Releases",
    desc: "Generate changelogs, tag versions, and deploy with a single command.",
  },
  {
    icon: Shield,
    title: "Policy Engine",
    desc: "Codify your branching, review, and compliance rules as policy-as-code.",
  },
  {
    icon: Zap,
    title: "10× Faster CI",
    desc: "Smart test selection runs only what changed — and parallelizes the rest.",
  },
  {
    icon: GitPullRequest,
    title: "PR Insights",
    desc: "Real-time metrics on cycle time, review latency, and team velocity.",
  },
];

const plans = [
  {
    name: "Orbit (Free)",
    price: "R$ 0",
    period: "/ forever",
    desc: "Para desenvolvedores solo e projetos pessoais.",
    features: [
      "2.500 tokens",
      "Até 5 repositórios",
      "Limite de 5 contas por CPF",
      "Review IA básico",
    ],
    priceId: "free",
    cta: "Começar grátis",
    featured: false,
  },
  {
    name: "Eclipse (Básico)",
    price: "R$ 19,90",
    period: "/ mês",
    desc: "Para times em crescimento enviando código todo dia.",
    features: [
      "7.500 tokens",
      "Até 20 repositórios",
      "Suporte básico",
      "Histórico de 30 dias",
      "Review IA avançado",
    ],
    priceId: "gitmoon_basic_monthly",
    cta: "Assinar Básico",
    featured: true,
  },
  {
    name: "Galaxy (Pro)",
    price: "R$ 49,99",
    period: "/ mês",
    desc: "Para profissionais e times que precisam de escala.",
    features: [
      "15.000 tokens",
      "Até 40 repositórios",
      "Suporte prioritário",
      "Histórico ilimitado",
      "Exportação de dados",
    ],
    priceId: "gitmoon_pro_monthly",
    cta: "Assinar Pro",
    featured: false,
  },
  {
    name: "Supernova (Enterprise)",
    price: "R$ 79,00",
    period: "/ mês",
    desc: "Para empresas com requisitos de segurança e escala.",
    features: [
      "30.000 tokens",
      "Até 100 repositórios",
      "API dedicada",
      "SSO & Múltiplos usuários",
      "Relatórios avançados",
    ],
    priceId: "gitmoon_enterprise_monthly",
    cta: "Assinar Enterprise",
    featured: false,
  },
];

function Index() {
  const { theme, toggle } = useTheme();
  const capture = useServerFn(captureLead);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const mountedAtRef = useRef<number>(Date.now());
  const [leadStatus, setLeadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { openCheckout, checkoutElement } = useStripeCheckout();
  const [user, setUser] = useState<any>(null);
  const [billingInterval, setBillingInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");


  useEffect(() => {
    mountedAtRef.current = Date.now();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const validEmail = emailSchema.safeParse(email).success;

  const onLeadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);
    setLeadStatus("loading");
    setErrorMsg(null);
    track("lead_submit_attempt", { source: "hero_cta_form" });
    try {
      const res = await capture({
        data: {
          email: parsed.data,
          source: "landing_cta",
          website,
          elapsedMs: Date.now() - mountedAtRef.current,
        },
      });
      if (res.ok) {
        setLeadStatus("success");
        track("lead_submit_success", { source: "hero_cta_form" });
        setEmail("");
      } else {
        setLeadStatus("error");
        const msg =
          res.error === "rate_limited"
            ? "Too many submissions. Please wait a few seconds and try again."
            : res.error === "spam_detected" || res.error === "too_fast"
              ? "Submission blocked. Please try again."
              : "Something went wrong. Please try again.";
        setErrorMsg(msg);
        track("lead_submit_error", { source: "hero_cta_form", reason: res.error });
      }
    } catch (err) {
      console.error(err);
      setLeadStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
      track("lead_submit_error", { source: "hero_cta_form" });
    }
  };

  const onThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    track("theme_toggle", { to: next });
    toggle();
  };

  const onCtaClick = (id: string) => track("cta_click", { id });

  return (
    <div className="min-h-screen text-foreground">
      <PaymentTestModeBanner />
      {/* Nav */}
      <header className="sticky top-0 z-50 glass">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-white/95 p-1 rounded-lg shadow-sm border border-white/20 backdrop-blur-sm">
              <img src={logo} alt="GitMoon" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-lg font-semibold tracking-tight">GitMoon</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#pricing" className="transition hover:text-foreground">Pricing</a>
            <a href="#roadmap" className="transition hover:text-foreground">Roadmap</a>
            {user && (
              <>
                <Link to="/dashboard" className="transition hover:text-foreground flex items-center gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </Link>
                <Link to="/admin/organizations" className="transition hover:text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Organizations
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onThemeToggle}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full glass text-foreground transition hover:opacity-80"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-cosmic px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                My Account <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/auth" className="hidden text-sm text-muted-foreground transition hover:text-foreground sm:inline">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  onClick={() => onCtaClick("nav_get_started")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-cosmic px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
                >
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={hero}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        <div className="relative mx-auto max-w-5xl px-6 pb-32 pt-28 text-center md:pt-40">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 glass px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            New — GitMoon Agents now in public beta
          </div>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Ship code at the
            <br />
            <span className="text-gradient">speed of light.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            GitMoon is the AI-powered git workflow that reviews, merges, and releases your code
            automatically — so your team can focus on building.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#cta"
              onClick={() => onCtaClick("hero_start_free")}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-cosmic px-6 py-3 text-base font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how"
              onClick={() => onCtaClick("hero_github")}
              className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-base font-medium text-foreground transition hover:bg-white/10"
            >
              <Github className="h-4 w-4" /> View on GitHub
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Free for open source · No credit card required · 14-day Pro trial
          </p>
        </div>
      </section>

      {/* Plataforma */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Uma plataforma Git completa, do commit ao deploy
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-lg font-semibold text-muted-foreground/70">
            <span>Git Core</span>
            <span>GitMoonAgent (IA)</span>
            <span>GitMoon Action (CI/CD)</span>
            <span>Secrets &amp; SSH/GPG</span>
            <span>Organizações</span>
            <span>API &amp; Webhooks</span>
          </div>
        </div>
      </section>


      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Your git workflow,{" "}
            <span className="text-gradient">on autopilot.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Six superpowers that turn your repository into a self-driving codebase.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group glass rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-cosmic text-primary-foreground shadow-glow">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative border-t border-border/40 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Three steps to a quieter inbox.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Connect once. GitMoon handles the rest — no YAML wizardry, no plugin zoo.
              </p>
              <ol className="mt-10 space-y-6">
                {[
                  { n: "01", t: "Connect your repo", d: "GitHub, GitLab, or Bitbucket — installed in 60 seconds." },
                  { n: "02", t: "Set your policies", d: "Reviews, merges, releases — described in plain English." },
                  { n: "03", t: "Let the moon work", d: "Sit back as GitMoon reviews, merges, and ships for you." },
                ].map((s) => (
                  <li key={s.n} className="flex gap-5">
                    <div className="text-gradient text-2xl font-bold">{s.n}</div>
                    <div>
                      <h3 className="font-semibold">{s.t}</h3>
                      <p className="text-sm text-muted-foreground">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="glass rounded-2xl p-6 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/70" />
                <div className="h-3 w-3 rounded-full bg-accent/70" />
                <div className="h-3 w-3 rounded-full bg-secondary/70" />
                <span className="ml-3 text-xs text-muted-foreground">gitmoon.yml</span>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-background/60 p-4 text-xs leading-relaxed">
                <code className="text-muted-foreground">
{`# Plain-English policies
on: pull_request

review:
  ai: deep
  require: 1 human approval

merge:
  strategy: squash
  queue: true
  block_if: tests_failing

release:
  cadence: on_main
  changelog: ai`}
                </code>
              </pre>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" /> main
                </span>
                <span className="inline-flex items-center gap-1.5 text-secondary">
                  <Check className="h-3.5 w-3.5" /> Auto-merged in 2m 14s
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Pricing that <span className="text-gradient">scales with you.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From solo hackers to professional teams. Choose the plan that fits your needs.
          </p>
          
          <div className="mt-8 flex justify-center gap-4">
            <button 
              onClick={() => setBillingInterval("MONTHLY")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${billingInterval === "MONTHLY" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Mensal
            </button>
            <button 
              onClick={() => setBillingInterval("YEARLY")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${billingInterval === "YEARLY" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Anual (Save 20%)
            </button>
          </div>
        </div>

        <PricingPlans 
          billingInterval={billingInterval}
          onSelectPlan={(p) => {
            if (p.selectedPriceId === "free") {
              window.location.hash = "cta";
            } else {
              openCheckout({
                priceId: p.selectedPriceId,
                quantity: 1,
                customerEmail: user?.email,
                userId: user?.id,
                returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
              });
            }
          }} 
        />
        {checkoutElement}
      </section>


      {/* Como funciona */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Do push ao deploy sem sair do GitMoon
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cada commit no Git Core pode acionar o GitMoonAgent para code review, auto-fix, refactor
            e documentação — e o GitMoon Action leva o resultado até produção.
          </p>
        </div>
      </section>


      {/* CTA */}
      <section id="cta" className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="relative overflow-hidden rounded-3xl glass p-12 text-center shadow-soft md:p-20">
          <div className="absolute inset-0 bg-gradient-aurora opacity-60" />
          <div className="bg-white/95 p-3 rounded-2xl w-fit mx-auto relative mb-6 shadow-glow border border-white/20 backdrop-blur-sm">
            <img src={logo} alt="GitMoon" className="h-16 w-16 animate-float object-contain" />
          </div>
          <h2 className="relative mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
            Ready to <span className="text-gradient">launch?</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Join 4,000+ teams shipping faster with GitMoon. Set up in under a minute.
          </p>
          <form
            className="relative mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={onLeadSubmit}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={leadStatus === "loading"}
              placeholder="you@company.com"
              className="flex-1 rounded-full border border-border bg-background/60 px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {/* Honeypot — hidden from real users, tempting to bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="absolute left-[-9999px] top-[-9999px] h-0 w-0 opacity-0"
              aria-hidden="true"
            />
            <button
              type="submit"
              disabled={leadStatus === "loading" || !validEmail}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-cosmic px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              {leadStatus === "loading" ? "Sending…" : "Get started"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          {emailError && (
            <p className="relative mt-2 text-sm text-destructive">{emailError}</p>
          )}
          {leadStatus === "success" && (
            <p className="relative mt-4 text-sm text-secondary">Thanks — we'll be in touch shortly.</p>
          )}
          {leadStatus === "error" && (
            <p className="relative mt-4 text-sm text-destructive">{errorMsg ?? "Something went wrong. Please try again."}</p>
          )}
        </div>
      </section>

      {/* Roadmap / Architecture Section */}
      <section id="roadmap" className="mx-auto max-w-7xl px-6 py-24 md:py-32 border-t border-border/40">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl text-center mb-16">
            Technical <span className="text-gradient">Roadmap.</span>
          </h2>
          
          <div className="space-y-16">
            <div className="glass rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-gradient-cosmic flex items-center justify-center text-primary-foreground">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">DeepSeek AI Agent</h3>
                  <p className="text-muted-foreground">Autonomous Software Engineer Integration</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground uppercase tracking-wider">Capabilities</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      Continuous vulnerability scanning
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      Root cause analysis for pipeline failures
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      Automated `ai-fix/*` branch generation
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      Real-time interactive approval flow
                    </li>
                  </ul>
                </div>
                <div className="bg-background/40 rounded-xl p-6 font-mono text-[10px] leading-tight">
                  <div className="text-muted-foreground mb-2"># Scan Frequency by Plan</div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-primary">Free:</span> <span>Every 6 hours</span>
                    <span className="text-primary">Basic:</span> <span>Every 2 hours</span>
                    <span className="text-primary">Pro:</span> <span>Every 30 mins</span>
                    <span className="text-primary">Enterprise:</span> <span>Real-time</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-gradient-cosmic flex items-center justify-center text-primary-foreground">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">Distributed CI/CD</h3>
                  <p className="text-muted-foreground">High-performance Pipeline Infrastructure</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground uppercase tracking-wider">Architecture</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      High-performance Go-based runners
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      Redis-backed intelligent job queuing
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      Automatic runner scaling on K8s
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      Real-time log streaming via WebSockets
                    </li>
                  </ul>
                </div>
                <div className="bg-background/40 rounded-xl p-6 font-mono text-[10px] leading-tight overflow-hidden">
                  <div className="text-secondary mb-2">CREATE TABLE runners (</div>
                  <div className="pl-4 space-y-1">
                    <div>id UUID PRIMARY KEY,</div>
                    <div>name VARCHAR(255),</div>
                    <div>type CHECK (type IN ('shared','private')),</div>
                    <div>status DEFAULT 'offline',</div>
                    <div>last_heartbeat_at TIMESTAMP</div>
                  </div>
                  <div className="text-secondary mt-1">);</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="bg-white/95 p-1 rounded-md shadow-sm border border-white/20 backdrop-blur-sm">
                <img src={logo} alt="GitMoon" className="h-6 w-6 object-contain" />
              </div>
              <span className="font-semibold">GitMoon</span>
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="#" className="transition hover:text-foreground">Privacy</a>
              <a href="#" className="transition hover:text-foreground">Terms</a>
              <a href="#" className="transition hover:text-foreground">Docs</a>
              <a href="#" className="transition hover:text-foreground">Changelog</a>
              <a href="#" className="transition hover:text-foreground">Status</a>
            </div>
          </div>
        </div>
      </footer>
      {/* Hidden imports to satisfy linter for unused assets */}
      <img src={logo} alt="" aria-hidden="true" className="hidden" />
    </div>
  );
}

