// ─── Core Enums ───────────────────────────────────────────────────────────────

export type AccountStatus = 'active' | 'warned' | 'restricted' | 'banned'
export type UserRole = 'student' | 'supervisor' | 'admin' | 'public'
export type ProjectStatus =
  | 'pending'
  | 'approved'
  | 'changes_requested'
  | 'rejected'

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserLink {
  title: string
  url: string
}

export interface User {
  id: string
  email: string
  role: UserRole
  full_name: string | null
  display_name: string | null
  bio: string | null
  links: UserLink[]
  matric_no: string | null
  staff_id: string | null
  degrees: string | null
  level: string | null
  department_id: string | null
  is_verified: boolean
  is_active: boolean
  account_status: AccountStatus
  status_reason: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface ProjectAuthor {
  id: string
  full_name: string | null
  display_name: string | null
  matric_no: string | null
  role_description: string | null
}

export interface ProjectVersion {
  id: string
  project_id: string
  version_number: number
  status: ProjectStatus
  supervisor_feedback: string | null
  created_at: string
  report_url: string | null
  plagiarism_score: number | null
}

export interface Project {
  id: string
  title: string
  abstract: string
  pdf_text: string | null
  student_tags: string[]
  ai_tags: string[]
  ai_category: string | null
  department_id: string | null
  department_name: string | null
  year: number
  status: ProjectStatus
  plagiarism_score: number | null
  similar_project_id?: string | null
  similarity_reason?: string | null
  github_url: string | null
  live_url: string | null
  report_url: string | null
  download_count: number
  supervisor_id: string | null
  supervisor_name: string | null
  supervisor_degrees: string | null
  authors: ProjectAuthor[]
  ai_summary: string | null
  ai_analysis: AIAnalysis | null
  created_at: string
  updated_at: string
  approved_at: string | null
}

export interface AIAnalysis {
  limitations: string[]
  suggested_improvements: string[]
  future_research: string[]
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  project_id: string
  author_id: string
  author_name: string | null
  author_role: UserRole
  author_display_name: string | null
  is_admin: boolean
  is_supervisor: boolean
  is_author: boolean
  content: string
  is_deleted: boolean
  parent_id: string | null
  replies: Comment[]
  created_at: string
  updated_at: string
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  type:
  | 'project_approved'
  | 'changes_requested'
  | 'project_rejected'
  | 'new_comment'
  | 'change_request_approved'
  | 'change_request_denied'
  | 'teammate_added'
  title: string
  message: string
  is_read: boolean
  link: string | null
  created_at: string
}

// ─── Department / Category ────────────────────────────────────────────────────

export interface Department {
  id: string
  name: string
}

export interface AICategory {
  name: string
}

export interface Supervisor {
  id: string
  full_name: string | null
  display_name: string | null
  degrees: string | null
  departments: string[]
}

// ─── Change Request ───────────────────────────────────────────────────────────

export interface ChangeRequest {
  id: string
  project_id: string
  student_id: string
  fields: string[]
  reason: string
  proposed_data: Record<string, unknown>
  status: 'pending' | 'approved' | 'denied'
  response: string | null
  created_at: string
  updated_at: string
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ─── API Response Envelope ────────────────────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PublicStats {
  total_projects: number
  total_students: number
  total_supervisors: number
  total_downloads: number
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUserRow extends User {
  project_count: number
}
