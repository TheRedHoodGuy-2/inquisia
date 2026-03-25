import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  SquaresFour, FolderOpen, UploadSimple, User, Gear,
  ClockCounterClockwise, CheckCircle, XCircle, Users,
  GitDiff, BookmarkSimple, MagnifyingGlass, Robot,
  CaretDown, CaretUp, WarningCircle, ChatText, ArrowUpRight,
  DownloadSimple, CalendarBlank, Star, Sparkle, Tray,
} from 'phosphor-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSession } from '../../context/SessionContext'
import { projectsApi, supervisorApi, aiApi } from '../../lib/api'
import type { Project, ProjectVersion, ProjectAuthor, ChangeRequest } from '../../lib/types'
import { getCategoryStyle, relativeTime, formatNumber, getAvatarColor, getInitials } from '../../lib/utils'
import { useTheme } from '../../context/ThemeContext'
import { SkeletonDashboardCard } from '../components/SkeletonPrimitives'
import { RevisionModal } from '../components/RevisionModal'
import { ChangeRequestModal } from '../components/ChangeRequestModal'
import { ChangeRequestReviewPanel } from '../components/ChangeRequestReviewPanel'
import { toast } from 'sonner'
import { ElaraLogo } from '../components/ui/ElaraLogo'
import { DashboardLayout, SidebarItem } from '../components/layout/DashboardLayout'

// ─── Status palette — functional only, muted ──────────────────────────────────

const STATUS_COLORS: Record<string, { border: string; badge: string; text: string; label: string }> = {
  pending: { border: '#C9D0DA', badge: '#F4F6F9', text: '#374151', label: 'Pending Review' },
  approved: { border: '#0066FF', badge: '#EBF2FF', text: '#0052CC', label: 'Approved' },
  changes_requested: { border: '#C9D0DA', badge: '#F4F6F9', text: '#374151', label: 'Changes Requested' },
  rejected: { border: '#C9D0DA', badge: '#F4F6F9', text: '#374151', label: 'Rejected' },
}



// ─── Version timeline ─────────────────────────────────────────────────────────

