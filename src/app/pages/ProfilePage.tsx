import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { ArrowUpRight, DownloadSimple, CalendarBlank, PencilSimple, X, Plus, Link as LinkIcon, ArrowLeft } from 'phosphor-react'
import { motion, AnimatePresence } from 'motion/react'
import { usersApi, projectsApi } from '../../lib/api'
import type { User, Project, UserLink } from '../../lib/types'
import { useSession } from '../../context/SessionContext'
import { useTheme } from '../../context/ThemeContext'
import { getAvatarColor, getInitials, getCategoryStyle, formatNumber } from '../../lib/utils'
import { SkeletonBlock, SkeletonText } from '../components/SkeletonPrimitives'
import { toast } from 'sonner'

function UserAvatar({ user, size = 96 }: { user: User; size?: number }) {
  const bg = getAvatarColor(user.id)
  const initials = getInitials(user.full_name ?? user.display_name)
  if (user.avatar_url) {
    return (
      <div className="rounded-full overflow-hidden ring-4 ring-white dark:ring-[#101010] flex-shrink-0"
        style={{ width: size, height: size, backgroundColor: bg }}>
        <img src={user.avatar_url} alt={user.display_name ?? user.full_name ?? 'Avatar'} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-[#101010]"
      style={{ width: size, height: size, backgroundColor: bg, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.35 }}>
      {initials}
    </div>
  )
}

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  student: { label: 'Student', color: '#0066FF', bg: '#EBF2FF' },
  supervisor: { label: 'Supervisor', color: '#7C3AED', bg: '#EDE9FE' },
  admin: { label: 'Admin', color: '#DC2626', bg: '#FEF2F2' },
  public: { label: 'Researcher', color: '#059669', bg: '#D1FAE5' },
}

function ProfileProjectCard({ project }: { project: Project }) {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  const allTags = [...(project.student_tags || []), ...(project.ai_tags || [])]
  const topCategory = project.ai_category ?? allTags[0] ?? 'Research'
  const catStyle = getCategoryStyle(topCategory, isDark)

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] p-5 cursor-pointer transition-all duration-150"
      style={{ boxShadow: hovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)', transform: hovered ? 'translateY(-2px)' : 'translateY(0)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: catStyle.bg, color: catStyle.text, fontFamily: 'var(--font-body)' }}>
          {topCategory}
        </span>
        <ArrowUpRight size={16} style={{ color: hovered ? '#0066FF' : '#9CA3AF' }} className="flex-shrink-0 transition-colors" />
      </div>
      <h3 className="mb-2 line-clamp-2 transition-colors duration-150"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: hovered ? '#0066FF' : undefined }}>
        {project.title}
      </h3>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-[12px] text-[#9CA3AF]"><DownloadSimple size={13} />{formatNumber(project.download_count)}</span>
        <span className="flex items-center gap-1 text-[12px] text-[#9CA3AF]"><CalendarBlank size={13} />{project.year}</span>
      </div>
    </div>
  )
}

// ─── Edit sheet ───────────────────────────────────────────────────────────────

