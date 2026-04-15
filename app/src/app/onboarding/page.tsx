"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useToken } from "@/lib/useToken";
import { api } from "@/lib/api";
import { useSession } from "next-auth/react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 48);
}

export default function OnboardingPage() {
  const router = useRouter();
  const token = useToken();
  const { data: session } = useSession();

  // Step 0 = signup (only shown when not logged in)
  const isLoggedIn = !!session;
  const [step, setStep] = useState<"signup" | "otp" | "workspace" | "invite">(isLoggedIn ? "workspace" : "signup");

  // Signup state
  const [signupName, setSignupName]         = useState("");
  const [signupEmail, setSignupEmail]       = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [signingUp, setSigningUp]           = useState(false);

  // OTP state
  const [otp, setOtp]               = useState("");
  const [verifying, setVerifying]   = useState(false);
  const [resending, setResending]   = useState(false);

  // Workspace state
  const [orgName, setOrgName]       = useState("");
  const [orgSlug, setOrgSlug]       = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [orgId, setOrgId]           = useState<string | null>((session?.user as any)?.organizationId ?? null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState("member");
  const [invites, setInvites]         = useState<{ email: string; role: string }[]>([]);
  const [sending, setSending]         = useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState("");

  function handleNameChange(val: string) {
    setOrgName(val);
    if (!slugEdited) setOrgSlug(slugify(val));
  }

  async function handleSignup(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim()) return;
    setSigningUp(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: signupName.trim(), email: signupEmail.trim(), password: signupPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message?.includes("already") ? "Email already in use." : (data.message ?? "Failed to send OTP."));
      }
      setStep("otp");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSigningUp(false);
    }
  }

  async function handleVerifyOtp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!otp.trim()) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail.trim(), otp: otp.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Invalid or expired OTP.");
      }
      const result = await signIn("credentials", { email: signupEmail.trim(), password: signupPassword, redirect: false });
      if (result?.error) throw new Error("Account created but login failed — try signing in.");
      setStep("workspace");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendOtp() {
    setResending(true);
    setError("");
    try {
      await fetch(`${API}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: signupName.trim(), email: signupEmail.trim(), password: signupPassword }),
      });
    } catch {
      setError("Failed to resend OTP.");
    } finally {
      setResending(false);
    }
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

  const steps = isLoggedIn ? ["workspace", "invite"] : ["signup", "otp", "workspace", "invite"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="light-page min-h-screen bg-background flex items-center justify-center px-4">
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
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i === stepIndex ? "bg-primary text-white" :
                i < stepIndex   ? "bg-primary/20 text-primary" :
                                  "bg-surface-container text-on-surface-variant"
              }`}>{i + 1}</div>
              {i < steps.length - 1 && <div className="w-8 h-px bg-outline-variant/40" />}
            </div>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-8">

          {/* ── Step 1: Sign up ──────────────────────────────────────────── */}
          {step === "signup" && (
            <>
              <h2 className="text-xl font-black font-headline mb-1">Create your account</h2>
              <p className="text-sm text-on-surface-variant mb-6">Free to start. No credit card needed.</p>

              {/* OAuth buttons */}
              <div className="space-y-2.5 mb-5">
                <a href={`${API}/auth/google`}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm font-medium hover:bg-surface-container-high transition-colors">
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.583c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.583 9 3.583z" fill="#EA4335"/></svg>
                  Continue with Google
                </a>
                <a href={`${API}/auth/github`}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm font-medium hover:bg-surface-container-high transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  Continue with GitHub
                </a>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-outline-variant/30" />
                <span className="text-xs text-on-surface-variant">or sign up with email</span>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5 block">Full name</label>
                  <input
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Alex Rivera"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5 block">Work email</label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      className="w-full px-4 py-2.5 pr-11 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>
                {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={signingUp}
                  className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 shadow-md shadow-primary/20">
                  {signingUp ? "Sending code…" : "Continue →"}
                </button>
              </form>
              <p className="text-center text-xs text-on-surface-variant mt-5">
                Already have an account?{" "}
                <a href="/login" className="text-primary font-bold hover:underline">Sign in</a>
              </p>
            </>
          )}

          {/* ── Step 2: OTP verification ──────────────────────────────────── */}
          {step === "otp" && (
            <>
              <h2 className="text-xl font-black font-headline mb-1">Check your email</h2>
              <p className="text-sm text-on-surface-variant mb-1">We sent a 6-digit code to</p>
              <p className="text-sm font-bold text-on-surface mb-6">{signupEmail}</p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5 block">Verification code</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 bg-surface-container text-2xl font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={verifying || otp.length < 6}
                  className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 shadow-md shadow-primary/20">
                  {verifying ? "Verifying…" : "Verify & create account →"}
                </button>
              </form>
              <div className="flex items-center justify-between mt-5">
                <button onClick={() => { setStep("signup"); setOtp(""); setError(""); }}
                  className="text-xs text-on-surface-variant hover:text-on-surface">
                  ← Change email
                </button>
                <button onClick={handleResendOtp} disabled={resending}
                  className="text-xs text-primary font-bold hover:underline disabled:opacity-40">
                  {resending ? "Sending…" : "Resend code"}
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Create workspace ──────────────────────────────────── */}
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
                <button onClick={createWorkspace} disabled={creating || !orgName.trim() || !orgSlug.trim()}
                  className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
                  {creating ? "Creating…" : "Create workspace →"}
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Invite team ───────────────────────────────────────── */}
          {step === "invite" && (
            <>
              <h2 className="text-xl font-black font-headline mb-1">Invite your team</h2>
              <p className="text-sm text-on-surface-variant mb-6">They&apos;ll receive an invite link via email.</p>
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
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={addInvite} disabled={sending || !inviteEmail.trim()}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40">
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
                <button onClick={() => router.push("/dashboard")}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                  Skip for now
                </button>
                <button onClick={() => router.push("/dashboard")}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
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
