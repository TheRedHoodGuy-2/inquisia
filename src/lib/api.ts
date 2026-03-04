/**
 * Inquisia API Client
 * All API calls in the application go through this module.
 * To connect to the real backend, set VITE_API_URL in your .env file.
 * All mock data is used when VITE_API_URL is not set or returns errors.
 */

import type {
  ApiResponse,
  User,
  Project,
  Comment,
  Notification,
  Department,
  AICategory,
  Supervisor,
  PublicStats,
  PaginatedResponse,
  ChangeRequest,
  AdminUserRow,
  ProjectVersion,
} from './types'

// ─── Config ───────────────────────────────────────────────────────────────────

const _viteApiUrl = (import.meta as ImportMeta & { env: Record<string, string> }).env?.VITE_API_URL

// In production, VITE_API_URL is unset → BASE_URL is '' (same-origin).
// Vercel's vercel.json proxies /api/* to the real backend, so cookies stay same-site.
// In local dev, fall back to localhost:3000.
const BASE_URL = _viteApiUrl != null && _viteApiUrl !== ''
  ? _viteApiUrl
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? ''
    : 'http://localhost:3000')

// ─── Core Fetch ───────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {

  try {
    // Never force Content-Type when body is FormData —
    // the browser must set it automatically so the multipart boundary is included.
    const isFormData = options?.body instanceof FormData
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: isFormData
        ? { ...(options?.headers as Record<string, string> ?? {}) }
        : {
          'Content-Type': 'application/json',
          ...(options?.headers ?? {}),
        },
    })

    if (res.status === 401) {
      // Trigger logout — handled by the session context subscriber
      window.dispatchEvent(new Event('inquisia:unauthorized'))
      return { success: false, error: 'Unauthorized', code: '401' }
    }

    if (res.status === 403) {
      return { success: false, error: 'Forbidden', code: '403' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await res.json() as any

    if (!json.success) {
      let errorMessage = json.error ?? 'Request failed'
      if (json.details && typeof json.details === 'object') {
        // Format Zod field errors into a readable string
        const details = Object.entries(json.details)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ')
        if (details) errorMessage += ` (${details})`
      }
      return { success: false, error: errorMessage }
    }

    // ── Response normalisation ─────────────────────────────────────────────
    // The backend uses several non-uniform successful response shapes.
    // We normalise them all to ApiResponse<T> here so callers always get `res.data`.

    // Shape: { success, user } — auth/session endpoint
    if ('user' in json && !('data' in json)) {
      return { success: true, data: json.user as T }
    }

    // Shape: { success, reply } — AI assistant/chat endpoints
    if ('reply' in json && !('data' in json)) {
      return { success: true, data: { reply: json.reply } as T }
    }

    // Shape: { success, summary } — AI summary endpoint
    if ('summary' in json && !('data' in json)) {
      return { success: true, data: { summary: json.summary } as T }
    }

    // Shape: { success, analysis } — AI analysis endpoint
    if ('analysis' in json && !('data' in json)) {
      return { success: true, data: { analysis: json.analysis } as T }
    }

    // Shape: { success, items, total, page, limit, total_pages } — public browse endpoint
    // (spreads PaginatedResponse at root level instead of nesting under `data`)
    if ('items' in json && !('data' in json)) {
      return {
        success: true,
        data: {
          items: json.items,
          total: json.total,
          page: json.page,
          limit: json.limit,
          total_pages: json.total_pages,
        } as T,
      }
    }

    return json as ApiResponse<T>
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { success: false, error: message }
  }
}


// ─── Typed API Functions ──────────────────────────────────────────────────────

// Auth
export const authApi = {
  session: () => apiFetch<User>('/api/auth/session'),
  login: (email: string, password: string) =>
    apiFetch<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: Record<string, unknown>) =>
    apiFetch<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () => apiFetch<null>('/api/auth/logout', { method: 'POST' }),
}

// Public
export const publicApi = {
  stats: () => apiFetch<PublicStats>('/api/public/stats'),
  departments: () => apiFetch<Department[]>('/api/departments'),
  categories: () => apiFetch<AICategory[]>('/api/ai-categories'),
  supervisors: (departmentId?: string) =>
    apiFetch<Supervisor[]>(`/api/supervisors${departmentId ? `?department_id=${departmentId}` : ''}`),
}