function EditProfileSheet({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User) => void }) {
  const [displayName, setDisplayName] = useState(user.display_name ?? '')
  const [fullName, setFullName] = useState(user.full_name ?? '')
  const [bio, setBio] = useState(user.bio ?? '')
  const [links, setLinks] = useState<UserLink[]>(user.links ?? [])
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const res = await usersApi.update(user.id, { display_name: displayName, full_name: fullName, bio, links })
    if (res.success) {
      onSave(res.data)
      toast.success('Profile saved!')
      onClose()
    } else {
      toast.error('Failed to save profile.')
    }
    setSaving(false)
  }

  const addLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return
    setLinks((prev) => [...prev, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }])
    setNewLinkTitle('')
    setNewLinkUrl('')
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50" onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-[#101010] z-50 shadow-2xl rounded-l-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1C1C1C]">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }} className="text-[#0A0A0A] dark:text-[#F5F5F5]">
            Edit Profile
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F0F2F5] dark:hover:bg-[#181818]">
            <X size={16} className="text-[#9CA3AF]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div className="relative rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010]">
            <label htmlFor="edit-dn" className="absolute left-4 text-[11px] text-[#9CA3AF] top-1.5" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
              Display Name
            </label>
            <input id="edit-dn" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-transparent outline-none px-4 pt-5 pb-2 rounded-full text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5]"
              style={{ fontFamily: 'var(--font-body)' }} />
          </div>
          <div className="relative rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010]">
            <label htmlFor="edit-fn" className="absolute left-4 text-[11px] text-[#9CA3AF] top-1.5" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
              Full Name {user.role === 'public' ? '(optional)' : ''}
            </label>
            <input id="edit-fn" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-transparent outline-none px-4 pt-5 pb-2 rounded-full text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5]"
              style={{ fontFamily: 'var(--font-body)' }} />
          </div>
          <div className="relative rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] pt-7 px-4 pb-3">
            <label htmlFor="edit-bio" className="absolute left-4 top-2 text-[11px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>Bio</label>
            <textarea id="edit-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full bg-transparent outline-none text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] resize-none"
              style={{ fontFamily: 'var(--font-body)' }} />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-body)' }}>
              Profile Links
            </p>
            {links.length > 0 && (
              <div className="space-y-2 mb-3">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#F0F2F5] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#1C1C1C]">
                    <LinkIcon size={13} className="text-[#0066FF] flex-shrink-0" />
                    <span className="flex-1 text-[12px] text-[#0066FF] truncate" style={{ fontFamily: 'var(--font-body)' }}>{link.title}</span>
                    <span className="text-[11px] text-[#9CA3AF] truncate max-w-[120px]" style={{ fontFamily: 'var(--font-mono)' }}>{link.url.replace(/^https?:\/\//, '')}</span>
                    <button onClick={() => setLinks((prev) => prev.filter((_, li) => li !== i))}
                      className="p-1 rounded-full hover:bg-[#E5E7EB] dark:hover:bg-[#1C1C1C] text-[#9CA3AF] hover:text-red-500 transition-colors flex-shrink-0">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} placeholder="Label (e.g. GitHub)"
                className="flex-1 min-w-0 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] px-3 py-2 text-[12px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] outline-none focus:border-[#0066FF] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }} />
              <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." type="url"
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
                className="flex-1 min-w-0 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] px-3 py-2 text-[12px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] outline-none focus:border-[#0066FF] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }} />
              <button onClick={addLink} disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                className="px-3 py-2 rounded-full text-[12px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-40 transition-colors flex items-center gap-1 flex-shrink-0"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                <Plus size={12} />Add
              </button>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#E5E7EB] dark:border-[#1C1C1C]">
          <button onClick={() => void handleSave()} disabled={saving}
            className="w-full py-3 rounded-full text-[14px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 transition-colors"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser } = useSession()
  const [profile, setProfile] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    usersApi.get(id).then((res) => {
      if (res.success) setProfile(res.data)
      setLoading(false)
    })
    projectsApi.list({ limit: 20 }).then((res) => {
      if (res.success) {
        const userProjects = res.data.items.filter((p) => p.authors.some((a) => a.id === id) || p.supervisor_id === id)
        setProjects(userProjects)
      }
    })
  }, [id])

  const isOwnProfile = currentUser?.id === id

  if (loading) {
    return (
      <div className="max-w-[760px] mx-auto px-5 md:px-0 py-12">
        <SkeletonBlock className="w-24 h-4 rounded-full mb-8" />
        <div className="flex items-center gap-6 mb-10">
          <SkeletonBlock className="w-24 h-24 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <SkeletonText className="w-48 h-7 mb-2" />
            <SkeletonText className="w-24 h-5 mb-3" />
            <SkeletonText className="w-72 h-4" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-36 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-[760px] mx-auto px-5 py-20 text-center">
        <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>User not found.</p>
      </div>
    )
  }

  const displayName = profile.display_name ?? profile.full_name ?? 'Unknown User'
  const roleBadge = ROLE_BADGE[profile.role] ?? ROLE_BADGE.public

  return (
    <div className="max-w-[760px] mx-auto px-5 md:px-0 py-10">
      {/* Back link */}
      <Link
        to={isOwnProfile ? (currentUser?.role === 'supervisor' ? '/dashboard' : '/dashboard') : '/projects'}
        className="inline-flex items-center gap-1.5 text-[13px] text-[#9CA3AF] hover:text-[#0066FF] transition-colors mb-8"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <ArrowLeft size={14} />
        {isOwnProfile ? 'Back to dashboard' : 'Back'}
      </Link>

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
        <UserAvatar user={profile} size={96} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              {/* Name + role badge */}
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '26px', letterSpacing: '-0.02em' }}
                  className="text-[#0A0A0A] dark:text-[#F5F5F5]">
                  {displayName}
                </h1>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: roleBadge.bg, color: roleBadge.color, fontFamily: 'var(--font-body)' }}>
                  {roleBadge.label}
                </span>
              </div>

              {/* Full name if different from display name */}
              {profile.full_name && profile.full_name !== displayName && (
                <p className="text-[14px] text-[#9CA3AF] mb-2" style={{ fontFamily: 'var(--font-body)' }}>{profile.full_name}</p>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="text-[15px] text-[#5C6370] dark:text-[#8B8FA8] mb-4 max-w-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)', lineHeight: 1.65 }}>
                  {profile.bio}
                </p>
              )}

              {/* Role-specific metadata */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {profile.role === 'student' && profile.matric_no && (
                  <span className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-mono)' }}>{profile.matric_no}</span>
                )}
                {profile.role === 'student' && profile.level && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] bg-[#F0F2F5] dark:bg-[#181818] text-[#5C6370] dark:text-[#8B8FA8]" style={{ fontFamily: 'var(--font-body)' }}>
                    {profile.level} Level
                  </span>
                )}
                {profile.role === 'supervisor' && profile.degrees && (
                  <span className="text-[13px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{profile.degrees}</span>
                )}
              </div>

              {/* Links */}
              {profile.links && profile.links.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {profile.links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="text-[13px] text-[#0066FF] hover:underline flex items-center gap-1"
                      style={{ fontFamily: 'var(--font-body)' }}>
                      {link.title}
                      <ArrowUpRight size={12} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {isOwnProfile && (
              <button
                onClick={() => setEditOpen(true)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] text-[13px] text-[#5C6370] dark:text-[#8B8FA8] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
              >
                <PencilSimple size={14} />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#E5E7EB] dark:border-[#1C1C1C] mb-8" />

      {/* Projects */}
      {(profile.role === 'student' || profile.role === 'supervisor') && (
        <div>
          <h2 className="text-[#0A0A0A] dark:text-[#F5F5F5] mb-5"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }}>
            {profile.role === 'supervisor' ? 'Supervised Projects' : 'Projects'}
          </h2>
          {projects.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#1C1C1C]">
              <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>No approved projects yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {projects.map((p) => <ProfileProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>
      )}

      {/* Edit sheet */}
      <AnimatePresence>
        {editOpen && (
          <EditProfileSheet
            user={profile}
            onClose={() => setEditOpen(false)}
            onSave={(u) => setProfile(u)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
