"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToken } from "@/lib/useToken";
import { api } from "@/lib/api";
import { useSession } from "next-auth/react";

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 48);
}

export default function OnboardingPage() {
  const router = useRouter();
  const token = useToken();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [step, setStep] = useState<"workspace" | "invite" | "done">("workspace");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [orgId, setOrgId] = useState<string | null>((user as any)?.organizationId ?? null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(val: string) {
    setOrgName(val);
    if (!slugEdited) setOrgSlug(slugify(val));
  }

  async function createWorkspace() {
    if (!token || !orgName.trim() || !orgSlug.trim()) return;
    setCreating(true);
    setError("");
    try {
      const org = await api.organizations.create(token, { name: orgName.trim(), slug: orgSlug.trim() });
      setOrgId(org.id);
      setStep("invite");
    } catch (e: any) {
      setError(e.message ?? "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  }

  async function addInvite() {
    if (!inviteEmail.trim() || !token || !orgId) return;
    setSending(true);
    setError("");
    try {
      await api.organizations.invite(token, orgId, { email: inviteEmail.trim(), role: inviteRole });
      setInvites((prev) => [...prev, { email: inviteEmail.trim(), role: inviteRole }]);
      setInviteEmail("");
    } catch (e: any) {
      setError(e.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl cta-gradient flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <h1 className="text-2xl font-black font-headline text-on-surface">Stride</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {["workspace", "invite"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? "bg-primary text-white" :
                (step === "invite" && s === "workspace") || step === "done" ? "bg-primary/20 text-primary" :
                "bg-surface-container text-on-surface-variant"
              }`}>{i + 1}</div>
              {i < 1 && <div className="w-8 h-px bg-outline-variant/40" />}
            </div>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-8">
          {step === "workspace" && (
            <>
              <h2 className="text-xl font-black font-headline mb-1">Create your workspace</h2>
              <p className="text-sm text-on-surface-variant mb-6">This is where your team will collaborate.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5 block">Workspace name</label>
                  <input
                    value={orgName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Payments Team"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5 block">URL slug</label>
                  <div className="flex items-center rounded-xl border border-outline-variant/30 bg-surface-container overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
                    <span className="px-3 text-sm text-on-surface-variant border-r border-outline-variant/30 py-2.5 bg-surface-container-high">stride.app/</span>
                    <input
                      value={orgSlug}
                      onChange={(e) => { setOrgSlug(e.target.value); setSlugEdited(true); }}
                      placeholder="payments-team"
                      className="flex-1 px-3 py-2.5 bg-transparent text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  onClick={createWorkspace}
                  disabled={creating || !orgName.trim() || !orgSlug.trim()}
                  className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {creating ? "Creating…" : "Create workspace →"}
                </button>
              </div>
            </>
          )}

          {step === "invite" && (
            <>
              <h2 className="text-xl font-black font-headline mb-1">Invite your team</h2>
              <p className="text-sm text-on-surface-variant mb-6">They'll receive an invite link via email.</p>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addInvite()}
                    placeholder="colleague@company.com"
                    type="email"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={addInvite}
                    disabled={sending || !inviteEmail.trim()}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40"
                  >
                    {sending ? "…" : "Invite"}
                  </button>
                </div>

                {invites.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {invites.map((inv) => (
                      <div key={inv.email} className="flex items-center gap-2 px-3 py-2 bg-surface-container rounded-lg text-sm">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>check_circle</span>
                        <span className="flex-1 text-on-surface">{inv.email}</span>
                        <span className="text-xs text-on-surface-variant capitalize">{inv.role}</span>
                      </div>
                    ))}
                  </div>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Go to dashboard →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
