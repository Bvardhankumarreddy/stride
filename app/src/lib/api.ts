const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ── Core fetch ────────────────────────────────────────────────────────────────

let _signingOut = false;

function handleSessionExpired() {
  if (_signingOut || typeof window === "undefined") return;
  _signingOut = true;
  import("next-auth/react").then(({ signOut }) =>
    signOut({ callbackUrl: "/login" })
  );
}

export async function apiFetch<T = unknown>(
  path: string,
  token: string | undefined,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    handleSessionExpired();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  name: string | null;
  email: string;
  initials: string | null;
  image: string | null;
  role: string;
}

export interface ApiIssueChild {
  id: string;
  title: string;
  status: string;
  priority: string;
}

export interface ApiIssueDependency {
  id: string;
  blockingIssue: { id: string; title: string; status: string };
  blockedIssue:  { id: string; title: string; status: string };
}

export interface ApiSavedView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
  createdBy: { id: string; name: string | null; initials: string | null };
}

export interface ApiIssue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimate: number | null;
  dueDate: string | null;
  labels: string[];
  projectId: string | null;
  sprintId: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: Pick<ApiUser, "id" | "name" | "initials" | "image"> | null;
  creator: Pick<ApiUser, "id" | "name" | "initials"> | null;
  sprint: { id: string; name: string; status: string } | null;
  project: { id: string; name: string } | null;
  comments?: ApiComment[];
  customFieldValues?: ApiCustomFieldValue[];
  children?: ApiIssueChild[];
  blocking?: ApiIssueDependency[];
  blockedBy?: ApiIssueDependency[];
}

export interface ApiComment {
  id: string;
  body: string;
  createdAt: string;
  author: Pick<ApiUser, "id" | "name" | "initials" | "image"> | null;
}

export interface ApiDoc {
  id: string;
  title: string;
  emoji: string;
  content: object;
  status: string;
  visibility: "private" | "org" | "public";
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  authorId: string | null;
  projectId: string | null;
  author: Pick<ApiUser, "id" | "name" | "initials"> | null;
  project: { id: string; name: string } | null;
}

export interface ApiCustomField {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "select" | "checkbox";
  options: string[];
  required: boolean;
  organizationId: string;
}

export interface ApiCustomFieldValue {
  id: string;
  value: string;
  customFieldId: string;
  customField: ApiCustomField;
}

export interface ApiTeamMember {
  id: string;
  role: string;
  teamId: string;
  userId: string;
  user: Pick<ApiUser, "id" | "name" | "initials" | "image" | "email">;
}

export interface ApiTeam {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  organizationId: string;
  createdAt: string;
  members: ApiTeamMember[];
  projects?: { id: string; name: string; _count: { issues: number; sprints: number } }[];
  _count?: { projects: number; members: number };
}

export interface ApiIssueTemplate {
  id: string;
  name: string;
  description: string | null;
  titlePrefix: string | null;
  body: string | null;
  priority: string;
  labels: string[];
  createdAt: string;
  createdBy: { id: string; name: string | null; initials: string | null };
}

export interface ApiWebhook {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { deliveries: number };
  deliveries?: { id: string; event: string; success: boolean; statusCode: number | null; createdAt: string }[];
}

export interface ApiSprint {
  id: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  projectId: string;
  issues?: ApiIssue[];
  _count?: { issues: number };
}

export interface ApiIssueActivity {
  id: string;
  issueId: string;
  userId: string | null;
  type: string;
  from: string | null;
  to: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: Pick<ApiUser, "id" | "name" | "initials"> | null;
}

export interface ApiVelocity {
  sprint: string;
  committed: number;
  completed: number;
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  issueId: string | null;
  createdAt: string;
  userId: string;
}

export interface ApiOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  aiSettings: { digest?: boolean; suggestions?: boolean; autoLabel?: boolean };
  labelDefs: { name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrgMember {
  id: string;
  role: string;
  createdAt: string;
  userId: string;
  organizationId: string;
  user: Pick<ApiUser, "id" | "name" | "email" | "initials" | "image">;
}

export interface ApiInvitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  organizationId: string;
  organization?: Pick<ApiOrganization, "id" | "name" | "slug">;
  invitedBy?: Pick<ApiUser, "name"> | null;
}

