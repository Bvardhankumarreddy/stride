"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { useToken } from "@/lib/useToken";
import { useSession } from "next-auth/react";
import { api, ApiOrgMember, ApiInvitation, ApiOrganization } from "@/lib/api";
import clsx from "clsx";

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-primary/10 text-primary border border-primary/20",
  admin: "bg-secondary/10 text-secondary border border-secondary/20",
  member: "bg-surface-container-high text-on-surface-variant",
};

export default function MembersPage() {
  const token = useToken();
  const { data: session } = useSession();
  const me = session?.user as any;
  const orgId = me?.organizationId as string | undefined;

  const [members, setMembers] = useState<ApiOrgMember[]>([]);
  const [invitations, setInvitations] = useState<ApiInvitation[]>([]);
  const [org, setOrg] = useState<ApiOrganization | null>(null);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    if (!token || !orgId) return;
    Promise.all([
      api.organizations.members(token, orgId),
      api.organizations.invitations(token, orgId),
      api.organizations.mine(token),
    ]).then(([m, inv, o]) => {
      setMembers(m);
      setInvitations(inv);
      setOrg(o);
    }).finally(() => setLoading(false));
  }, [token, orgId]);

  async function sendInvite() {
    if (!token || !orgId || !inviteEmail.trim()) return;
    setSending(true);
    setInviteError("");
    try {
      const inv = await api.organizations.invite(token, orgId, { email: inviteEmail.trim(), role: inviteRole });
      setInvitations((prev) => [inv, ...prev]);
      setInviteEmail("");
    } catch (e: any) {
      setInviteError(e.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  }

  async function changeRole(userId: string, role: string) {
    if (!token || !orgId) return;
    const updated = await api.organizations.updateMember(token, orgId, userId, role);
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role: updated.role } : m));
  }

  async function removeMember(userId: string) {
    if (!token || !orgId) return;
    await api.organizations.removeMember(token, orgId, userId);
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }

  async function revokeInvitation(invitationId: string) {
    if (!token || !orgId) return;
    await api.organizations.revokeInvitation(token, orgId, invitationId);
    setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
  }

  const myMembership = members.find((m) => m.userId === me?.id);
  const canManage = myMembership && ["owner", "admin"].includes(myMembership.role);

  return (
    <div className="bg-background min-h-screen">
      <TopBar breadcrumbs={[{ label: "Settings" }, { label: "Members" }]} />

      <main className="pt-20 pb-24 max-w-3xl mx-auto px-6">
        <div className="pt-4 mb-8">
          <h1 className="text-2xl font-black tracking-tight text-on-surface font-headline">Members</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage who has access to your workspace.</p>
        </div>

        {/* Invite form */}
        {canManage && (
          <section className="mb-8 p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-on-surface">Invite a teammate</h2>
              {org && (
                <span className="flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>corporate_fare</span>
                  {org.name}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                placeholder="colleague@company.com"
                type="email"
                className="flex-1 px-4 py-2 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 rounded-xl border border-outline-variant/30 bg-surface-container text-sm focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={sendInvite}
                disabled={sending || !inviteEmail.trim()}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40"
              >
                {sending ? "Sending…" : "Invite"}
              </button>
            </div>
            {inviteError && <p className="text-xs text-red-500 mt-2">{inviteError}</p>}
          </section>
        )}

        {/* Members list */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Members ({members.length})
          </h2>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-surface-container-low rounded-xl animate-pulse" />
              ))
            ) : members.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
                <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-on-primary-fixed">{m.user.initials ?? "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface">{m.user.name}</p>
                  <p className="text-xs text-on-surface-variant">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && m.userId !== me?.id ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.userId, e.target.value)}
                      className={clsx("text-[10px] font-bold px-2 py-1 rounded-full border-0 focus:outline-none capitalize cursor-pointer", ROLE_BADGE[m.role] ?? ROLE_BADGE.member)}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span className={clsx("text-[10px] font-bold px-2 py-1 rounded-full capitalize", ROLE_BADGE[m.role] ?? ROLE_BADGE.member)}>
                      {m.role}
                    </span>
                  )}
                  {canManage && m.userId !== me?.id && (
                    <button
                      onClick={() => removeMember(m.userId)}
                      className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_remove</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pending invites */}
        {invitations.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Pending invites ({invitations.length})
            </h2>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/20">
                  <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>mail</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{inv.email}</p>
                    <p className="text-xs text-on-surface-variant">
                      Invited by {inv.invitedBy?.name ?? "someone"} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={clsx("text-[10px] font-bold px-2 py-1 rounded-full capitalize", ROLE_BADGE[inv.role] ?? ROLE_BADGE.member)}>
                    {inv.role}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => revokeInvitation(inv.id)}
                      className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-red-500 transition-colors"
                      title="Cancel invite"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
