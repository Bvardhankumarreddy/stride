"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Something went wrong. Please try emailing us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h3 className="text-2xl font-black tracking-tighter text-on-surface mb-2">We'll be in touch!</h3>
        <p className="text-on-surface-variant max-w-sm">
          Thanks for reaching out. Our team usually replies within one business day.
        </p>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-outline-variant/25 bg-white text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 placeholder:text-outline transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Name *</label>
          <input
            required
            type="text"
            placeholder="Jane Smith"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Work email *</label>
          <input
            required
            type="email"
            placeholder="jane@company.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Company</label>
        <input
          type="text"
          placeholder="Acme Inc."
          value={form.company}
          onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Message *</label>
        <textarea
          required
          rows={4}
          placeholder="Tell us about your team and what you're looking for…"
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          className={inputCls + " resize-none"}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-primary text-white font-bold rounded-2xl text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send message"}
      </button>

      <p className="text-center text-xs text-outline">
        We typically reply within 1 business day.
      </p>
    </form>
  );
}