// Projects
export const projectsApi = {
  list: (params?: {
    query?: string
    author?: string
    department_id?: string
    ai_category?: string
    year?: string
    page?: number
    limit?: number
    sort?: string
  }) => {
    const search = new URLSearchParams()
    if (params?.query) search.set('query', params.query)
    if (params?.author) search.set('author', params.author)
    if (params?.department_id) search.set('department_id', params.department_id)
    if (params?.ai_category) search.set('ai_category', params.ai_category)
    if (params?.year) search.set('year', params.year)
    if (params?.sort) search.set('sort', params.sort)
    if (params?.page) search.set('page', String(params.page))
    if (params?.limit) search.set('limit', String(params.limit))
    const qs = search.toString()
    return apiFetch<PaginatedResponse<Project>>(`/api/projects/public${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => apiFetch<Project>(`/api/projects/${id}/public`),
  myProjects: () => apiFetch<Project[]>('/api/projects'),
  /**
   * Create a new project submission.
   * Backend expects multipart/form-data with exactly two keys:
   *   - `file`     — the PDF blob
   *   - `metadata` — JSON-stringified { title, abstract, supervisor_id, github_url, live_url, co_authors, student_tags }
   */
  create: (file: File, metadata: Record<string, unknown>) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('metadata', JSON.stringify(metadata))
    return apiFetch<Project>('/api/projects', { method: 'POST', body: fd })
  },
  /**
   * Edit a pending project (PATCH /api/projects/:id).
   * Backend expects multipart/form-data with the same `file` + `metadata` shape.
   */
  update: (id: string, file: File | null, metadata: Record<string, unknown>) => {
    const fd = new FormData()
    if (file) fd.append('file', file)
    fd.append('metadata', JSON.stringify(metadata))
    return apiFetch<Project>(`/api/projects/${id}`, { method: 'PATCH', body: fd })
  },
  delete: (id: string) => apiFetch<null>(`/api/projects/${id}`, { method: 'DELETE' }),
  versions: (id: string) => apiFetch<ProjectVersion[]>(`/api/projects/${id}/versions`),
  related: (id: string, category?: string) =>
    apiFetch<Project[]>(`/api/projects/${id}/related${category ? `?category=${category}` : ''}`),
  /**
   * Submit a change request (POST /api/projects/:id/change-request).
   * This endpoint uses its own distinct FormData shape:
   *   - `fields`       — JSON-stringified array of field keys, e.g. ["title","abstract"]
   *   - `reason`       — plain string
   *   - `proposedData` — JSON-stringified object of proposed values
   *   - `reportFile`   — optional PDF file (note: this route uses `reportFile`, not `file`)
   */
  requestChange: (projectId: string, formData: FormData) =>
    apiFetch<ChangeRequest>(`/api/projects/${projectId}/change-request`, { method: 'POST', body: formData }),
  /**
   * Submit a revision (POST /api/projects/:id/revision).
   * Backend expects: `file` (PDF) + `metadata` JSON string containing { notes }.
   */
  submitRevision: (projectId: string, file: File, notes: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('metadata', JSON.stringify({ notes }))
    return apiFetch<Project>(`/api/projects/${projectId}/revision`, { method: 'POST', body: fd })
  },
  /**
   * Resubmit a rejected project (POST /api/projects/:id/resubmit).
   * Backend expects: `file` (PDF) + `metadata` JSON string containing { notes }.
   */
  resubmit: (projectId: string, file: File, notes: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('metadata', JSON.stringify({ notes }))
    return apiFetch<Project>(`/api/projects/${projectId}/resubmit`, { method: 'POST', body: fd })
  },
  /**
   * Get project download URL and increment stats
   * Backend route: GET /api/projects/:id/download
   */
  download: (id: string) => apiFetch<{ url: string }>(`/api/projects/${id}/download`),
}

// Supervisor
export const supervisorApi = {
  projects: () => apiFetch<Project[]>('/api/supervisor/projects'),
  changeRequests: () => apiFetch<ChangeRequest[]>('/api/supervisor/change-requests'),
  /**
   * Review a student submission: approve, request changes, or reject.
   * Backend route: PATCH /api/projects/:id/status (NOT /api/supervisor/projects/:id/status).
   * Requires non-empty `feedback` for all status transitions.
   */
  updateStatus: (projectId: string, status: string, feedback: string) =>
    apiFetch<Project>(`/api/projects/${projectId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, feedback }),
    }),
  approveChangeRequest: (id: string, response: string) =>
    apiFetch<ChangeRequest>(`/api/change-requests/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved', response }),
    }),
  denyChangeRequest: (id: string, response: string) =>
    apiFetch<ChangeRequest>(`/api/change-requests/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'denied', response }),
    }),
}