function VersionTimeline({ versions }: { versions: ProjectVersion[] }) {
  return (
    <div className="space-y-3 pl-3">
      {versions.map((v, i) => {
        const statusColor = STATUS_COLORS[v.status]
        const isCurrent = i === versions.length - 1
        return (
          <div key={v.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${isCurrent ? 'bg-[#0066FF]' : 'bg-[#E5E7EB] dark:bg-[#1C1C1C]'}`} />
              {i < versions.length - 1 && <div className="w-px flex-1 bg-[#E5E7EB] dark:bg-[#1C1C1C] my-1" style={{ minHeight: 20 }} />}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)' }}>
                  Version {v.version_number}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: statusColor?.badge, color: statusColor?.text, fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  {statusColor?.label}
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
                Submitted {relativeTime(v.created_at)}
              </p>
              {v.supervisor_feedback && (
                <p className="text-[12px] text-[#5C6370] dark:text-[#8B8FA8] mt-1 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {v.supervisor_feedback}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Student project card ─────────────────────────────────────────────────────

function StudentProjectCard({ project: initialProject, onDelete }: { project: Project, onDelete?: () => void }) {
  const navigate = useNavigate()
  const [project, setProject] = useState(initialProject)
  const [expanded, setExpanded] = useState(false)
  const [versions, setVersions] = useState<ProjectVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [revisionModal, setRevisionModal] = useState<'revision' | 'resubmit' | null>(null)
  const [changeModal, setChangeModal] = useState(false)

  const statusColors = STATUS_COLORS[project.status] ?? STATUS_COLORS.pending

  const handleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && versions.length === 0) {
      setLoadingVersions(true)
      const res = await projectsApi.versions(project.id)
      if (res.success) setVersions(res.data)
      setLoadingVersions(false)
    }
  }

  return (
    <div
      className="rounded-2xl bg-white dark:bg-[#101010] overflow-hidden border border-[#E5E7EB] dark:border-[#1C1C1C] border-l-4 transition-colors"
      style={{ borderLeftColor: statusColors.border, boxShadow: 'var(--shadow-card)' }}
    >
      <button onClick={() => void handleExpand()} className="w-full text-left p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="mb-1 line-clamp-1 text-[#0A0A0A] dark:text-[#F5F5F5]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px' }}>
              {project.title}
            </h3>
            <p className="text-[12px] text-[#9CA3AF] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Supervisor: {project.supervisor_name}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: statusColors.badge, color: statusColors.text, fontFamily: 'var(--font-body)' }}>
                {statusColors.label}
              </span>
              {project.plagiarism_score !== null && (
                <span className={`px-2 py-0.5 flex flex-row items-center gap-1 rounded-full text-[10px] ${project.plagiarism_score > 30 ? 'bg-[#FEF2F2] dark:bg-red-900/20 text-[#DC2626] dark:text-red-400' : 'bg-[#F0FDF4] dark:bg-green-900/20 text-[#16A34A] dark:text-green-400'}`}
                  style={{
                    fontFamily: 'var(--font-mono)',
                  }}>
                  {project.plagiarism_score}% similarity
                  {project.plagiarism_score > 30 && project.similar_project_id && <WarningCircle size={12} weight="fill" />}
                </span>
              )}
              <span className="text-[11px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
                {relativeTime(project.created_at)}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 text-[#9CA3AF]">
            {expanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-[#E5E7EB] dark:border-[#1C1C1C] pt-4">
              {(project.status === 'changes_requested' || project.status === 'rejected') && versions.length > 0 && (
                <div className={`rounded-2xl p-4 mb-4 flex gap-3 ${project.status === 'changes_requested' ? 'bg-[#FFFBEB] dark:bg-[#1C1200]' : 'bg-[#FEF2F2] dark:bg-[#1C0A0A]'
                  }`}>
                  <ChatText size={18} className={project.status === 'changes_requested' ? 'text-[#D97706]' : 'text-[#DC2626]'} />
                  <div>
                    <p className="text-[12px] font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: project.status === 'changes_requested' ? '#D97706' : '#DC2626' }}>
                      Supervisor Feedback
                    </p>
                    <p className="text-[13px] text-[#5C6370] dark:text-[#8B8FA8]" style={{ fontFamily: 'var(--font-body)' }}>
                      {versions[0]?.supervisor_feedback ?? 'Please review and resubmit.'}
                    </p>
                  </div>
                </div>
              )}

              {loadingVersions ? (
                <div className="text-center py-4">
                  <div className="w-5 h-5 rounded-full border-2 border-[#E5E7EB] border-t-[#0066FF] animate-spin mx-auto" />
                </div>
              ) : versions.length > 0 ? (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                    Version History
                  </p>
                  <VersionTimeline versions={versions} />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 mt-4">
                {project.status === 'pending' && (
                  <button onClick={() => {
                    if (window.confirm("Are you sure you want to permanently delete this pending submission?")) {
                      projectsApi.delete(project.id).then((res) => {
                        if (res.success) {
                          onDelete?.();
                          toast.success("Submission deleted successfully");
                        } else {
                          toast.error(res.error || 'Failed to delete submission');
                        }
                      })
                    }
                  }}
                    className="px-4 py-2 rounded-full text-[13px] border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                    Delete Submission
                  </button>
                )}
                {project.status === 'changes_requested' && (
                  <button onClick={() => setRevisionModal('revision')}
                    className="px-4 py-2 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] transition-colors"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                    Submit Revision
                  </button>
                )}
                {project.status === 'rejected' && (
                  <button onClick={() => setRevisionModal('resubmit')}
                    className="px-4 py-2 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] transition-colors"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                    Resubmit
                  </button>
                )}
                {project.status === 'approved' && (
                  <>
                    <button onClick={() => setChangeModal(true)}
                      className="px-4 py-2 rounded-full text-[13px] border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#5C6370] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
                      style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                      Request Changes
                    </button>
                    <Link to={`/projects/${project.id}`}
                      className="px-4 py-2 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] transition-colors"
                      style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                      View Live
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {revisionModal && (
        <RevisionModal
          project={project}
          mode={revisionModal}
          onClose={() => setRevisionModal(null)}
          onSuccess={(updated) => { setProject(updated); setRevisionModal(null) }}
        />
      )}

      {changeModal && (
        <ChangeRequestModal
          project={project}
          onClose={() => setChangeModal(false)}
        />
      )}
    </div>
  )
}

// ─── Student quick-action card ────────────────────────────────────────────────

function QuickActionCard({ icon, label, desc, href, color }: {
  icon: React.ReactNode
  label: string
  desc: string
  href: string
  color: string
}) {
  return (
    <Link to={href}
      className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] hover:border-[#0066FF] hover:shadow-[0_4px_16px_rgba(0,102,255,0.08)] transition-all duration-150 group"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] group-hover:text-[#0066FF] transition-colors" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{label}</p>
        <p className="text-[12px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{desc}</p>
      </div>
      <ArrowUpRight size={16} className="text-[#9CA3AF] group-hover:text-[#0066FF] flex-shrink-0 mt-0.5 transition-colors" />
    </Link>
  )
}

// ─── Student dashboard ────────────────────────────────────────────────────────

function StudentDashboard({ firstName, userId }: { firstName: string; userId: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    projectsApi.myProjects().then((res) => {
      if (res.success) setProjects(res.data)
      setLoading(false)
    })
  }, [])

  const pendingCount = projects.filter((p) => p.status === 'pending').length
  const approvedCount = projects.filter((p) => p.status === 'approved').length
  const changesCount = projects.filter((p) => p.status === 'changes_requested' || p.status === 'rejected').length

  const sidebarItems: SidebarItem[] = [
    { icon: <SquaresFour size={18} />, label: 'Overview', key: 'overview' },
    {
      icon: <FolderOpen size={18} />, label: 'My Projects', key: 'projects',
      badge: projects.filter((p) => p.status === 'pending' || p.status === 'changes_requested').length || undefined
    },
    { icon: <UploadSimple size={18} />, label: 'Upload New', key: 'upload', href: '/upload' },
    { icon: <User size={18} />, label: 'Profile', key: 'profile', href: `/profile/${userId}` },
    { icon: <BookmarkSimple size={18} />, label: 'Bookmarks', key: 'bookmarks', href: '/bookmarks' },
    { icon: <Gear size={18} />, label: 'Settings', key: 'settings', href: '/settings' },
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label: 'Total', value: projects.length },
    { label: 'Approved', value: approvedCount },
    { label: 'Pending', value: pendingCount },
    { label: 'Action Required', value: changesCount },
  ]

  return (
    <DashboardLayout
      activeSection={activeSection}
      onNavigate={setActiveSection}
      sidebarItems={sidebarItems}
    >
      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div key="overview">
          <div className="mb-8">
            <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5] mb-1"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '28px', letterSpacing: '-0.02em' }}>
              {greeting}, {firstName}.
            </h1>
            <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
              {changesCount > 0
                ? `You have ${changesCount} project${changesCount > 1 ? 's' : ''} requiring attention.`
                : 'Everything looks good — keep up the great work.'}
            </p>
          </div>

          {/* Action required alert — students only */}
          {changesCount > 0 && (
            <div className="rounded-2xl bg-[#EBF2FF] dark:bg-[#0A1628] border border-[#0066FF33] p-4 mb-6 flex items-start gap-3">
              <WarningCircle size={20} className="text-[#0066FF] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] text-[#0066FF]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Action Required</p>
                <p className="text-[12px] text-[#0066FF]/70 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {changesCount} project{changesCount > 1 ? 's need' : ' needs'} your attention — upload a revision or resubmit.
                </p>
              </div>
              <button onClick={() => setActiveSection('projects')} className="ml-auto flex-shrink-0 text-[12px] text-[#0066FF] hover:underline" style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                View projects
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {stats.map((stat) => (
              <div key={stat.label}
                className="flex flex-col gap-1 p-4 rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C]"
                style={{ boxShadow: 'var(--shadow-card)' }}>
                <span className="text-[24px] text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1.1 }}>{stat.value}</span>
                <span className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <h2 className="text-[15px] text-[#0A0A0A] dark:text-[#F5F5F5] mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <QuickActionCard icon={<UploadSimple size={20} />} label="Upload New Project" desc="Submit your final year project" href="/upload" color="#0066FF" />
            <QuickActionCard icon={<MagnifyingGlass size={20} />} label="Browse Repository" desc="Explore approved projects" href="/projects" color="#0066FF" />
            <QuickActionCard icon={<BookmarkSimple size={20} />} label="My Bookmarks" desc="Projects you've saved" href="/bookmarks" color="#0066FF" />
            <QuickActionCard icon={<ElaraLogo className="w-5 h-5" />} label="Ask Elara" desc="AI research assistant" href="/elara" color="#0066FF" />
          </div>

          {/* Recent projects */}
          {projects.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Recent Projects</h2>
                <button onClick={() => setActiveSection('projects')} className="text-[13px] text-[#0066FF] hover:underline" style={{ fontFamily: 'var(--font-body)' }}>
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {projects.slice(0, 2).map((p) => <StudentProjectCard key={p.id} project={p} onDelete={() => setProjects(prev => prev.filter(proj => proj.id !== p.id))} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MY PROJECTS ── */}
      {activeSection === 'projects' && (
        <div key="projects">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em' }}>
                My Projects
              </h1>
              <p className="text-[13px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                {projects.length} project{projects.length !== 1 ? 's' : ''} submitted
              </p>
            </div>
            <Link to="/upload"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] transition-colors"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
              <UploadSimple size={15} /> Upload New
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">{[1, 2].map((i) => <SkeletonDashboardCard key={i} />)}</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#1C1C1C]">
              <FolderOpen size={48} weight="thin" className="text-[#9CA3AF] mx-auto mb-4" />
              <h3 className="text-[16px] text-[#0A0A0A] dark:text-[#F5F5F5] mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>No projects yet</h3>
              <p className="text-[14px] text-[#9CA3AF] mb-5" style={{ fontFamily: 'var(--font-body)' }}>Upload your first project to get started.</p>
              <Link to="/upload"
                className="px-5 py-2.5 rounded-full text-[14px] text-white bg-[#0066FF] hover:bg-[#0052CC] transition-colors inline-block"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                Upload a Project
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((p) => <StudentProjectCard key={p.id} project={p} onDelete={() => setProjects(prev => prev.filter(proj => proj.id !== p.id))} />)}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}

// ─── Supervisor project row ────────────────────────────────────────────────────

function SupervisorProjectRow({ project }: { project: Project }) {
  const { isDark } = useTheme()
  const statusColors = STATUS_COLORS[project.status]
  const catStyle = project.ai_category ? getCategoryStyle(project.ai_category, isDark) : null
  const daysOld = Math.floor((Date.now() - new Date(project.updated_at).getTime()) / (24 * 60 * 60 * 1000))
  const isStale = daysOld > 7 && project.status === 'pending'
  const [comparing, setComparing] = useState(false)
  const [comparison, setComparison] = useState<string | null>(null)

  const hasVersions = project.version != null && project.version > 1

  const handleCompare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (comparing) return
    setComparing(true)
    setComparison(null)
    const res = await aiApi.compareVersions(project.id)
    if (res.success) {
      setComparison(res.data.comparison)
    } else {
      setComparison(`Could not compare versions: ${res.error}`)
    }
    setComparing(false)
  }

  return (
    <div
      className="rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] overflow-hidden transition-all duration-150"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <Link to={`/projects/${project.id}`}
        className="block p-5 hover:bg-[#F7F8FA] dark:hover:bg-[#181818] transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="mb-1 line-clamp-1 text-[#0A0A0A] dark:text-[#F5F5F5]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px' }}>
              {project.title}
            </h3>
            <p className="text-[12px] text-[#9CA3AF] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              {project.authors.map((a) => a.full_name ?? a.display_name).join(', ')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {statusColors && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{ backgroundColor: statusColors.badge, color: statusColors.text, fontFamily: 'var(--font-body)' }}>
                  {statusColors.label}
                </span>
              )}
              {catStyle && project.ai_category && (
                <span className="px-2.5 py-1 rounded-full text-[11px]"
                  style={{ backgroundColor: catStyle.bg, color: catStyle.text, fontFamily: 'var(--font-body)' }}>
                  {project.ai_category}
                </span>
              )}
              {isStale && (
                <span className="flex items-center gap-1 text-[11px] text-[#D97706]">
                  <WarningCircle size={12} />{daysOld} days pending
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            {project.plagiarism_score !== null && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] mb-1 ${project.plagiarism_score > 30 ? 'bg-[#FEF2F2] dark:bg-red-900/20 text-[#DC2626] dark:text-red-400' : 'bg-[#F0FDF4] dark:bg-green-900/20 text-[#16A34A] dark:text-green-400'}`}
                style={{ fontFamily: 'var(--font-mono)' }}>
                {project.plagiarism_score}%
                {project.plagiarism_score > 30 && project.similar_project_id && <WarningCircle size={13} weight="fill" />}
              </span>
            )}
            <p className="text-[11px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{relativeTime(project.updated_at)}</p>
          </div>
        </div>
      </Link>

      {/* Elara version comparison — only shown when project has been revised */}
      {hasVersions && (
        <div className="border-t border-[#E5E7EB] dark:border-[#1C1C1C] px-5 py-3">
          {!comparison ? (
            <button
              onClick={(e) => void handleCompare(e)}
              disabled={comparing}
              className="flex items-center gap-2 text-[12px] text-[#0066FF] hover:underline disabled:opacity-60"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
            >
              {comparing ? (
                <><div className="w-3 h-3 rounded-full border-2 border-[#0066FF]/30 border-t-[#0066FF] animate-spin" />Elara is comparing versions...</>
              ) : (
                <><Sparkle size={13} weight="fill" />Compare versions with Elara</>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0066FF] uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                  <Sparkle size={11} weight="fill" /> Elara's Version Analysis
                </span>
                <button onClick={() => setComparison(null)} className="text-[11px] text-[#9CA3AF] hover:text-[#5C6370]" style={{ fontFamily: 'var(--font-body)' }}>
                  Close
                </button>
              </div>
              <p className="text-[13px] text-[#5C6370] dark:text-[#8B8FA8] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)' }}>
                {comparison}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Student mini-card (for My Students section) ──────────────────────────────

function StudentMiniCard({ author, projectCount }: { author: ProjectAuthor; projectCount: number }) {
  const bg = getAvatarColor(author.id)
  const initials = getInitials(author.full_name ?? author.display_name)
  return (
    <Link to={`/profile/${author.id}`}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] hover:border-[#0066FF] transition-all duration-150 group"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
        style={{ backgroundColor: bg, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] group-hover:text-[#0066FF] transition-colors truncate"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          {author.full_name ?? author.display_name ?? 'Unknown Student'}
        </p>
        <p className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
          {author.matric_no ?? 'No matric no.'} · {projectCount} project{projectCount !== 1 ? 's' : ''}
        </p>
      </div>
      <ArrowUpRight size={16} className="text-[#9CA3AF] group-hover:text-[#0066FF] flex-shrink-0 transition-colors" />
    </Link>
  )
}

// ─── Supervisor dashboard ─────────────────────────────────────────────────────

function SupervisorDashboard({ firstName, userId }: { firstName: string; userId: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')
  const { user } = useSession()

  useEffect(() => {
    Promise.all([
      supervisorApi.projects(),
      supervisorApi.changeRequests(),
    ]).then(([projRes, crRes]) => {
      if (projRes.success) setProjects(projRes.data)
      if (crRes.success) setChangeRequests(crRes.data)
      setLoading(false)
    })
  }, [])

  // Unverified guard
  if (user && !user.is_verified) {
    return (
      <div className="text-center py-24">
        <ClockCounterClockwise size={56} weight="thin" className="text-[#9CA3AF] mx-auto mb-5" />
        <h2 className="text-[22px] mb-3 text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          Account Pending Verification
        </h2>
        <p className="text-[15px] text-[#9CA3AF] max-w-md mx-auto" style={{ fontFamily: 'var(--font-body)', lineHeight: 1.65 }}>
          Your account is pending verification by an administrator. You will receive access once verified.
        </p>
      </div>
    )
  }

  const pending = projects.filter((p) => p.status === 'pending')
  const changes = projects.filter((p) => p.status === 'changes_requested')
  const approved = projects.filter((p) => p.status === 'approved')
  const rejected = projects.filter((p) => p.status === 'rejected')
  const pendingCRs = changeRequests.filter((cr) => cr.status === 'pending')

  const handleCRResolved = (id: string) => {
    setChangeRequests((prev) => prev.filter((cr) => cr.id !== id))
  }

  // Derive unique students from project authors
  const studentMap = new Map<string, { author: ProjectAuthor; count: number }>()
  projects.forEach((p) => {
    p.authors.forEach((a) => {
      const existing = studentMap.get(a.id)
      if (existing) existing.count++
      else studentMap.set(a.id, { author: a, count: 1 })
    })
  })
  const students = Array.from(studentMap.values())

  const sidebarItems: SidebarItem[] = [
    { icon: <SquaresFour size={18} />, label: 'Overview', key: 'overview' },
    { icon: <ClockCounterClockwise size={18} />, label: 'Pending Review', key: 'pending', badge: pending.length || undefined },
    { icon: <GitDiff size={18} />, label: 'Changes Requested', key: 'changes', badge: changes.length || undefined },
    { icon: <Tray size={18} />, label: 'Student Requests', key: 'studentrequests', badge: pendingCRs.length || undefined },
    { icon: <CheckCircle size={18} />, label: 'Approved', key: 'approved' },
    { icon: <XCircle size={18} />, label: 'Rejected', key: 'rejected' },
    { icon: <Users size={18} />, label: 'My Students', key: 'students', badge: students.length || undefined },
  ]

  const statCards = [
    { label: 'Total', value: projects.length },
    { label: 'Pending', value: pending.length },
    { label: 'Approved', value: approved.length },
    { label: 'Requests', value: pendingCRs.length },
  ]

  // Re-usable empty state
  const EmptyList = ({ label }: { label: string }) => (
    <div className="text-center py-16 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#1C1C1C]">
      <FolderOpen size={44} weight="thin" className="text-[#9CA3AF] mx-auto mb-3" />
      <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>No {label} projects.</p>
    </div>
  )

  const sectionTitle: Record<string, string> = {
    pending: `Pending Review (${pending.length})`,
    changes: `Change Requests (${changes.length})`,
    approved: `Approved (${approved.length})`,
    rejected: `Rejected (${rejected.length})`,
  }

  const sectionData: Record<string, Project[]> = { pending, changes, approved, rejected }

  const activeList = (() => {
    switch (activeSection) {
      case 'pending': return pending
      case 'changes': return changes
      case 'approved': return approved
      case 'rejected': return rejected
      default: return []
    }
  })()

  return (
    <DashboardLayout
      activeSection={activeSection}
      onNavigate={setActiveSection}
      sidebarItems={sidebarItems}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5] mb-1"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '28px', letterSpacing: '-0.02em' }}>
            Hello, {firstName}.
          </h1>
          <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
            {activeSection === 'overview'
              ? `You have ${pending.length} project${pending.length !== 1 ? 's' : ''} awaiting review.`
              : `Reviewing ${activeList.length} ${activeSection} project${activeList.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
      </div>

      {activeSection === 'overview' && (
        <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {statCards.map((s) => (
              <div key={s.label}
                className="flex flex-col gap-1 p-4 rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C]"
                style={{ boxShadow: 'var(--shadow-card)' }}>
                <span className="text-[24px] text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1.1 }}>{s.value}</span>
                <span className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <h2 className="text-[15px] text-[#0A0A0A] dark:text-[#F5F5F5] mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <QuickActionCard icon={<MagnifyingGlass size={20} />} label="Browse Repository" desc="Explore approved projects" href="/projects" color="#0066FF" />
            <QuickActionCard icon={<BookmarkSimple size={20} />} label="My Bookmarks" desc="Projects you've saved" href="/bookmarks" color="#0066FF" />
            <QuickActionCard icon={<ElaraLogo className="w-5 h-5" />} label="Ask Elara" desc="AI research assistant" href="/elara" color="#0066FF" />
          </div>

          {/* Student change requests alert */}
          {pendingCRs.length > 0 && (
            <div className="rounded-2xl bg-[#FFFBEB] dark:bg-[#1C1200] border border-[#FDE68A] dark:border-[#7C5E00] p-4 mb-6 flex items-start gap-3">
              <Tray size={20} className="text-[#D97706] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[13px] text-[#D97706]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {pendingCRs.length} Student Change Request{pendingCRs.length > 1 ? 's' : ''}
                </p>
                <p className="text-[12px] text-[#D97706]/70 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  Students have requested edits to their approved projects. Review each diff and approve or deny.
                </p>
              </div>
              <button
                onClick={() => setActiveSection('studentrequests')}
                className="flex-shrink-0 text-[12px] text-[#D97706] hover:underline"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}
              >
                Review
              </button>
            </div>
          )}

          {/* Recent pending */}
          {pending.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Needs Review</h2>
                <button onClick={() => setActiveSection('pending')} className="text-[13px] text-[#0066FF] hover:underline" style={{ fontFamily: 'var(--font-body)' }}>
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {pending.slice(0, 3).map((p) => <SupervisorProjectRow key={p.id} project={p} />)}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* ── FILTERED SECTIONS (pending / changes / approved / rejected) ── */}
      {(['pending', 'changes', 'approved', 'rejected'] as const).map((key) => (
        activeSection === key && (
          <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="mb-6">
              <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em' }}>
                {sectionTitle[key]}
              </h1>
            </div>
            {loading ? (
              <div className="space-y-4">{[1, 2, 3].map((i) => <SkeletonDashboardCard key={i} />)}</div>
            ) : sectionData[key].length === 0 ? (
              <div className="text-center py-20 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#1C1C1C]">
                <Tray size={48} weight="thin" className="text-[#9CA3AF] mx-auto mb-4" />
                <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>No projects in this section.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sectionData[key].map((p) => <SupervisorProjectRow key={p.id} project={p} />)}
              </div>
            )}
          </motion.div>
        )
      ))}

      {/* ── STUDENT CHANGE REQUESTS ── */}
      {activeSection === 'studentrequests' && (
        <motion.div key="studentrequests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="mb-6">
            <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em' }}>
              Student Change Requests ({pendingCRs.length})
            </h1>
            <p className="text-[13px] text-[#9CA3AF] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Review each request to see what the student wants to change on their approved project.
            </p>
          </div>
          {loading ? (
            <div className="space-y-4">{[1, 2].map((i) => <SkeletonDashboardCard key={i} />)}</div>
          ) : pendingCRs.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#1C1C1C]">
              <Tray size={44} weight="thin" className="text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
                No pending change requests — you're all caught up.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCRs.map((cr) => {
                const relatedProject = projects.find((p) => p.id === cr.project_id)
                return (
                  <ChangeRequestReviewPanel
                    key={cr.id}
                    changeRequest={cr}
                    project={relatedProject}
                    onResolved={handleCRResolved}
                  />
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── MY STUDENTS ── */}
      {activeSection === 'students' && (
        <motion.div key="students" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="mb-6">
            <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em' }}>
              My Students ({students.length})
            </h1>
            <p className="text-[13px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              Students who have submitted projects under your supervision.
            </p>
          </div>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonDashboardCard key={i} />)}</div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#1C1C1C]">
              <Users size={44} weight="thin" className="text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>No students yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {students.map(({ author, count }) => (
                <StudentMiniCard key={author.id} author={author} projectCount={count} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </DashboardLayout>
  )
}

// ─── Page entry ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user, isLoading } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !user) navigate('/login?return=/dashboard')
    if (!isLoading && user?.role === 'admin') navigate('/admin')
    if (!isLoading && user?.role === 'public') navigate(`/profile/${user.id}`)
  }, [user, isLoading, navigate])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#E5E7EB] border-t-[#0066FF] animate-spin" />
      </div>
    )
  }

  if (user.role === 'public' || user.role === 'admin') return null

  const firstName = (user.display_name ?? user.full_name ?? 'there').split(' ')[0]

  return user.role === 'supervisor'
    ? <SupervisorDashboard firstName={firstName} userId={user.id} />
    : <StudentDashboard firstName={firstName} userId={user.id} />
}