export interface ApiInvitationPreview {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  organization: Pick<ApiOrganization, "id" | "name" | "slug">;
  invitedBy: { name: string | null } | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const api = {
  issues: {
    list: (token: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<{ data: ApiIssue[]; total: number; page: number; limit: number }>(
        `/issues${qs ? `?${qs}` : ""}`, token,
      );
    },
    get: (token: string, id: string) =>
      apiFetch<ApiIssue>(`/issues/${id}`, token),
    create: (token: string, body: { title: string; status?: string; priority?: string; description?: string; assigneeId?: string; projectId?: string; sprintId?: string }) =>
      apiFetch<ApiIssue>(`/issues`, token, { method: "POST", body: JSON.stringify(body) }),
    update: (token: string, id: string, body: Partial<ApiIssue> & { assigneeId?: string | null; sprintId?: string | null; dueDate?: string | null }) =>
      apiFetch<ApiIssue>(`/issues/${id}`, token, { method: "PATCH", body: JSON.stringify(body) }),
    activity: (token: string, id: string) =>
      apiFetch<ApiIssueActivity[]>(`/issues/${id}/activity`, token),
    bulkUpdate: (token: string, ids: string[], data: { status?: string; assigneeId?: string; priority?: string }) =>
      apiFetch<{ updated: number }>(`/issues/bulk`, token, { method: "PATCH", body: JSON.stringify({ ids, ...data }) }),
    createSubTask: (token: string, parentId: string, body: { title: string }) =>
      apiFetch<ApiIssueChild>(`/issues/${parentId}/subtasks`, token, { method: "POST", body: JSON.stringify(body) }),
    addDependency: (token: string, blockingIssueId: string, blockedIssueId: string) =>
      apiFetch<ApiIssueDependency>(`/issues/${blockingIssueId}/dependencies`, token, { method: "POST", body: JSON.stringify({ blockedIssueId }) }),
    removeDependency: (token: string, blockingIssueId: string, blockedIssueId: string) =>
      apiFetch<void>(`/issues/${blockingIssueId}/dependencies/${blockedIssueId}`, token, { method: "DELETE" }),
    downloadCsv: (token: string) => {
      const a = document.createElement("a");
      a.href = `${API}/issues/export`;
      // Fetch with auth header and trigger blob download
      fetch(`${API}/issues/export`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          a.href = url;
          a.download = "issues.csv";
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => {});
    },
  },

  docs: {
    list: (token: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<{ data: ApiDoc[]; total: number }>(
        `/docs${qs ? `?${qs}` : ""}`, token,
      );
    },
    get: (token: string, id: string) =>
      apiFetch<ApiDoc>(`/docs/${id}`, token),
    create: (token: string, body: { title: string; emoji?: string; content?: object; status?: string; projectId?: string }) =>
      apiFetch<ApiDoc>(`/docs`, token, { method: "POST", body: JSON.stringify(body) }),
    update: (token: string, id: string, body: { title?: string; emoji?: string; status?: string; visibility?: string; wordCount?: number; content?: object }) =>
      apiFetch<ApiDoc>(`/docs/${id}`, token, { method: "PATCH", body: JSON.stringify(body) }),
  },

  customFields: {
    list: (token: string) =>
      apiFetch<ApiCustomField[]>(`/custom-fields`, token),
    create: (token: string, body: { name: string; type: string; options?: string[]; required?: boolean }) =>
      apiFetch<ApiCustomField>(`/custom-fields`, token, { method: "POST", body: JSON.stringify(body) }),
    update: (token: string, id: string, body: { name?: string; options?: string[]; required?: boolean }) =>
      apiFetch<ApiCustomField>(`/custom-fields/${id}`, token, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (token: string, id: string) =>
      apiFetch<void>(`/custom-fields/${id}`, token, { method: "DELETE" }),
    saveValues: (token: string, issueId: string, values: { fieldId: string; value: string }[]) =>
      apiFetch<void>(`/custom-fields/issues/${issueId}/values`, token, { method: "PATCH", body: JSON.stringify({ values }) }),
  },

  sprints: {
    list: (token: string, projectId: string) =>
      apiFetch<ApiSprint[]>(`/projects/${projectId}/sprints`, token),
    get: (token: string, projectId: string, id: string) =>
      apiFetch<ApiSprint>(`/projects/${projectId}/sprints/${id}`, token),
    create: (token: string, projectId: string, body: { name: string; goal?: string; startDate?: string; endDate?: string; status?: string }) =>
      apiFetch<ApiSprint>(`/projects/${projectId}/sprints`, token, { method: "POST", body: JSON.stringify(body) }),
    update: (token: string, projectId: string, id: string, body: { name?: string; goal?: string; startDate?: string; endDate?: string; status?: string }) =>
      apiFetch<ApiSprint>(`/projects/${projectId}/sprints/${id}`, token, { method: "PATCH", body: JSON.stringify(body) }),
    velocity: (token: string, projectId: string) =>
      apiFetch<ApiVelocity[]>(`/projects/${projectId}/sprints/velocity`, token),
  },

  projects: {
    list: (token: string) =>
      apiFetch<{ id: string; name: string }[]>(`/projects`, token),
    create: (token: string, body: { name: string; description?: string }) =>
      apiFetch<{ id: string; name: string }>(`/projects`, token, { method: "POST", body: JSON.stringify(body) }),
  },

  notifications: {
    list: (token: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<{ data: ApiNotification[]; total: number; unreadCount: number }>(
        `/notifications${qs ? `?${qs}` : ""}`, token,
      );
    },
    markRead: (token: string, id: string) =>
      apiFetch<ApiNotification>(`/notifications/${id}/read`, token, { method: "PATCH" }),
    markAllRead: (token: string) =>
      apiFetch<{ count: number }>(`/notifications/read-all`, token, { method: "PATCH" }),
  },

  users: {
    list: (token: string) =>
      apiFetch<ApiUser[]>(`/users`, token),
  },

  organizations: {
    listAll: (token: string) =>
      apiFetch<{ organization: ApiOrganization; role: string }[]>(`/organizations`, token),
    create: (token: string, data: { name: string; slug: string }) =>
      apiFetch<ApiOrganization>(`/organizations`, token, { method: 'POST', body: JSON.stringify(data) }),
    mine: (token: string) =>
      apiFetch<ApiOrganization>(`/organizations/mine`, token),
    switch: (token: string, orgId: string) =>
      apiFetch<{ accessToken: string; organizationId: string }>(`/organizations/switch/${orgId}`, token, { method: 'POST' }),
    members: (token: string, orgId: string) =>
      apiFetch<ApiOrgMember[]>(`/organizations/${orgId}/members`, token),
    updateMember: (token: string, orgId: string, userId: string, role: string) =>
      apiFetch<ApiOrgMember>(`/organizations/${orgId}/members/${userId}`, token, { method: 'PATCH', body: JSON.stringify({ role }) }),
    removeMember: (token: string, orgId: string, userId: string) =>
      apiFetch<void>(`/organizations/${orgId}/members/${userId}`, token, { method: 'DELETE' }),
    update: (token: string, orgId: string, data: { name?: string; aiSettings?: Record<string, boolean>; labelDefs?: { name: string; color: string }[] }) =>
      apiFetch<ApiOrganization>(`/organizations/${orgId}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (token: string, orgId: string) =>
      apiFetch<void>(`/organizations/${orgId}`, token, { method: 'DELETE' }),
    invite: (token: string, orgId: string, data: { email: string; role?: string }) =>
      apiFetch<ApiInvitation>(`/organizations/${orgId}/invitations`, token, { method: 'POST', body: JSON.stringify(data) }),
    invitations: (token: string, orgId: string) =>
      apiFetch<ApiInvitation[]>(`/organizations/${orgId}/invitations`, token),
    revokeInvitation: (token: string, orgId: string, invitationId: string) =>
      apiFetch<void>(`/organizations/${orgId}/invitations/${invitationId}`, token, { method: 'DELETE' }),
  },

  auth: {
    changePassword: (token: string, body: { currentPassword: string; newPassword: string }) =>
      apiFetch<{ accessToken: string }>(`/auth/change-password`, token, { method: 'PATCH', body: JSON.stringify(body) }),
  },

  invitations: {
    preview: (inviteToken: string) =>
      apiFetch<ApiInvitationPreview>(`/invitations/${inviteToken}`, undefined),
    accept: (token: string, inviteToken: string) =>
      apiFetch<{ organizationId: string; organizationSlug: string }>(`/invitations/${inviteToken}/accept`, token, { method: 'POST' }),
  },

  comments: {
    update: (token: string, issueId: string, commentId: string, body: { body: string }) =>
      apiFetch<ApiComment>(`/issues/${issueId}/comments/${commentId}`, token, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (token: string, issueId: string, commentId: string) =>
      apiFetch<void>(`/issues/${issueId}/comments/${commentId}`, token, { method: "DELETE" }),
  },

  search: {
    query: (token: string, q: string, filter?: string) => {
      const params = new URLSearchParams({ q });
      if (filter) params.set("filter", filter);
      return apiFetch<{ results: { type: string; id: string; title: string; meta: string; href: string; highlight?: string }[]; total: number }>(
        `/search?${params}`, token,
      );
    },
  },

  ai: {
    acceptanceCriteria: (token: string, body: { title: string; description?: string; priority?: string; labels?: string[] }) =>
      apiFetch<{ criteria: string[] }>(`/ai/acceptance-criteria`, token, { method: "POST", body: JSON.stringify(body) }),
    similarIssues: (token: string, body: { target: { id: string; title: string; description?: string }; candidates: { id: string; title: string; description?: string }[] }) =>
      apiFetch<{ similar: { id: string; title: string; reason: string; similarityScore: number }[] }>(`/ai/similar-issues`, token, { method: "POST", body: JSON.stringify(body) }),
    summarizeComments: (token: string, body: { issueTitle: string; comments: { author: string; body: string }[] }) =>
      apiFetch<{ summary: string; keyDecisions: string[]; openQuestions: string[] } | null>(`/ai/summarize-comments`, token, { method: "POST", body: JSON.stringify(body) }),
    analyzeSprint: (token: string, body: {
      sprintName: string;
      startDate: string | null;
      endDate: string | null;
      issues: { id: string; title: string; status: string; priority: string; assignee?: string; estimate?: number }[];
    }) =>
      apiFetch<{
        health: string; healthReason: string; summary: string; completionLikelihood: number;
        risks: string[]; recommendations: string[]; highlights: string[]; workloadBalance: string;
      }>(`/ai/analyze-sprint`, token, { method: "POST", body: JSON.stringify(body) }),
    analyzeRoadmap: (token: string, body: {
      projectName: string;
      sprints: { name: string; status: string; startDate: string | null; endDate: string | null; totalIssues: number; completedIssues: number; totalPoints: number; completedPoints: number }[];
    }) =>
      apiFetch<{
        overallHealth: string; summary: string; timeline: string;
        risks: string[]; recommendations: string[];
        sprintInsights: { name: string; health: string; note: string }[];
      }>(`/ai/analyze-roadmap`, token, { method: "POST", body: JSON.stringify(body) }),
    writeIssue: (token: string, body: { roughDescription: string }) =>
      apiFetch<{
        title: string; description: string; priority: string; labels: string[]; acceptanceCriteria: string[];
      }>(`/ai/write-issue`, token, { method: "POST", body: JSON.stringify(body) }),
    standup: (token: string, body: {
      sprintName: string;
      issues: { title: string; status: string; priority: string; assignee?: string }[];
    }) =>
      apiFetch<{
        yesterday: string[]; today: string[]; blockers: string[]; summary: string;
      }>(`/ai/standup`, token, { method: "POST", body: JSON.stringify(body) }),
  },

  billing: {
    checkout: (token: string, plan: 'pro' | 'business') =>
      apiFetch<{ url: string }>(`/billing/checkout`, token, { method: 'POST', body: JSON.stringify({ plan }) }),
    portal: (token: string) =>
      apiFetch<{ url: string }>(`/billing/portal`, token),
  },

  teams: {
    list: (token: string) => apiFetch<ApiTeam[]>(`/teams`, token),
    get: (token: string, id: string) => apiFetch<ApiTeam>(`/teams/${id}`, token),
    create: (token: string, body: { name: string; identifier: string; description?: string }) =>
      apiFetch<ApiTeam>(`/teams`, token, { method: "POST", body: JSON.stringify(body) }),
    update: (token: string, id: string, body: { name?: string; description?: string }) =>
      apiFetch<ApiTeam>(`/teams/${id}`, token, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (token: string, id: string) => apiFetch<void>(`/teams/${id}`, token, { method: "DELETE" }),
    addMember: (token: string, id: string, body: { userId: string; role?: string }) =>
      apiFetch<ApiTeamMember>(`/teams/${id}/members`, token, { method: "POST", body: JSON.stringify(body) }),
    updateMember: (token: string, id: string, userId: string, role: string) =>
      apiFetch<ApiTeamMember>(`/teams/${id}/members/${userId}`, token, { method: "PATCH", body: JSON.stringify({ role }) }),
    removeMember: (token: string, id: string, userId: string) =>
      apiFetch<void>(`/teams/${id}/members/${userId}`, token, { method: "DELETE" }),
  },

  templates: {
    list: (token: string) => apiFetch<ApiIssueTemplate[]>(`/templates`, token),
    create: (token: string, body: { name: string; description?: string; titlePrefix?: string; body?: string; priority?: string; labels?: string[] }) =>
      apiFetch<ApiIssueTemplate>(`/templates`, token, { method: "POST", body: JSON.stringify(body) }),
    update: (token: string, id: string, body: Partial<{ name: string; description: string; titlePrefix: string; body: string; priority: string; labels: string[] }>) =>
      apiFetch<ApiIssueTemplate>(`/templates/${id}`, token, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (token: string, id: string) => apiFetch<void>(`/templates/${id}`, token, { method: "DELETE" }),
  },

  webhooks: {
    list: (token: string) => apiFetch<ApiWebhook[]>(`/webhooks`, token),
    get: (token: string, id: string) => apiFetch<ApiWebhook>(`/webhooks/${id}`, token),
    create: (token: string, body: { name: string; url: string; secret?: string; events: string[]; active?: boolean }) =>
      apiFetch<ApiWebhook>(`/webhooks`, token, { method: "POST", body: JSON.stringify(body) }),
    update: (token: string, id: string, body: Partial<{ name: string; url: string; secret: string; events: string[]; active: boolean }>) =>
      apiFetch<ApiWebhook>(`/webhooks/${id}`, token, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (token: string, id: string) => apiFetch<void>(`/webhooks/${id}`, token, { method: "DELETE" }),
    test: (token: string, id: string) => apiFetch<{ message: string }>(`/webhooks/${id}/test`, token, { method: "POST" }),
  },

  integrations: {
    list: (token: string) =>
      apiFetch<{ id: string; type: string; config: Record<string, string>; createdAt: string }[]>(`/integrations`, token),
    save: (token: string, body: { type: string; token: string; config?: Record<string, string> }) =>
      apiFetch<{ id: string; type: string }>(`/integrations`, token, { method: "POST", body: JSON.stringify(body) }),
    remove: (token: string, type: string) =>
      apiFetch<void>(`/integrations/${encodeURIComponent(type)}`, token, { method: "DELETE" }),
  },

  savedViews: {
    list: (token: string) => apiFetch<ApiSavedView[]>(`/saved-views`, token),
    create: (token: string, body: { name: string; filters: Record<string, unknown> }) =>
      apiFetch<ApiSavedView>(`/saved-views`, token, { method: "POST", body: JSON.stringify(body) }),
    remove: (token: string, id: string) => apiFetch<void>(`/saved-views/${id}`, token, { method: "DELETE" }),
  },
};
