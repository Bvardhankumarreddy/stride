import { auth } from "@/lib/auth";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Stride",
  description: "Simple, transparent pricing for teams of all sizes. Start free, upgrade when you grow.",
  alternates: { canonical: "/pricing" },
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    desc: "For small teams getting started",
    features: [
      "Up to 5 members",
      "1 project",
      "100 issues",
      "Board & list views",
      "Basic notifications",
    ],
    cta: "Get started free",
    href: "/onboarding",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/user/mo",
    desc: "For growing teams that need more",
    features: [
      "Unlimited members",
      "Unlimited projects",
      "Sprints & roadmap",
      "Custom fields",
      "CSV export",
      "Docs & wiki",
    ],
    cta: "Start Pro trial",
    href: "/onboarding",
    highlight: true,
  },
  {
    name: "Business",
    price: "$25",
    period: "/user/mo",
    desc: "For scaling orgs with advanced needs",
    features: [
      "Everything in Pro",
      "AI digest & suggestions",
      "GitHub & Slack integrations",
      "Audit logs",
      "Priority support",
    ],
    cta: "Start Business trial",
    href: "/onboarding",
    highlight: false,
  },
];

const FAQ = [
  {
    q: "Can I switch plans later?",
    a: "Yes — upgrade or downgrade at any time. Changes take effect immediately and are prorated.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "Pro and Business plans include a 14-day free trial. No credit card required to start.",
  },
  {
    q: "What counts as a 'member'?",
    a: "A member is any user who has been invited to your workspace, regardless of their role.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes — pay annually and get 2 months free (20% off). Switch at any time in billing settings.",
  },
  {
    q: "What happens when I hit the Free plan limits?",
    a: "You'll be prompted to upgrade. Existing data is never deleted — just upgrade to regain full access.",
  },
];

export default async function PricingPage() {
  const session = await auth();
  const isSignedIn = !!session?.user;

  return (
    <div className="bg-background min-h-dvh">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg cta-gradient flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <span className="text-xl font-black tracking-tighter text-on-surface">Stride</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/#features" className="text-on-surface-variant hover:text-on-surface transition-colors hidden md:block">Features</Link>
            {isSignedIn ? (
              <Link href="/dashboard" className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm shadow-primary/20">
                Go to app
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-on-surface-variant hover:text-on-surface transition-colors">Sign in</Link>
                <Link href="/onboarding" className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm shadow-primary/20">
                  Get started free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="pt-28 pb-24 px-6">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-on-surface-variant">
            Start free — upgrade when your team grows. No hidden fees, no lock-in.
          </p>
        </div>

        {/* Plan cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border overflow-hidden flex flex-col ${
                plan.highlight
                  ? "bg-primary text-white border-primary shadow-2xl shadow-primary/30 md:scale-105"
                  : "bg-white border-outline-variant/15 shadow-sm"
              }`}
            >
              <div className="px-6 pt-6 pb-4">
                <p className={`text-xs font-black uppercase tracking-widest mb-1 ${plan.highlight ? "text-white/70" : "text-outline"}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className={`text-4xl font-black tracking-tight ${plan.highlight ? "text-white" : "text-on-surface"}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.highlight ? "text-white/60" : "text-outline"}`}>{plan.period}</span>
                  )}
                </div>
                <p className={`text-xs ${plan.highlight ? "text-white/70" : "text-outline"}`}>{plan.desc}</p>
              </div>

              <div className="px-6 pb-6 flex-1 flex flex-col">
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-white/90" : "text-on-surface-variant"}`}>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 16, fontVariationSettings: "'FILL' 1", color: plan.highlight ? "rgba(255,255,255,0.8)" : "var(--color-primary)" }}
                      >
                        check_circle
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={isSignedIn ? "/settings?tab=billing" : plan.href}
                  className={`block text-center py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                    plan.highlight
                      ? "bg-white text-primary hover:bg-white/90 shadow-lg"
                      : "border border-outline-variant/30 text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight text-on-surface text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-white rounded-2xl p-5 border border-outline-variant/15 shadow-sm">
                <p className="font-bold text-sm text-on-surface mb-2">{item.q}</p>
                <p className="text-sm text-on-surface-variant leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/10 py-8 px-6 text-center text-sm text-outline">
        <p>© {new Date().getFullYear()} Stride. All rights reserved.</p>
      </footer>
    </div>
  );
}
