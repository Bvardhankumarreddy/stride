"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { api, ApiInvitationPreview } from "@/lib/api";
import { useToken } from "@/lib/useToken";

export default function InvitePage() {
  const { token: inviteToken } = useParams<{ token: string }>();
  const { data: session, status } = useSession();
  const token = useToken();
  const router = useRouter();

  const [invite, setInvite] = useState<ApiInvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  // Email/password for new users
  const [mode, setMode] = useState<"accept" | "login" | "register">("accept");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!inviteToken) return;
    api.invitations.preview(inviteToken).then(setInvite).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [inviteToken]);

  async function acceptInvite() {
    if (!token || !inviteToken) return;
    setAccepting(true);
    try {
      await api.invitations.accept(token, inviteToken);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message ?? "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  }

  async function handleSignIn() {
    setAuthError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) { setAuthError("Invalid email or password"); return; }
    setMode("accept");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-4 block">link_off</span>
          <h1 className="text-xl font-bold text-on-surface mb-2">Invalid or expired invite</h1>
          <p className="text-sm text-on-surface-variant">{error || "This invitation link is no longer valid."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl cta-gradient flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <h1 className="text-2xl font-black font-headline text-on-surface">Stride</h1>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm p-8">
          {/* Invite details */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-surface-container rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
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

          {/* Logged in — just accept */}
          {status === "authenticated" && mode === "accept" && (
            <>
              <p className="text-sm text-on-surface-variant mb-4">
                Signed in as <strong>{session.user?.email}</strong>
              </p>
              {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
              <button
                onClick={acceptInvite}
                disabled={accepting}
                className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40"
              >
                {accepting ? "Joining…" : `Join ${invite.organization.name} →`}
              </button>
            </>
          )}

          {/* Not logged in — sign in first */}
          {status === "unauthenticated" && (
            <>
              <h2 className="text-base font-bold mb-4">Sign in to accept this invite</h2>
              <div className="space-y-3">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password"
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                {authError && <p className="text-xs text-red-500">{authError}</p>}
                <button onClick={handleSignIn}
                  className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90">
                  Sign in &amp; join
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
