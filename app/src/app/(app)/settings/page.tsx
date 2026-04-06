"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import clsx from "clsx";
import { useToken } from "@/lib/useToken";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

const TABS = [
  { id: "workspace", label: "Workspace", icon: "business" },
  { id: "members", label: "Members & Roles", icon: "group" },
  { id: "fields", label: "Custom Fields", icon: "tune" },
  { id: "integrations", label: "Integrations", icon: "extension" },
  { id: "ai", label: "AI Settings", icon: "auto_awesome" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
];

const NOTIF_EVENTS = [
  { id: "issue_assigned", label: "Issue assigned to me" },
  { id: "issue_comment", label: "Comment on my issue" },
  { id: "issue_status", label: "Issue status changed" },
  { id: "sprint_start", label: "Sprint started / completed" },
  { id: "due_date", label: "Due date reminders" },
  { id: "mention", label: "@mention in comment" },
];

const NOTIF_STORAGE_KEY = "stride:notif_prefs";

function loadNotifPrefs(): Record<string, { email: boolean; inApp: boolean }> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

function saveNotifPrefs(prefs: Record<string, { email: boolean; inApp: boolean }>) {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs));
}

const FIELD_TYPES = [
  { id: "text",     label: "Text",     icon: "text_fields" },
  { id: "number",   label: "Number",   icon: "tag" },
  { id: "date",     label: "Date",     icon: "calendar_today" },
  { id: "select",   label: "Select",   icon: "list" },
  { id: "checkbox", label: "Checkbox", icon: "check_box" },
];

interface Integration {
  name: string;
  icon: string;
  color: string;
  description: string;
  features: string[];
  oauthLabel: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenHelp: string;
  extraFields: { label: string; placeholder: string }[];
}

const INTEGRATIONS: Integration[] = [
  {
    name: "GitHub",
    icon: "code",
    color: "bg-slate-900 text-white",
    description: "Sync pull requests and commits to issues",
    features: ["Link PRs to issues automatically", "Auto-close issues on merge", "View commit history on issue timeline"],
    oauthLabel: "Connect with GitHub",
    tokenLabel: "Personal Access Token",
    tokenPlaceholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    tokenHelp: "Generate at github.com/settings/tokens — requires repo scope",
    extraFields: [{ label: "Repository (owner/repo)", placeholder: "acme/my-repo" }],
  },
  {
    name: "Slack",
    icon: "forum",
    color: "bg-[#4A154B] text-white",
    description: "Get notifications and create issues from Slack",
    features: ["Receive issue updates in any channel", "Create issues from Slack messages", "Use /stride commands in Slack"],
    oauthLabel: "Add to Slack",
    tokenLabel: "Incoming Webhook URL",
    tokenPlaceholder: "https://hooks.slack.com/services/...",
    tokenHelp: "Create an Incoming Webhook in your Slack app's settings page",
    extraFields: [{ label: "Default channel", placeholder: "#engineering" }],
  },
  {
    name: "Figma",
    icon: "design_services",
    color: "bg-[#F24E1E] text-white",
    description: "Attach Figma frames directly to issues and docs",
    features: ["Embed Figma frames inside issues", "Preview designs without leaving Stride", "Track design-to-dev handoff status"],
    oauthLabel: "Connect with Figma",
    tokenLabel: "Personal Access Token",
    tokenPlaceholder: "figd_xxxxxxxxxxxxxxxxxxxx",
    tokenHelp: "Generate at figma.com → Account Settings → Security → Personal access tokens",
    extraFields: [],
  },
  {
    name: "Linear Import",
    icon: "import_export",
    color: "bg-surface-container text-on-surface",
    description: "Import issues and projects from Linear",
    features: ["Import all issues with labels and assignees", "Preserve status mappings", "One-time or recurring sync"],
    oauthLabel: "Connect with Linear",
    tokenLabel: "Linear API Key",
    tokenPlaceholder: "lin_api_xxxxxxxxxxxxxxxxxxxx",
    tokenHelp: "Generate at linear.app → Settings → API → Personal API keys",
    extraFields: [{ label: "Team ID (optional)", placeholder: "TEAM" }],
  },
];

