"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { api, ApiInvitationPreview } from "@/lib/api";
import { useToken } from "@/lib/useToken";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function InvitePage() {
  const { token: inviteToken } = useParams<{ token: string }>();
  const { data: session, status } = useSession();
  const token = useToken();

  const [invite, setInvite]     = useState<ApiInvitationPreview | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [accepting, setAccepting] = useState(false);

  // For unauthenticated users: "setup" (new member) or "login" (existing user)
  const [mode, setMode]         = useState<"setup" | "login">("setup");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    api.invitations.preview(inviteToken)
      .then((inv) => { setInvite(inv); setEmail(inv.email); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [inviteToken]);

  async function acceptInvite(bearerToken?: string) {
    const t = bearerToken ?? token;
    if (!t || !inviteToken) return;
    setAccepting(true);
    try {
      const { accessToken } = await api.invitations.accept(t, inviteToken);
      // Refresh the NextAuth session with the new JWT (signed with the
      // invited org as organizationId) so /users and other org-scoped APIs
      // return the correct workspace without requiring a logout/login.
      await signIn("credentials", { token: accessToken, redirect: false });
      window.location.href = "/dashboard";
    } catch (e: any) {
      setError(e.message ?? "Failed to accept invite");
      setAccepting(false);
    }
  }

  // New member: register then accept
  async function handleSetup(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${API}/auth/register-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password, inviteToken }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.includes("already") ? "An account with this email exists. Sign in instead." : "Registration failed.");
      }
      const data = await res.json();
      // Sign in to get session
      await signIn("credentials", { email, password, redirect: false });
      // Accept invite using the token from register response directly
      await acceptInvite(data.accessToken);
    } catch (e: any) {
      setAuthError(e.message ?? "Something went wrong.");
      setAuthLoading(false);
    }
  }

  // Existing user: sign in then accept
  async function handleSignIn(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setAuthError("Invalid email or password.");
      setAuthLoading(false);
      return;
    }
    // Session will update — acceptInvite picks up via useToken after re-render
    // Use a small wait for session to hydrate
    setTimeout(() => setAuthLoading(false), 800);
  }

  if (loading) {
    return (
      <div className="light-page min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="light-page min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-4 block">link_off</span>
          <h1 className="text-xl font-bold text-on-surface mb-2">Invalid or expired invite</h1>
          <p className="text-sm text-on-surface-variant">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="light-page min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl cta-gradient flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <h1 className="text-2xl font-black font-headline text-on-surface">Stride</h1>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-8">
          {/* Invite card */}
          {invite && (
            <div className="flex items-center gap-3 mb-6 p-4 bg-surface-container rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>corporate_fare</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">
                  {invite.invitedBy?.name ?? "Someone"} invited you to join
                </p>
                <p className="font-bold text-on-surface">{invite.organization.name}</p>
                <p className="text-xs text-on-surface-variant capitalize">as {invite.role}</p>
              </div>
            </div>
          )}

          {/* Already logged in */}
          {status === "authenticated" && (() => {
            const emailMismatch = invite && session.user?.email?.toLowerCase() !== invite.email.toLowerCase();
            return (
              <>
                <p className="text-sm text-on-surface-variant mb-4">
                  Signed in as <strong>{session.user?.email}</strong>
                </p>
                {emailMismatch && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs font-bold text-amber-700 mb-1">Wrong account</p>
                    <p className="text-xs text-amber-600">
                      This invite was sent to <strong>{invite.email}</strong>. Please sign out and sign in with the correct account.
                    </p>
                    <button
                      onClick={() => import("next-auth/react").then(m => m.signOut({ redirect: false })).then(() => window.location.reload())}
                      className="mt-2 text-xs font-bold text-amber-700 underline"
                    >
                      Sign out and switch account
                    </button>
                  </div>
                )}
                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
                <button
                  onClick={() => acceptInvite()}
                  disabled={accepting || !!emailMismatch}
                  className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {accepting ? "Joining…" : `Join ${invite?.organization.name} →`}
                </button>
              </>
            );
          })()}

          {/* Not logged in */}
          {status === "unauthenticated" && (
            <>
              {/* Tab toggle */}
              <div className="flex rounded-xl bg-surface-container p-1 mb-5">
                <button
                  onClick={() => setMode("setup")}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === "setup" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant"}`}
                >
                  New to Stride
                </button>
                <button
                  onClick={() => setMode("login")}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === "login" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant"}`}
                >
                  Already have account
                </button>
              </div>

              {/* Setup form — new member */}
              {mode === "setup" && (
                <form onSubmit={handleSetup} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1 block">Full name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" required
                      className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1 block">Email</label>
                    <input value={email} readOnly
                      className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/20 bg-surface-container-high text-sm text-on-surface-variant cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1 block">Set a password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" required minLength={8}
                      className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  {authError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{authError}</p>}
                  <button type="submit" disabled={authLoading}
                    className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 shadow-md shadow-primary/20">
                    {authLoading ? "Setting up…" : "Create account & join →"}
                  </button>
                </form>
              )}

              {/* Sign in form — existing user */}
              {mode === "login" && (
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1 block">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Password</label>
                      <a href="/forgot-password" className="text-xs text-primary hover:underline font-medium">Forgot password?</a>
                    </div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  {authError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{authError}</p>}
                  <button type="submit" disabled={authLoading}
                    className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40">
                    {authLoading ? "Signing in…" : "Sign in & join →"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
