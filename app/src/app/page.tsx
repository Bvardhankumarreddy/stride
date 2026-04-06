import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Stride — AI-Native Project Management Tool",
  description:
    "Stride combines AI-powered issue tracking, sprint planning, kanban boards, and team docs in one workspace. The smarter, faster alternative to Jira and Confluence.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: "auto_awesome",
    title: "AI at the core",
    desc: "Auto-label issues, generate acceptance criteria, summarize threads, and get daily digests — all powered by AI.",
  },
  {
    icon: "view_kanban",
    title: "Board, List & Timeline",
    desc: "Switch between kanban, spreadsheet-style list, and roadmap timeline views without leaving your flow.",
  },
  {
    icon: "sprint",
    title: "Sprint planning",
    desc: "Plan sprints with velocity tracking, capacity planning, and one-click start/complete.",
  },
  {
    icon: "article",
    title: "Team wiki & docs",
    desc: "Write specs, runbooks, and meeting notes in a collaborative editor — linked directly to issues.",
  },
  {
    icon: "notifications",
    title: "Smart notifications",
    desc: "Get notified on assignments, mentions, and comments. AI digests surface what actually matters.",
  },
  {
    icon: "hub",
    title: "Integrations",
    desc: "Connect GitHub, Slack, Figma, and Linear. Sync PRs and surface context where you work.",
  },
];