// Admin
export const adminApi = {
  users: (params?: { query?: string; role?: string; status?: string }) => {
    const search = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) search.set(key, val)
      })
    }
    return apiFetch<AdminUserRow[]>(`/api/admin/users?${search}`)
  },
  updateUserStatus: (id: string, status: string, reason: string) =>
    apiFetch<User>(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),
  verifyUser: (id: string) =>
    apiFetch<User>(`/api/admin/users/${id}/verify`, { method: 'PATCH' }),
  // Force-approve or unpublish a project (admin override)
  updateProjectStatus: (projectId: string, status: string, reason?: string) =>
    apiFetch<Project>(`/api/admin/projects/${projectId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),
  adminProjects: (params?: { query?: string; status?: string; department_id?: string }) => {
    const search = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) search.set(key, val)
      })
    }
    return apiFetch<Project[]>(`/api/admin/projects?${search}`)
  },
  departments: () => apiFetch<Department[]>('/api/admin/departments'),
  createDepartment: (name: string) =>
    apiFetch<Department>('/api/admin/departments', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateDepartment: (id: string, name: string) =>
    apiFetch<Department>(`/api/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteDepartment: (id: string) =>
    apiFetch<null>(`/api/admin/departments/${id}`, { method: 'DELETE' }),
  aiCategories: () => apiFetch<AICategory[]>('/api/admin/ai-categories'),
  createCategory: (name: string) =>
    apiFetch<AICategory>('/api/admin/ai-categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateCategory: (id: string, name: string) =>
    apiFetch<AICategory>(`/api/admin/ai-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteCategory: (id: string) =>
    apiFetch<null>(`/api/admin/ai-categories/${id}`, { method: 'DELETE' }),
}

// AI
export const aiApi = {
  assistant: (message: string, history: { role: string; content: string }[] = [], pageContext: { path: string; role?: string; projectId?: string; pdfText?: string } = { path: '/' }) =>
    apiFetch<{ reply: string }>('/api/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ message, history, pageContext }),
    }),
  elara: (message: string, history?: { role: string; content: string }[]) =>
    apiFetch<{ reply: string }>('/api/ai/elara', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
  suggestCategories: (query: string) =>
    apiFetch<{ suggestions: string[] }>('/api/ai/suggest-categories', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  validate: (title: string, abstract: string, file: File | null, pdfText?: string) => {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('abstract', abstract)
    if (file) formData.append('file', file)
    if (pdfText) formData.append('pdfText', pdfText)
    return apiFetch<{ valid: boolean; category: string; tags: string[]; message?: string; suggested_prompt?: string; pdfText?: string; plagiarismData?: { score: number, similarProjectId?: string, similarityReason?: string } }>('/api/ai/validate', {
      method: 'POST',
      body: formData,
    })
  },
  summary: (projectId: string) =>
    apiFetch<{ summary: string }>(`/api/projects/${projectId}/ai/summary`, { method: 'POST' }),
  analysis: (projectId: string) =>
    apiFetch<{ analysis: { limitations: string[]; suggested_improvements: string[]; future_research: string[] } }>(
      `/api/projects/${projectId}/ai/analysis`,
      { method: 'POST' }
    ),
  chat: (projectId: string, message: string, history?: { role: string; content: string }[]) =>
    apiFetch<{ reply: string }>(`/api/projects/${projectId}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),
}

// Helper to map backend CommentNode matches to frontend Comment interface
function mapCommentNode(node: any): Comment {
  return {
    id: node.id,
    project_id: node.project_id,
    author_id: node.user_id || node.author_id,
    author_name: node.user?.full_name || node.author_name || null,
    author_role: (node.user?.role || node.author_role || 'public') as any,
    author_display_name: node.user?.display_name || node.author_display_name || null,
    is_admin: node.tier === 'admin' || !!node.is_admin,
    is_supervisor: node.tier === 'supervisor' || !!node.is_supervisor,
    is_author: node.tier === 'author' || !!node.is_author,
    content: node.content,
    is_deleted: !!node.is_deleted,
    parent_id: node.parent_id,
    replies: (node.replies || []).map(mapCommentNode),
    created_at: node.created_at,
    updated_at: node.updated_at,
  }
}

// Comments
export const commentsApi = {
  list: (projectId: string) =>
    apiFetch<any[]>(`/api/projects/${projectId}/comments`).then(res => {
      if (!res.success) return res;
      return { ...res, data: res.data.map(mapCommentNode) };
    }),
  create: (projectId: string, content: string, parentId?: string) =>
    apiFetch<any>(`/api/projects/${projectId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_id: parentId }),
    }).then(res => {
      if (!res.success) return res;
      return { ...res, data: mapCommentNode(res.data) };
    }),
  update: (commentId: string, content: string) =>
    apiFetch<any>(`/api/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }).then(res => {
      if (!res.success) return res;
      return { ...res, data: mapCommentNode(res.data) };
    }),
  delete: (commentId: string) =>
    apiFetch<null>(`/api/comments/${commentId}`, { method: 'DELETE' }),
}

// Users
export const usersApi = {
  get: (id: string) => apiFetch<User>(`/api/users/${id}`),
  update: (id: string, data: Partial<User>) =>
    apiFetch<User>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  /**
   * Look up a student by their matriculation number.
   * Used for the teammate search on the Upload flow.
   * Backend route: GET /api/users/lookup?matric_no=
   */
  lookup: (matricNo: string) =>
    apiFetch<{ id: string; full_name: string; display_name: string | null; matric_no: string }>(
      `/api/users/lookup?matric_no=${encodeURIComponent(matricNo)}`
    ),
}

// Bookmarks
export const bookmarksApi = {
  list: () => apiFetch<Project[]>('/api/bookmarks'),
  add: (projectId: string) =>
    apiFetch<null>('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId }),
    }),
  remove: (projectId: string) =>
    apiFetch<null>(`/api/bookmarks/${projectId}`, { method: 'DELETE' }),
  check: (projectId: string) =>
    apiFetch<{ is_bookmarked: boolean }>(`/api/bookmarks/${projectId}`),
}

// Notifications
export const notificationsApi = {
  list: () => apiFetch<Notification[]>('/api/notifications'),
  markAllRead: () =>
    apiFetch<null>('/api/notifications/read-all', { method: 'POST' }),
}

export { apiFetch }
