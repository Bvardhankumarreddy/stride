"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToken } from "@/lib/useToken";

export default function ChangePasswordPage() {
  const { data: session, update } = useSession();
  const token = useToken();
  const router = useRouter();
  const user = session?.user as any;
  const isForced = user?.mustChangePassword ?? false;

  const [current, setCurrent]       = useState("");
  const [next, setNext]             = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]     = useState(false);
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (next.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setError("Passwords do not match."); return; }
    if (next === current) { setError("New password must be different from current password."); return; }

    setSaving(true);
    try {
      await api.auth.changePassword(token!, { currentPassword: current, newPassword: next });

      await update({ mustChangePassword: false });

      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl cta-gradient flex items-center justify-center text-white shadow-lg shadow-primary/25 mb-4">
            <span className="material-symbols-outlined" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-on-surface">
            {isForced ? "Set your password" : "Change password"}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 text-center max-w-xs">
            {isForced
              ? "For your security, please set a new password before continuing."
              : "Choose a strong password. It will expire in 90 days."}
          </p>
        </div>

        {isForced && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 18 }}>warning</span>
            Password change required to continue.
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Current password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 pr-11 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-on-surface"
                  placeholder="Your current password"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showCurrent ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNext ? "text" : "password"}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 pr-11 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-on-surface"
                  placeholder="Min. 8 characters"
                />
                <button type="button" onClick={() => setShowNext(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showNext ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {/* Strength hint */}
              {next.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {[8, 12, 16].map((len) => (
                    <div key={len} className={`h-1 flex-1 rounded-full transition-colors ${next.length >= len ? "bg-primary" : "bg-surface-container-high"}`} />
                  ))}
                  <span className="text-[10px] text-on-surface-variant ml-1">
                    {next.length < 8 ? "Too short" : next.length < 12 ? "Good" : next.length < 16 ? "Strong" : "Very strong"}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-on-surface"
                placeholder="Repeat new password"
              />
              {confirm.length > 0 && next !== confirm && (
                <p className="text-[11px] text-red-500">Passwords do not match</p>
              )}
            </div>

            {error && (
              <p className="text-xs font-medium text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving || !current || !next || !confirm}
              className="w-full py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-primary/20 mt-2"
            >
              {saving ? "Saving…" : "Set new password →"}
            </button>
          </form>

          {!isForced && (
            <button onClick={() => router.back()}
              className="w-full mt-3 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
              Cancel
            </button>
          )}
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-5">
          Passwords expire every <strong>90 days</strong>.
        </p>
      </div>
    </div>
  );
}
