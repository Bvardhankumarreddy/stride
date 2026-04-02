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

  return res.json() as Promise<T>;
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
  createdAt: string;
  updatedAt: string;
  assignee: Pick<ApiUser, "id" | "name" | "initials" | "image"> | null;
  creator: Pick<ApiUser, "id" | "name" | "initials"> | null;
  sprint: { id: string; name: string; status: string } | null;
  project: { id: string; name: string } | null;
  comments?: ApiComment[];
  customFieldValues?: ApiCustomFieldValue[];
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

export interface ApiSprint {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  projectId: string;
  issues?: ApiIssue[];
  _count?: { issues: number };
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
  },

  projects: {
    list: (token: string) =>
      apiFetch<{ id: string; name: string }[]>(`/projects`, token),
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
    update: (token: string, orgId: string, data: { name: string }) =>
      apiFetch<ApiOrganization>(`/organizations/${orgId}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (token: string, orgId: string) =>
      apiFetch<void>(`/organizations/${orgId}`, token, { method: 'DELETE' }),
    invite: (token: string, orgId: string, data: { email: string; role?: string }) =>
      apiFetch<ApiInvitation>(`/organizations/${orgId}/invitations`, token, { method: 'POST', body: JSON.stringify(data) }),
    invitations: (token: string, orgId: string) =>
      apiFetch<ApiInvitation[]>(`/organizations/${orgId}/invitations`, token),
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
};