const TESTIMONIALS = [
  {
    quote: "Stride replaced Jira, Notion, and half our Slack usage. The AI digest alone saves me an hour every morning.",
    name: "Sarah K.",
    role: "Engineering Manager",
  },
  {
    quote: "Finally a project tool that doesn't feel like it was built in 2010. Fast, clean, and the AI actually helps.",
    name: "Marcus T.",
    role: "CTO, Series A startup",
  },
  {
    quote: "We moved our entire sprint workflow to Stride in a weekend. The kanban + docs combo is unmatched.",
    name: "Priya R.",
    role: "Product Lead",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="bg-background min-h-dvh">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg cta-gradient flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <span className="text-xl font-black tracking-tighter text-on-surface">Stride</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-on-surface-variant">
            <a href="#features" className="hover:text-on-surface transition-colors">Features</a>
            <a href="#pricing" className="hover:text-on-surface transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-on-surface transition-colors">Contact</a>
            <Link href="/login" className="hover:text-on-surface transition-colors">Sign in</Link>
            <Link href="/login" className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm shadow-primary/20">
              Get started free
            </Link>
          </nav>
          <Link href="/login" className="md:hidden px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm">
            Get started
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide uppercase mb-8 border border-primary/20">
            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            AI-native project management
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-on-surface leading-[1.05] mb-6">
            Ship faster with<br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">AI in your workflow</span>
          </h1>

          <p className="text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
            Stride combines issue tracking, sprint planning, team docs, and AI — in one fast workspace. The smarter alternative to Jira and Confluence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-8 py-3.5 bg-primary text-white font-bold rounded-2xl text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
            >
              Start for free
            </Link>
            <a
              href="#contact"
              className="px-8 py-3.5 border border-outline-variant/30 text-on-surface font-semibold rounded-2xl text-base hover:bg-surface-container-low transition-colors"
            >
              Talk to sales
            </a>
          </div>

          <p className="text-xs text-outline mt-4">No credit card required · Free plan available</p>
        </section>

        {/* Features */}
        <section id="features" className="py-20 px-6 bg-surface-container-lowest">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-on-surface mb-4">
                Everything your team needs
              </h2>
              <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
                Built for modern engineering teams who move fast and hate context-switching.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="p-6 bg-white rounded-2xl border border-outline-variant/15 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  </div>
                  <h3 className="font-bold text-on-surface mb-2">{f.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black tracking-tighter text-on-surface text-center mb-12">
              Loved by engineering teams
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/15">
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="font-bold text-sm text-on-surface">{t.name}</p>
                    <p className="text-xs text-outline">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 px-6 bg-surface-container-lowest">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-on-surface mb-4">Simple pricing</h2>
            <p className="text-on-surface-variant mb-12">Start free, upgrade when your team grows.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {[
                {
                  name: "Free",
                  price: "$0",
                  desc: "For small teams getting started",
                  features: ["Up to 5 members", "1 project", "100 issues", "Board & list views", "Basic notifications"],
                  cta: "Get started",
                  href: "/login",
                  highlight: false,
                },
                {
                  name: "Pro",
                  price: "$12",
                  desc: "Per user/month for growing teams",
                  features: ["Unlimited members", "Unlimited projects", "Sprints & roadmap", "Custom fields", "CSV export", "Docs & wiki"],
                  cta: "Contact us",
                  href: "#contact",
                  highlight: true,
                },
                {
                  name: "Business",
                  price: "$25",
                  desc: "Per user/month for scaling orgs",
                  features: ["Everything in Pro", "AI digest & suggestions", "GitHub & Slack integrations", "Audit logs", "Priority support"],
                  cta: "Contact us",
                  href: "#contact",
                  highlight: false,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`p-6 rounded-2xl border ${plan.highlight ? "bg-primary text-white border-primary shadow-xl shadow-primary/25 scale-105" : "bg-white border-outline-variant/15"}`}
                >
                  <p className={`text-xs font-black uppercase tracking-widest mb-1 ${plan.highlight ? "text-white/70" : "text-outline"}`}>{plan.name}</p>
                  <p className={`text-3xl font-black tracking-tight mb-1 ${plan.highlight ? "text-white" : "text-on-surface"}`}>{plan.price}</p>
                  <p className={`text-xs mb-6 ${plan.highlight ? "text-white/70" : "text-outline"}`}>{plan.desc}</p>
                  <ul className="space-y-2 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-white/90" : "text-on-surface-variant"}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={plan.href}
                    className={`block text-center py-2.5 rounded-xl text-sm font-bold transition-all ${plan.highlight ? "bg-white text-primary hover:bg-white/90" : "border border-outline-variant/30 text-on-surface hover:bg-surface-container-low"}`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-black tracking-tighter text-on-surface mb-4">
              Ready to ship faster?
            </h2>
            <p className="text-on-surface-variant mb-8">
              Join teams who replaced Jira with something that actually works with them.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex px-8 py-3.5 bg-primary text-white font-bold rounded-2xl text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
              >
                Get started free
              </Link>
              <a
                href="#contact"
                className="inline-flex px-8 py-3.5 border border-outline-variant/30 text-on-surface font-semibold rounded-2xl text-base hover:bg-surface-container-low transition-colors"
              >
                Talk to sales
              </a>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-20 px-6 bg-surface-container-lowest">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              {/* Left — copy */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide uppercase mb-6 border border-primary/20">
                  <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>mail</span>
                  Get in touch
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-on-surface mb-4">
                  Let's find the right plan for your team
                </h2>
                <p className="text-on-surface-variant leading-relaxed mb-8">
                  Whether you're evaluating Pro, scaling to Business, or need a custom enterprise arrangement — our team will help you get set up fast.
                </p>
                <ul className="space-y-4">
                  {[
                    { icon: "bolt",          text: "Onboarding & migration support" },
                    { icon: "group",          text: "Volume discounts for large teams" },
                    { icon: "security",       text: "SSO, audit logs & compliance needs" },
                    { icon: "support_agent",  text: "Dedicated account manager on Business" },
                  ].map(item => (
                    <li key={item.icon} className="flex items-center gap-3 text-sm text-on-surface-variant">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                      </div>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right — form */}
              <div className="bg-white rounded-2xl border border-outline-variant/15 p-8 shadow-sm">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-outline">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md cta-gradient flex items-center justify-center text-white">
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <span className="font-black tracking-tighter text-on-surface">Stride</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-on-surface transition-colors">Features</a>
            <a href="#pricing" className="hover:text-on-surface transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-on-surface transition-colors">Contact</a>
            <Link href="/login" className="hover:text-on-surface transition-colors">Sign in</Link>
          </div>
          <p>© {new Date().getFullYear()} Stride. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
