"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useToken } from "@/lib/useToken";
import { toast } from "@/components/Toast";

interface UpgradeModalProps {
  requiredPlan: "pro" | "business";
  featureName: string;
  onClose: () => void;
}

const PLAN_DETAILS = {
  pro: {
    name: "Pro",
    price: "$12/user/mo",
    color: "bg-primary text-white",
    features: ["Unlimited members", "Unlimited projects", "Sprints & roadmap", "Custom fields", "CSV export", "Docs & wiki"],
  },
  business: {
    name: "Business",
    price: "$25/user/mo",
    color: "bg-secondary text-white",
    features: ["Everything in Pro", "AI digest & suggestions", "GitHub & Slack integrations", "Audit logs", "Priority support"],
  },
};

export default function UpgradeModal({ requiredPlan, featureName, onClose }: UpgradeModalProps) {
  const token = useToken();
  const [loading, setLoading] = useState(false);
  const plan = PLAN_DETAILS[requiredPlan];

  async function handleUpgrade() {
    if (!token) return;
    setLoading(true);
    try {
      const { url } = await api.billing.checkout(token, requiredPlan);
      if (url) window.location.href = url;
    } catch {
      toast("Failed to start checkout — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 ${plan.color}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              <span className="font-black text-lg tracking-tight">{plan.name} Plan</span>
            </div>
            <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
          <p className="text-sm opacity-80 mt-1">{plan.price}</p>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-on-surface mb-4">
            <span className="font-bold">{featureName}</span> requires the{" "}
            <span className="font-bold">{plan.name}</span> plan. Upgrade to unlock:
          </p>

          <ul className="space-y-2 mb-6">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {f}
              </li>
            ))}
          </ul>

          <div className="flex gap-3">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Redirecting…" : `Upgrade to ${plan.name}`}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-xl transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