export default function SettingsPage() {
  const token = useToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const [activeTab, setActiveTab] = useState("workspace");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [connectingTo, setConnectingTo] = useState<Integration | null>(null);
  const [tokenValue, setTokenValue] = useState("");
  const [extraValues, setExtraValues] = useState<string[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, { email: boolean; inApp: boolean }>>({});
  const [aiDigest, setAiDigest] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [aiAutoLabel, setAiAutoLabel] = useState(false);
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set());
  const [savingIntegration, setSavingIntegration] = useState(false);

  // Custom fields state
  const [customFields, setCustomFields] = useState<import("@/lib/api").ApiCustomField[]>([]);
  const [addingField, setAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState("");
  const [editFieldOptions, setEditFieldOptions] = useState("");

  useEffect(() => { setNotifPrefs(loadNotifPrefs()); }, []);

  useEffect(() => {
    const success = searchParams.get("integration_success");
    const error   = searchParams.get("integration_error");
    if (success) { toast(`${success.charAt(0).toUpperCase() + success.slice(1)} connected successfully`); setActiveTab("integrations"); router.replace("/settings"); }
    if (error)   { toast(`Failed to connect ${error} — please try again`); setActiveTab("integrations"); router.replace("/settings"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token || activeTab !== "fields") return;
    api.customFields.list(token).then(setCustomFields).catch(() => {});
  }, [token, activeTab]);

  useEffect(() => {
    if (!token || activeTab !== "integrations") return;
    api.integrations.list(token).then((list) => {
      setConnectedIntegrations(new Set(list.map((i) => i.type)));
    }).catch(() => {});
  }, [token, activeTab]);

  useEffect(() => {
    if (!token) return;
    api.organizations.mine(token).then((org) => {
      setOrgId(org.id);
      setWorkspaceName(org.name);
      setSavedName(org.name);
      const ai = (org.aiSettings ?? {}) as { digest?: boolean; suggestions?: boolean; autoLabel?: boolean };
      setAiDigest(ai.digest ?? true);
      setAiSuggestions(ai.suggestions ?? true);
      setAiAutoLabel(ai.autoLabel ?? false);
    }).catch(() => {});
  }, [token]);

  async function saveWorkspace() {
    if (!token || !orgId) return;
    setSaving(true);
    try {
      const updated = await api.organizations.update(token, orgId, { name: workspaceName });
      setSavedName(updated.name);
      toast("Workspace name saved");
    } catch {
      toast("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-background min-h-dvh">
      <TopBar breadcrumbs={[{ label: "Settings" }]} />

      <main className="pt-16 pb-24">
        <div className="px-6 py-6 max-w-4xl">
          <h1 className="text-2xl font-black tracking-tight text-on-surface font-headline mb-6">Settings</h1>

          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl w-fit mb-8 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                  activeTab === tab.id
                    ? "bg-white text-primary shadow-sm font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Workspace */}
          {activeTab === "workspace" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10">
                <h2 className="font-bold text-on-surface mb-4">Workspace Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Workspace Name</label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="w-full max-w-sm px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">Plan</label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-secondary bg-secondary/10 px-3 py-1.5 rounded-lg">Free</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={saveWorkspace}
                    disabled={saving || workspaceName === savedName}
                    className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={() => setWorkspaceName(savedName)}
                    disabled={workspaceName === savedName}
                    className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10">
                <h2 className="font-bold text-on-surface mb-1">Danger Zone</h2>
                <p className="text-xs text-on-surface-variant mb-4">These actions are irreversible. Proceed with caution.</p>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="px-4 py-2 text-sm font-bold text-error border border-error/20 rounded-xl hover:bg-error/5 transition-colors"
                  >
                    Delete Workspace
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-error">Are you sure? This cannot be undone.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          if (!token || !orgId) return;
                          try {
                            await api.organizations.delete(token, orgId);
                            window.location.href = "/onboarding";
                          } catch {
                            toast("Failed to delete workspace");
                            setConfirmDelete(false);
                          }
                        }}
                        className="px-4 py-2 text-sm font-bold text-white bg-error rounded-xl hover:opacity-90 transition-all"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Members */}
          {activeTab === "members" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col items-start gap-4">
              <p className="text-sm text-on-surface-variant">Manage your team members and their roles from the Members page.</p>
              <button
                onClick={() => router.push("/settings/members")}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
                Go to Members
              </button>
            </div>
          )}

          {/* Custom Fields */}
          {activeTab === "fields" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-on-surface">Custom Fields</h2>
                  <button
                    onClick={() => { setAddingField(true); setNewFieldName(""); setNewFieldType("text"); setNewFieldOptions(""); setNewFieldRequired(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                    Add field
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant mb-5">Extra fields that appear on every issue. Visible to all members.</p>

                {/* Add field form */}
                {addingField && (
                  <div className="mb-5 p-4 rounded-xl bg-surface-container-low border border-outline-variant/10 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">Field Name</label>
                        <input
                          autoFocus
                          value={newFieldName}
                          onChange={e => setNewFieldName(e.target.value)}
                          placeholder="e.g. Customer name"
                          className="w-full px-3 py-2 text-sm bg-white border border-outline-variant/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">Type</label>
                        <select
                          value={newFieldType}
                          onChange={e => setNewFieldType(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-outline-variant/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {FIELD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    {newFieldType === "select" && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">Options (comma-separated)</label>
                        <input
                          value={newFieldOptions}
                          onChange={e => setNewFieldOptions(e.target.value)}
                          placeholder="Option 1, Option 2, Option 3"
                          className="w-full px-3 py-2 text-sm bg-white border border-outline-variant/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newFieldRequired} onChange={e => setNewFieldRequired(e.target.checked)} className="accent-primary" />
                      <span className="text-sm text-on-surface">Required field</span>
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={!newFieldName.trim()}
                        onClick={async () => {
                          if (!token || !newFieldName.trim()) return;
                          const opts = newFieldType === "select" ? newFieldOptions.split(",").map(s => s.trim()).filter(Boolean) : [];
                          const field = await api.customFields.create(token, { name: newFieldName.trim(), type: newFieldType, options: opts, required: newFieldRequired });
                          setCustomFields(prev => [...prev, field]);
                          setAddingField(false);
                          window.dispatchEvent(new CustomEvent("stride:customFieldsChanged"));
                        }}
                        className="px-4 py-1.5 bg-primary text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create
                      </button>
                      <button onClick={() => setAddingField(false)} className="px-4 py-1.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Field list */}
                {customFields.length === 0 && !addingField ? (
                  <p className="text-sm text-on-surface-variant italic">No custom fields yet. Add one to get started.</p>
                ) : (
                  <div className="space-y-2">
                    {customFields.map(field => {
                      const typeInfo = FIELD_TYPES.find(t => t.id === field.type);
                      const isEditing = editingFieldId === field.id;
                      return (
                        <div key={field.id} className="flex items-start gap-3 p-3 rounded-xl border border-outline-variant/10 bg-surface-container-lowest">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>{typeInfo?.icon ?? "text_fields"}</span>
                          </div>
                          {isEditing ? (
                            <div className="flex-1 space-y-2">
                              <input
                                autoFocus
                                value={editFieldName}
                                onChange={e => setEditFieldName(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm bg-white border border-outline-variant/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              {field.type === "select" && (
                                <input
                                  value={editFieldOptions}
                                  onChange={e => setEditFieldOptions(e.target.value)}
                                  placeholder="Options comma-separated"
                                  className="w-full px-3 py-1.5 text-sm bg-white border border-outline-variant/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (!token) return;
                                    const opts = field.type === "select" ? editFieldOptions.split(",").map(s => s.trim()).filter(Boolean) : undefined;
                                    const updated = await api.customFields.update(token, field.id, { name: editFieldName, ...(opts && { options: opts }) });
                                    setCustomFields(prev => prev.map(f => f.id === field.id ? updated : f));
                                    setEditingFieldId(null);
                                  }}
                                  className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg"
                                >Save</button>
                                <button onClick={() => setEditingFieldId(null)} className="px-3 py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-on-surface">{field.name}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant uppercase tracking-wide">{field.type}</span>
                                {field.required && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-error/10 text-error uppercase tracking-wide">Required</span>}
                              </div>
                              {field.type === "select" && field.options.length > 0 && (
                                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{(field.options as string[]).join(" · ")}</p>
                              )}
                            </div>
                          )}
                          {!isEditing && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => { setEditingFieldId(field.id); setEditFieldName(field.name); setEditFieldOptions((field.options as string[]).join(", ")); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                              </button>
                              <button
                                onClick={async () => {
                                  if (!token) return;
                                  await api.customFields.remove(token, field.id);
                                  setCustomFields(prev => prev.filter(f => f.id !== field.id));
                                  window.dispatchEvent(new CustomEvent("stride:customFieldsChanged"));
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === "integrations" && (
            <div className="grid md:grid-cols-2 gap-4">
              {INTEGRATIONS.map((integration) => {
                const intType = integration.name.toLowerCase().replace(/\s+/g, "_");
                const isConnected = connectedIntegrations.has(intType);
                return (
                  <div key={integration.name} className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 flex items-start gap-4">
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", integration.color)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{integration.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-on-surface text-sm">{integration.name}</h3>
                        {isConnected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Connected</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed mb-3">{integration.description}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setConnectingTo(integration); setTokenValue(""); setExtraValues(integration.extraFields.map(() => "")); }}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all bg-primary text-white shadow-sm hover:shadow-md active:scale-95"
                        >
                          {isConnected ? "Reconnect" : "Connect"}
                        </button>
                        {isConnected && (
                          <button
                            onClick={async () => {
                              if (!token) return;
                              await api.integrations.remove(token, intType);
                              setConnectedIntegrations((prev) => { const s = new Set(prev); s.delete(intType); return s; });
                              toast(`${integration.name} disconnected`);
                            }}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all border border-outline-variant text-on-surface-variant hover:bg-error/10 hover:text-error hover:border-error/30"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Integration connection modal */}
          {connectingTo && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}>
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-outline-variant/10">
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", connectingTo.color)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{connectingTo.icon}</span>
                  </div>
                  <div>
                    <h2 className="font-bold text-on-surface">Connect {connectingTo.name}</h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">{connectingTo.description}</p>
                  </div>
                  <button onClick={() => setConnectingTo(null)} className="ml-auto text-on-surface-variant hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                  </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Features */}
                  <ul className="space-y-1.5">
                    {connectingTo.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* OAuth button */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">OAuth</p>
                      {connectingTo.name !== "GitHub" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Coming soon</span>
                      )}
                    </div>
                    {connectingTo.name === "GitHub" && token ? (
                      <a
                        href={`${API_URL}/integrations/oauth/github?token=${token}`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-on-surface text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>code</span>
                        {connectingTo.oauthLabel}
                      </a>
                    ) : (
                      <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-on-surface/10 text-on-surface-variant text-sm font-bold rounded-xl cursor-not-allowed opacity-50">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
                        {connectingTo.oauthLabel}
                      </button>
                    )}
                  </div>

                  {/* Token fallback */}
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Or use an API token</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-on-surface-variant block mb-1.5">{connectingTo.tokenLabel}</label>
                        <input
                          type="password"
                          value={tokenValue}
                          onChange={e => setTokenValue(e.target.value)}
                          placeholder={connectingTo.tokenPlaceholder}
                          className="w-full px-3 py-2.5 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-mono"
                        />
                        <p className="text-[11px] text-on-surface-variant/70 mt-1.5">{connectingTo.tokenHelp}</p>
                      </div>
                      {connectingTo.extraFields.map((field, i) => (
                        <div key={field.label}>
                          <label className="text-xs font-bold text-on-surface-variant block mb-1.5">{field.label}</label>
                          <input
                            type="text"
                            value={extraValues[i] ?? ""}
                            onChange={e => setExtraValues(v => v.map((x, j) => j === i ? e.target.value : x))}
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2.5 text-sm bg-surface-container-low border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/10 flex items-center justify-end gap-3">
                  <button onClick={() => setConnectingTo(null)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button
                    disabled={!tokenValue.trim() || savingIntegration}
                    onClick={async () => {
                      if (!token || !connectingTo) return;
                      setSavingIntegration(true);
                      try {
                        const intType = connectingTo.name.toLowerCase().replace(/\s+/g, "_");
                        const config: Record<string, string> = {};
                        connectingTo.extraFields.forEach((f, i) => { if (extraValues[i]) config[f.label] = extraValues[i]; });
                        await api.integrations.save(token, { type: intType, token: tokenValue, config });
                        setConnectedIntegrations((prev) => new Set([...prev, intType]));
                        toast(`${connectingTo.name} connected successfully`);
                        setConnectingTo(null);
                      } catch {
                        toast("Failed to save integration. Please check your token.");
                      } finally {
                        setSavingIntegration(false);
                      }
                    }}
                    className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingIntegration ? "Saving…" : "Save & Connect"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Settings */}
          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>notifications</span>
                  <h2 className="font-bold text-on-surface">Notification Preferences</h2>
                </div>
                <p className="text-xs text-on-surface-variant mb-6">Choose how you want to be notified for each event type.</p>

                <div className="grid grid-cols-[1fr_80px_80px] gap-x-4 gap-y-0 text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 px-1">
                  <span>Event</span>
                  <span className="text-center">In-App</span>
                  <span className="text-center">Email</span>
                </div>

                <div className="space-y-1">
                  {NOTIF_EVENTS.map((ev) => {
                    const pref = notifPrefs[ev.id] ?? { email: true, inApp: true };
                    function toggle(channel: "email" | "inApp") {
                      const next = { ...pref, [channel]: !pref[channel] };
                      const updated = { ...notifPrefs, [ev.id]: next };
                      setNotifPrefs(updated);
                      saveNotifPrefs(updated);
                    }
                    return (
                      <div key={ev.id} className="grid grid-cols-[1fr_80px_80px] gap-x-4 items-center py-3 border-b border-outline-variant/10 last:border-0 px-1">
                        <span className="text-sm text-on-surface">{ev.label}</span>
                        {(["inApp", "email"] as const).map((ch) => (
                          <div key={ch} className="flex justify-center">
                            <button
                              onClick={() => toggle(ch)}
                              className={clsx("relative rounded-full transition-colors flex-shrink-0", pref[ch] ? "bg-primary" : "bg-surface-container-high")}
                              style={{ height: 22, width: 40 }}
                            >
                              <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform", pref[ch] ? "translate-x-5" : "translate-x-0.5")} />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-on-surface-variant mt-4 italic">Preferences are saved locally on this device.</p>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <h2 className="font-bold text-on-surface">AI Features</h2>
                </div>
                <p className="text-xs text-on-surface-variant mb-6">Control how Stride&apos;s AI assists your team.</p>

                <div className="space-y-5">
                  {[
                    { id: "digest",      key: "digest",      label: "Daily AI Digest",         description: "Morning summary of team activity, blockers, and sprint health",       value: aiDigest,       setter: setAiDigest },
                    { id: "suggestions", key: "suggestions", label: "AI Issue Suggestions",     description: "Suggest related issues, duplicates, and next steps as you type",    value: aiSuggestions,  setter: setAiSuggestions },
                    { id: "autolabel",   key: "autoLabel",   label: "Auto-label Issues",        description: "Automatically apply labels based on issue content using AI",         value: aiAutoLabel,    setter: setAiAutoLabel },
                  ].map(({ id, key, label, description, value, setter }) => (
                    <div key={id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-on-surface">{label}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const next = !value;
                          setter(next);
                          if (token && orgId) {
                            const current = { digest: aiDigest, suggestions: aiSuggestions, autoLabel: aiAutoLabel, [key]: next };
                            await api.organizations.update(token, orgId, { aiSettings: current }).catch(() => {});
                          }
                          toast(`${label} ${next ? "enabled" : "disabled"}`);
                        }}
                        className={clsx(
                          "relative rounded-full transition-colors flex-shrink-0 mt-0.5",
                          value ? "bg-primary" : "bg-surface-container-high"
                        )}
                        style={{ height: 22, width: 40 }}
                      >
                        <span className={clsx(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                          value ? "translate-x-5" : "translate-x-0.5"
                        )} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
