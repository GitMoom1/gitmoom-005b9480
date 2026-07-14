import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import logo from "@/assets/gitmoon-logo.png";
import hero from "@/assets/gitmoon-hero.jpg";
import { useTheme } from "@/lib/theme";
import { track } from "@/lib/analytics";
import { captureLead } from "@/lib/leads.functions";
import { z } from "zod";

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
    name: "Orbit",
    price: "$0",
    period: "/ forever",
    desc: "For solo developers and personal projects.",
    features: ["1 user", "Public repos only", "Basic AI review", "Community support"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Eclipse",
    price: "$19",
    period: "/ user / mo",
    desc: "For growing teams shipping every day.",
    features: [
      "Unlimited repos",
      "Advanced AI review",
      "Merge queue",
      "Policy engine",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Galaxy",
    price: "Custom",
    period: "",
    desc: "For enterprises with security and scale requirements.",
    features: [
      "SSO & SCIM",
      "Self-hosted runners",
      "Audit logs",
      "Dedicated SLA",
      "Solution architect",
    ],
    cta: "Talk to sales",
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

  useEffect(() => {
    mountedAtRef.current = Date.now();
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
      {/* Nav */}
      <header className="sticky top-0 z-50 glass">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2">
            <Moon className="h-7 w-7 text-primary" strokeWidth={1.8} />
            <span className="text-lg font-semibold tracking-tight">GitMoon</span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">Features</a>
            <a href="#how" className="transition hover:text-foreground">How it works</a>
            <a href="#pricing" className="transition hover:text-foreground">Pricing</a>
            <a href="#faq" className="transition hover:text-foreground">FAQ</a>
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
            <a href="#" className="hidden text-sm text-muted-foreground transition hover:text-foreground sm:inline">
              Sign in
            </a>
            <a
              href="#cta"
              onClick={() => onCtaClick("nav_get_started")}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-cosmic px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </a>
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

      {/* Logos */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Trusted by teams shipping at scale
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-lg font-semibold text-muted-foreground/70">
            <span>◐ Lunar Labs</span>
            <span>✦ Nebula</span>
            <span>◇ Orbital</span>
            <span>△ Stellar</span>
            <span>◎ Cosmos</span>
            <span>✺ Helios</span>
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
            From solo hackers to Fortune 500. Free for open source, forever.
          </p>
        </div>
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl p-8 transition ${
                p.featured
                  ? "bg-gradient-cosmic text-primary-foreground shadow-glow"
                  : "glass hover:-translate-y-1"
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground">
                  Most popular
                </div>
              )}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className={p.featured ? "text-primary-foreground/80" : "text-muted-foreground"}>
                  {p.period}
                </span>
              </div>
              <p className={`mt-2 text-sm ${p.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {p.desc}
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#cta"
                className={`mt-8 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-medium transition ${
                  p.featured
                    ? "bg-background text-foreground hover:bg-background/90"
                    : "bg-gradient-cosmic text-primary-foreground hover:opacity-90"
                }`}
              >
                {p.cta} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="mx-auto mb-6 flex justify-center gap-1 text-accent">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-current" />
            ))}
          </div>
          <blockquote className="text-2xl font-medium leading-relaxed tracking-tight md:text-3xl">
            “We cut our PR cycle time from 3 days to 4 hours. GitMoon paid for itself in the first
            week — and our engineers actually want to use it.”
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <div className="h-10 w-10 rounded-full bg-gradient-cosmic" />
            <div className="text-left">
              <div className="font-semibold text-foreground">Ava Chen</div>
              <div>VP Engineering · Lunar Labs</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="relative overflow-hidden rounded-3xl glass p-12 text-center shadow-soft md:p-20">
          <div className="absolute inset-0 bg-gradient-aurora opacity-60" />
          <Moon className="relative mx-auto h-12 w-12 text-primary animate-float" />
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

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
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
