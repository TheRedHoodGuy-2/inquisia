import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import {
  DownloadSimple, CalendarBlank, GithubLogo, ArrowSquareOut,
  Copy, Check, ChatCircle, Robot, PaperPlaneTilt,
  WarningCircle, CaretDown, CaretUp, X, CircleNotch, ArrowBendUpLeft,
  CheckCircle, XCircle, GitDiff, DotsThreeVertical, PencilSimple, Trash, BookmarkSimple
} from 'phosphor-react'
import { motion, AnimatePresence } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { projectsApi, commentsApi, aiApi, supervisorApi, bookmarksApi } from '../../lib/api'
import type { Project, Comment } from '../../lib/types'
import { useSession } from '../../context/SessionContext'
import { useTheme } from '../../context/ThemeContext'
import { ElaraLogo } from '../components/ui/ElaraLogo'
import { getCategoryStyle, getAvatarColor, getInitials, relativeTime, generateCitation } from '../../lib/utils'
import { SkeletonText, SkeletonBlock, SkeletonComment } from '../components/SkeletonPrimitives'
import { RevisionModal } from '../components/RevisionModal'
import { ChangeRequestModal } from '../components/ChangeRequestModal'
import { toast } from 'sonner'

// ─── Category pill ────────────────────────────────────────────────────────────

function CategoryPill({ category }: { category: string }) {
  const { isDark } = useTheme()
  const style = getCategoryStyle(category, isDark)
  return (
    <span className="px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ backgroundColor: style.bg, color: style.text, fontFamily: 'var(--font-body)' }}>
      {category}
    </span>
  )
}

// ─── Author pill ──────────────────────────────────────────────────────────────

function AuthorPill({ author }: { author: Project['authors'][number] }) {
  return (
    <Link to={`/profile/${author.id}`}>
      <span className="px-3 py-1.5 rounded-full text-[13px] border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#0A0A0A] dark:text-[#F5F5F5] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors duration-150 inline-block"
        style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
        {author.display_name ?? author.full_name}
      </span>
    </Link>
  )
}

// ─── AI section ───────────────────────────────────────────────────────────────

function AISection({ projectId, type }: { projectId: string; type: 'summary' | 'analysis' }) {
  const { user } = useSession()
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<string | Record<string, string[]> | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = type === 'summary' ? 'AI Summary' : 'Limitations & Future Work'
  const buttonLabel = type === 'summary' ? 'Generate Summary' : 'View Details'

  const generate = async () => {
    if (!user) { toast.error('Log in to generate AI content.'); return }
    setLoading(true)
    setError(null)
    const res = type === 'summary'
      ? await aiApi.summary(projectId)
      : await aiApi.analysis(projectId)

    if (res.success) {
      setContent(type === 'summary' ? (res.data as { summary: string }).summary : (res.data as { analysis: Record<string, string[]> }).analysis)
      setExpanded(true)
    } else {
      setError('AI request failed. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="py-6 border-b border-[#E5E7EB] dark:border-[#1C1C1C]">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }} className="text-[#0A0A0A] dark:text-[#F5F5F5]">
          {label}
        </h2>
        <button
          onClick={content ? () => setExpanded((v) => !v) : () => void generate()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#5C6370] dark:text-[#8B8FA8] hover:border-[#0066FF] hover:text-[#0066FF] disabled:opacity-50 transition-colors duration-150"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
        >
          {loading ? <CircleNotch size={14} className="animate-spin" /> : content ? (expanded ? <CaretUp size={14} /> : <CaretDown size={14} />) : <ElaraLogo className="w-4 h-4" />}
          {loading ? 'Generating...' : content ? (expanded ? 'Collapse' : 'Expand') : buttonLabel}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
          <p className="text-[13px] text-red-600 flex items-center gap-2"><WarningCircle size={14} />{error}</p>
        </div>
      )}

      <AnimatePresence>
        {content && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-[#F7F8FA] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#1C1C1C] p-5 mt-3">
              {typeof content === 'string' ? (
                <p className="text-[14px] text-[#5C6370] dark:text-[#8B8FA8] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{content}</p>
              ) : (
                <div className="space-y-5">
                  {[
                    { key: 'limitations', label: 'Key Limitations' },
                    { key: 'suggested_improvements', label: 'Suggested Improvements' },
                    { key: 'future_research', label: 'Future Research Directions' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <h4 className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] mb-2" style={{ fontFamily: 'var(--font-display)' }}>{label}</h4>
                      <ul className="space-y-1.5">
                        {((content as Record<string, string[]>)[key] ?? []).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-[#5C6370] dark:text-[#8B8FA8]" style={{ fontFamily: 'var(--font-body)' }}>
                            <span className="text-[#0066FF] mt-0.5 flex-shrink-0">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Elara Trigger Section ────────────────────────────────────────────────────

function ElaraTrigger({ title }: { title: string }) {
  const openElara = () => {
    const event = new CustomEvent('open-elara', {
      detail: { prompt: `Tell me more about the project "${title}"` }
    })
    window.dispatchEvent(event)
  }

  return (
    <div className="py-8 border-b border-[#E5E7EB] dark:border-[#1C1C1C]">
      <div className="rounded-3xl bg-gradient-to-br from-[#0066FF0D] to-transparent border border-[#0066FF1A] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#0066FF] flex items-center justify-center mx-auto mb-4 p-2.5 shadow-[0_8px_24px_rgba(0,102,255,0.25)]">
          <ElaraLogo variant="blue" className="w-full h-full" />
        </div>
        <h3 className="text-[18px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Have questions about this research?
        </h3>
        <p className="text-[14px] text-[#5C6370] dark:text-[#8B8FA8] mb-6 max-w-[400px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
          Ask Elara, your AI research guide. She's already read this project and is ready to discuss its findings, limitations, and future work.
        </p>
        <button
          onClick={openElara}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0066FF] text-white text-[14px] font-medium hover:bg-[#0052CC] transition-all shadow-[0_4px_16px_rgba(0,102,255,0.2)] hover:shadow-[0_6px_20px_rgba(0,102,255,0.3)] active:scale-[0.98]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <ChatCircle size={18} weight="fill" />
          Discuss with Elara
        </button>
      </div>
    </div>
  )
}

// ─── Citation section ─────────────────────────────────────────────────────────

function CitationSection({ project }: { project: Project }) {
  const [format, setFormat] = useState<'APA' | 'IEEE' | 'MLA' | 'CHICAGO'>('APA')
  const [copied, setCopied] = useState(false)

  const citation = generateCitation(project, format)

  const handleCopy = () => {
    navigator.clipboard.writeText(citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Citation copied!')
  }

  return (
    <div className="py-6 border-b border-[#E5E7EB] dark:border-[#1C1C1C]">
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }} className="text-[#0A0A0A] dark:text-[#F5F5F5] mb-4">
        Citation
      </h2>
      {/* Tab nav */}
      <div className="flex border-b border-[#E5E7EB] dark:border-[#1C1C1C] mb-4">
        {(['APA', 'IEEE', 'MLA', 'CHICAGO'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`px-4 py-2 text-[13px] border-b-2 transition-colors duration-150 -mb-px ${format === f ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-[#9CA3AF] hover:text-[#5C6370]'
              }`}
            style={{ fontFamily: 'var(--font-body)', fontWeight: format === f ? 600 : 400 }}
          >
            {f}
          </button>
        ))}
      </div>
      {/* Citation box */}
      <div className="relative rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] bg-[#F7F8FA] dark:bg-[#181818] p-4">
        <p
          className="text-[12px] text-[#5C6370] dark:text-[#8B8FA8] leading-relaxed pr-10"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {citation}
        </p>
        <button
          onClick={handleCopy}
          className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all duration-150 ${copied ? 'bg-green-100 text-green-600' : 'bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#5C6370] hover:border-[#0066FF] hover:text-[#0066FF]'
            }`}
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
        >
          {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
    </div>
  )
}


// ─── Markdown renderer (for abstracts and feedback) ──────────────────────────

function MarkdownBody({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div
      className={`markdown-body text-[#5C6370] dark:text-[#8B8FA8] ${className}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-[1.75] text-[14px]">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontWeight: 600 }}>{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-none space-y-1.5 mb-3 pl-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1.5 mb-3 text-[13px]">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-[13px]">
              <span className="text-[#0066FF] mt-[3px] flex-shrink-0">•</span>
              <span>{children}</span>
            </li>
          ),
          code: ({ children }) => (
            <code
              className="px-1.5 py-0.5 rounded text-[12px] bg-[#F0F2F5] dark:bg-[#181818] text-[#0066FF]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#0066FF] pl-3 italic text-[13px] my-3">{children}</blockquote>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] mb-2 mt-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{children}</h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ─── Comment card ─────────────────────────────────────────────────────────────

function CommentCard({
  comment,
  projectId,
  onAddReply,
  onDelete,
  onUpdate,
  canModerate = false,
  depth = 0,
}: {
  comment: Comment
  projectId: string
  onAddReply?: (parentId: string, reply: Comment) => void
  onDelete?: (commentId: string) => void
  onUpdate?: (commentId: string, newContent: string) => void
  canModerate?: boolean
  depth?: number
}) {
  const { user } = useSession()
  const isAdmin = comment.is_admin
  const isSupervisor = comment.is_supervisor
  const isAuthor = comment.is_author

  const avatarColor = getAvatarColor(comment.author_id)
  const initials = getInitials(comment.author_name)

  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [postingReply, setPostingReply] = useState(false)

  // Edit / delete state
  const [menuOpen, setMenuOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingComment, setDeletingComment] = useState(false)

  const isOwner = user?.id === comment.author_id
  const showOptions = !comment.is_deleted && (isOwner || canModerate)

  const getBadge = () => {
    if (isAdmin) return { label: 'Administrator', color: '#0066FF' }
    if (isSupervisor) return { label: 'Supervisor', color: '#0066FF' }
    if (isAuthor) return { label: 'Author', color: '#0066FF' }
    return null
  }
  const badge = getBadge()

  const cardClass = `rounded-2xl border p-4 ${isAdmin
    ? 'admin-comment-border bg-[#0066FF08] dark:bg-[#0066FF05]'
    : isSupervisor
      ? 'border-[#0066FF66] bg-white dark:bg-[#101010]'
      : isAuthor
        ? 'border-[#E5E7EB] dark:border-[#1C1C1C] bg-[#0066FF0D]'
        : 'border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010]'
    }`

  const handleReplySubmit = async () => {
    const trimmed = replyText.trim()
    if (!trimmed || postingReply) return

    const FLAGGED_PATTERNS = [
      /\bfuck\b/i, /\bshit\b/i, /\bbitch\b/i, /\bass\b/i, /\bcunt\b/i,
      /\bnigg/i, /\bfaggot\b/i, /\bwhore\b/i, /\bslut\b/i, /\bkill\s+your?self\b/i,
      /\bstupid\s+(idiot|moron|loser)\b/i,
    ]
    const likelyInappropriate = FLAGGED_PATTERNS.some((p) => p.test(trimmed))
    if (likelyInappropriate) {
      toast.warning('Your reply may contain inappropriate language. It will be flagged for admin review.', { duration: 5000 })
    }

    setPostingReply(true)
    const res = await commentsApi.create(projectId, trimmed, comment.id, likelyInappropriate)
    if (res.success) {
      onAddReply?.(comment.id, res.data)
      setReplyText('')
      setShowReply(false)
      toast.success('Reply posted!')
    } else {
      toast.error('Failed to post reply.')
    }
    setPostingReply(false)
  }

  const handleSaveEdit = async () => {
    if (!editText.trim() || savingEdit) return
    setSavingEdit(true)
    const res = await commentsApi.update(comment.id, editText.trim())
    if (res.success) {
      onUpdate?.(comment.id, editText.trim())
      setEditMode(false)
      toast.success('Comment updated.')
    } else {
      toast.error('Failed to update comment.')
    }
    setSavingEdit(false)
  }

  const handleDelete = async () => {
    setDeletingComment(true)
    const res = await commentsApi.delete(comment.id)
    if (res.success) {
      onDelete?.(comment.id)
      toast.success('Comment deleted.')
    } else {
      toast.error('Failed to delete comment.')
      setDeletingComment(false)
    }
  }

  return (
    <div className={cardClass}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[12px]"
          style={{ backgroundColor: avatarColor, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {comment.is_deleted ? (
                <span className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)' }}>
                  {comment.author_display_name ?? comment.author_name}
                </span>
              ) : (
                <Link to={`/profile/${comment.author_id}`}>
                  <span className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] hover:text-[#0066FF] transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                    {comment.author_display_name ?? comment.author_name}
                  </span>
                </Link>
              )}
              {badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                  style={{ borderColor: badge.color + '40', backgroundColor: badge.color + '1A', color: badge.color, fontFamily: 'var(--font-body)' }}>
                  {badge.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[11px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
                {relativeTime(comment.created_at)}
              </span>
              {/* Options menu */}
              {showOptions && (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="p-1 rounded-full hover:bg-[#F0F2F5] dark:hover:bg-[#181818] text-[#9CA3AF] hover:text-[#5C6370] transition-colors"
                    aria-label="Comment options"
                  >
                    <DotsThreeVertical size={15} weight="bold" />
                  </button>
                  <AnimatePresence>
                    {menuOpen && (
                      <>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute right-0 top-7 z-20 bg-white dark:bg-[#181818] rounded-xl border border-[#E5E7EB] dark:border-[#1C1C1C] shadow-lg overflow-hidden min-w-[130px]"
                          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                        >
                          {isOwner && (
                            <button
                              onClick={() => { setMenuOpen(false); setEditMode(true); setEditText(comment.content) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F0F2F5] dark:hover:bg-[#1C1C1C] transition-colors text-left"
                              style={{ fontFamily: 'var(--font-body)' }}
                            >
                              <PencilSimple size={13} /> Edit
                            </button>
                          )}
                          <button
                            onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#2D0000] transition-colors text-left"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            <Trash size={13} /> Delete
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Confirm delete inline popover */}
          <AnimatePresence>
            {confirmDelete && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-xl border border-[#FECACA] dark:border-[#7F1D1D] bg-[#FEF2F2] dark:bg-[#2D0000] p-3 flex items-center gap-3">
                  <p className="text-[12px] text-[#DC2626] flex-1" style={{ fontFamily: 'var(--font-body)' }}>
                    Delete this comment? This cannot be undone.
                  </p>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[12px] text-[#9CA3AF] hover:text-[#5C6370] transition-colors px-2 py-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleDelete()}
                    disabled={deletingComment}
                    className="text-[12px] text-white bg-[#DC2626] hover:bg-[#B91C1C] px-3 py-1.5 rounded-full disabled:opacity-60 transition-colors flex items-center gap-1"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
                  >
                    {deletingComment ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><Trash size={11} /> Delete</>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit mode */}
          {editMode ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                autoFocus
                className="w-full rounded-2xl border border-[#0066FF] bg-[#F7F8FA] dark:bg-[#181818] px-3 py-2 text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5] outline-none resize-none focus:shadow-[0_0_0_2px_rgba(0,102,255,0.12)] transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => void handleSaveEdit()}
                  disabled={!editText.trim() || savingEdit}
                  className="px-4 py-1.5 rounded-full text-[12px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 transition-colors flex items-center gap-1"
                  style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
                >
                  {savingEdit ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Save'}
                </button>
                <button
                  onClick={() => { setEditMode(false); setEditText(comment.content) }}
                  className="px-4 py-1.5 rounded-full text-[12px] border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#5C6370] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
                  style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <span className="text-[11px] text-[#9CA3AF] ml-auto" style={{ fontFamily: 'var(--font-body)' }}>
                  Editing
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-1.5">
              {comment.is_deleted ? (
                <em className="text-[13px] text-[#9CA3AF] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>[comment deleted]</em>
              ) : (
                <MarkdownBody content={comment.content} className="text-[13px] text-[#5C6370] dark:text-[#8B8FA8] leading-relaxed" />
              )}
            </div>
          )}

          {/* Reply button */}
          {user && !comment.is_deleted && !editMode && depth < 5 && (
            <button
              onClick={() => setShowReply((v) => !v)}
              className="mt-2 flex items-center gap-1 text-[12px] text-[#9CA3AF] hover:text-[#0066FF] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <ArrowBendUpLeft size={13} />
              {showReply ? 'Cancel' : 'Reply'}
            </button>
          )}
          {user && !comment.is_deleted && !editMode && depth >= 5 && (
            <p className="mt-2 text-[11px] text-[#9CA3AF] italic" style={{ fontFamily: 'var(--font-body)' }}>
              Maximum reply depth reached. Please start a new comment thread.
            </p>
          )}
          {/* Reply input */}
          <AnimatePresence>
            {showReply && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden mt-3"
              >
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${comment.author_display_name ?? comment.author_name ?? 'this comment'}...`}
                    rows={2}
                    autoFocus
                    className="flex-1 rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] bg-[#F7F8FA] dark:bg-[#181818] px-3 py-2 text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] outline-none resize-none focus:border-[#0066FF] focus:shadow-[0_0_0_2px_rgba(0,102,255,0.12)] transition-all"
                    style={{ fontFamily: 'var(--font-body)' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleReplySubmit()
                    }}
                  />
                  <button
                    onClick={() => void handleReplySubmit()}
                    disabled={!replyText.trim() || postingReply}
                    className="self-end px-4 py-2 rounded-full text-[12px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 transition-colors flex-shrink-0"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
                  >
                    {postingReply ? '...' : 'Post'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-10 mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              projectId={projectId}
              onAddReply={onAddReply}
              onDelete={onDelete}
              onUpdate={onUpdate}
              canModerate={canModerate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Comments section ─────────────────────────────────────────────────────────

function CommentsSection({ projectId, project }: { projectId: string; project?: Project }) {
  const { user } = useSession()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    commentsApi.list(projectId).then((res) => {
      if (res.success) setComments(res.data)
      setLoading(false)
    })
  }, [projectId])

  // Moderation: admin or project author can delete any comment
  const isProjectAuthor = project?.authors.some((a) => a.id === user?.id) ?? false
  const canModerate = user?.role === 'admin' || isProjectAuthor

  // Sort: admin first, then supervisor, then author, then rest
  const sortedComments = [...comments].sort((a, b) => {
    if (a.is_admin && !b.is_admin) return -1
    if (!a.is_admin && b.is_admin) return 1
    if (a.is_supervisor && !b.is_supervisor) return -1
    if (!a.is_supervisor && b.is_supervisor) return 1
    if (a.is_author && !b.is_author) return -1
    if (!a.is_author && b.is_author) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const handleSubmit = async () => {
    const trimmed = newComment.trim()
    if (!trimmed || posting) return

    // Basic profanity / inappropriate content check
    const FLAGGED_PATTERNS = [
      /\bfuck\b/i, /\bshit\b/i, /\bbitch\b/i, /\bass\b/i, /\bcunt\b/i,
      /\bnigg/i, /\bfaggot\b/i, /\bwhore\b/i, /\bslut\b/i, /\bkill\s+your?self\b/i,
      /\bstupid\s+(idiot|moron|loser)\b/i,
    ]
    const likelyInappropriate = FLAGGED_PATTERNS.some((p) => p.test(trimmed))

    if (likelyInappropriate) {
      toast.warning(
        'Your comment may contain inappropriate language. It will be flagged for admin review.',
        { duration: 5000 }
      )
    }

    setPosting(true)
    const res = await commentsApi.create(projectId, trimmed, undefined, likelyInappropriate)
    if (res.success) {
      setComments((prev) => [res.data, ...prev])
      setNewComment('')
      toast.success('Comment posted!')
    } else {
      toast.error('Failed to post comment.')
    }
    setPosting(false)
  }

  // When a reply is added, find the parent comment and add the reply to it
  const handleAddReply = (parentId: string, reply: Comment) => {
    setComments((prev) =>
      prev?.map((c) => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies || []), reply] }
        }
        const updatedReplies = c.replies?.map((r) =>
          r.id === parentId ? { ...r, replies: [...(r.replies || []), reply] } : r
        )
        return { ...c, replies: updatedReplies || [] }
      })
    )
  }

  // Mark comment as deleted in local state (keeps the thread visible)
  const handleDelete = (commentId: string) => {
    const markDeleted = (list: Comment[]): Comment[] =>
      list?.map((c) =>
        c.id === commentId
          ? { ...c, is_deleted: true, content: '' }
          : { ...c, replies: markDeleted(c.replies || []) }
      ) || []
    setComments((prev) => markDeleted(prev))
  }

  // Update comment content in local state
  const handleUpdate = (commentId: string, newContent: string) => {
    const updateContent = (list: Comment[]): Comment[] =>
      list?.map((c) =>
        c.id === commentId
          ? { ...c, content: newContent }
          : { ...c, replies: updateContent(c.replies || []) }
      ) || []
    setComments((prev) => updateContent(prev))
  }

  return (
    <div className="py-6">
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }} className="text-[#0A0A0A] dark:text-[#F5F5F5] mb-6">
        Comments {!loading && `(${comments.length})`}
      </h2>

      {/* Comment input */}
      {user ? (
        <div className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts or ask a question..."
            rows={3}
            className="w-full rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] px-4 py-3 text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] outline-none resize-none focus:border-[#0066FF] focus:shadow-[0_0_0_3px_rgba(0,102,255,0.15)] transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
              Markdown supported: **bold**, *italic*, `code`, - lists
            </p>
            <button
              onClick={() => void handleSubmit()}
              disabled={!newComment.trim() || posting}
              className="px-5 py-2 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 transition-colors duration-150 whitespace-nowrap flex-shrink-0"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
            >
              {posting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] bg-[#F7F8FA] dark:bg-[#181818] text-center">
          <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
            <Link to="/login" className="text-[#0066FF] hover:underline">Log in</Link> to leave a comment
          </p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonComment key={i} />)}
        </div>
      ) : sortedComments.length === 0 ? (
        <div className="text-center py-10">
          <ChatCircle size={40} weight="thin" className="text-[#9CA3AF] mx-auto mb-3" />
          <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedComments?.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              projectId={projectId}
              onAddReply={handleAddReply}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              canModerate={canModerate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────���─────────────────────────────────────

// Supervisor actions: approve / request changes / reject
function SupervisorActionsPanel({ project, onUpdate }: { project: Project; onUpdate: (p: Project) => void }) {
  const [action, setAction] = useState<'approve' | 'changes' | 'reject' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  const canReview = project.status === 'pending' || project.status === 'changes_requested'
  if (!canReview) return null

  const handleReview = async () => {
    if (!action) return
    const statusMap = { approve: 'approved', changes: 'changes_requested', reject: 'rejected' } as const
    const newStatus = statusMap[action]
    if ((action === 'changes' || action === 'reject') && !feedback.trim()) {
      toast.error('Please provide feedback before ' + (action === 'changes' ? 'requesting changes.' : 'rejecting.'))
      return
    }
    setLoading(true)
    const res = await supervisorApi.updateStatus(project.id, newStatus, feedback.trim())
    if (res.success) {
      toast.success(action === 'approve' ? 'Project approved!' : action === 'changes' ? 'Changes requested.' : 'Project rejected.')
      onUpdate(res.data)
      setAction(null)
      setFeedback('')
    } else {
      toast.error(res.error ?? 'Action failed.')
    }
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-[#0066FF33] bg-[#0066FF0D] dark:bg-[#0066FF08] p-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-[#0066FF1A] flex items-center justify-center flex-shrink-0">
          <CheckCircle size={15} className="text-[#0066FF]" />
        </div>
        <h3 className="text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          Supervisor Review Panel
        </h3>
        <span className="ml-auto px-2 py-0.5 rounded-full text-[11px] bg-[#EBF2FF] text-[#0052CC]" style={{ fontFamily: 'var(--font-body)' }}>
          {project.status === 'pending' ? 'Pending Review' : 'Revision Submitted'}
        </span>
      </div>

      {/* Feedback textarea — supports Markdown */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Feedback for Student
          </label>
          <span className="text-[11px] text-[#9CA3AF] px-2 py-0.5 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C]" style={{ fontFamily: 'var(--font-body)' }}>
            Markdown supported
          </span>
        </div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback for the student — Markdown is supported. Required when requesting changes or rejecting."
          rows={4}
          className="w-full rounded-2xl border border-[#C9D0DA] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] px-4 py-3 text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#6B7280] outline-none resize-none focus:border-[#0066FF] transition-all"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setAction('approve'); setTimeout(() => void handleReview(), 0) }}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
        >
          <CheckCircle size={14} weight="bold" />
          {loading && action === 'approve' ? 'Approving...' : 'Approve'}
        </button>
        <button
          onClick={() => { setAction('changes'); setTimeout(() => void handleReview(), 0) }}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] border border-[#C9D0DA] dark:border-[#1C1C1C] text-[#374151] dark:text-[#8B8FA8] hover:border-[#0066FF] hover:text-[#0066FF] disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
        >
          <GitDiff size={14} />
          Request Changes
        </button>
        <button
          onClick={() => { setAction('reject'); setTimeout(() => void handleReview(), 0) }}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] border border-[#EF4444]/40 text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
        >
          <XCircle size={14} />
          Reject
        </button>
      </div>
    </div>
  )
}

// Student actions: revision / resubmit / request changes (on approved)
function StudentActionsPanel({ project, onUpdate }: { project: Project; onUpdate: (p: Project) => void }) {
  const [revisionModal, setRevisionModal] = useState<'revision' | 'resubmit' | null>(null)
  const [changeModal, setChangeModal] = useState(false)

  if (project.status === 'changes_requested' || project.status === 'rejected') {
    return (
      <>
        <div className={`rounded-2xl border p-5 mb-8 ${project.status === 'changes_requested' ? 'border-[#F59E0B33] bg-[#FFFBEB] dark:bg-[#1C1200]' : 'border-[#EF444433] bg-[#FEF2F2] dark:bg-[#1C0A0A]'}`}>
          <div className="flex items-start gap-3">
            <WarningCircle size={18} className={project.status === 'changes_requested' ? 'text-[#D97706] flex-shrink-0 mt-0.5' : 'text-[#EF4444] flex-shrink-0 mt-0.5'} />
            <div className="flex-1">
              <p className="text-[13px] mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: project.status === 'changes_requested' ? '#D97706' : '#EF4444' }}>
                {project.status === 'changes_requested' ? 'Changes Requested by Supervisor' : 'Project Rejected'}
              </p>
              <p className="text-[12px] text-[#6B7280] mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                {project.status === 'changes_requested'
                  ? 'Upload an updated version to respond to the feedback below.'
                  : 'You can resubmit this project with a new report.'}
              </p>
              <button
                onClick={() => setRevisionModal(project.status === 'changes_requested' ? 'revision' : 'resubmit')}
                className="px-4 py-2 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] transition-colors"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
              >
                {project.status === 'changes_requested' ? 'Submit Revision' : 'Resubmit Project'}
              </button>
            </div>
          </div>
        </div>

        {revisionModal && (
          <RevisionModal
            project={project}
            mode={revisionModal}
            onClose={() => setRevisionModal(null)}
            onSuccess={(updated) => { onUpdate(updated); setRevisionModal(null) }}
          />
        )}
      </>
    )
  }

  if (project.status === 'approved') {
    return (
      <>
        <div className="rounded-2xl border border-[#C9D0DA] dark:border-[#1C1C1C] p-5 mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Your project is published
            </p>
            <p className="text-[12px] text-[#6B7280]" style={{ fontFamily: 'var(--font-body)' }}>
              Need to correct a title, URL, or other field? Submit a change request.
            </p>
          </div>
          <button
            onClick={() => setChangeModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] border border-[#C9D0DA] dark:border-[#1C1C1C] text-[#374151] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors flex-shrink-0"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
          >
            <GitDiff size={14} /> Request Changes
          </button>
        </div>
        {changeModal && <ChangeRequestModal project={project} onClose={() => setChangeModal(false)} />}
      </>
    )
  }

  return null
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useSession()
  const { isDark } = useTheme()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    projectsApi.get(id).then((res) => {
      if (res.success) setProject(res.data)
      else setError(res.error)
      setLoading(false)
    })

    if (user) {
      bookmarksApi.check(id).then((res) => {
        if (res.success) setIsBookmarked(res.data.is_bookmarked)
      })
    } else {
      setIsBookmarked(false)
    }
  }, [id, user])

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto px-5 md:px-0 py-12">
        <SkeletonBlock className="h-6 w-32 mb-8" />
        <SkeletonText className="h-10 w-full mb-3" />
        <SkeletonText className="h-10 w-3/4 mb-6" />
        <SkeletonText className="h-5 w-64 mb-8" />
        <SkeletonBlock className="h-40 w-full mb-6" />
        <SkeletonBlock className="h-60 w-full" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-[720px] mx-auto px-5 md:px-0 py-20 text-center">
        <WarningCircle size={48} weight="thin" className="text-[#9CA3AF] mx-auto mb-4" />
        <h2 className="text-[20px] mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Project not found</h2>
        <p className="text-[14px] text-[#9CA3AF] mb-6">{error ?? 'This project does not exist or has been removed.'}</p>
        <Link to="/projects" className="px-5 py-2.5 rounded-full text-[14px] bg-[#0066FF] text-white hover:bg-[#0052CC] transition-colors">Browse Projects</Link>
      </div>
    )
  }

  const handleToggleBookmark = async () => {
    if (!user) { toast.error('Log in to bookmark projects.'); return }
    if (!project) return
    setBookmarking(true)
    if (isBookmarked) {
      const res = await bookmarksApi.remove(project.id)
      if (res.success) {
        setIsBookmarked(false)
        toast.success('Removed from bookmarks')
      }
    } else {
      const res = await bookmarksApi.add(project.id)
      if (res.success) {
        setIsBookmarked(true)
        toast.success('Project bookmarked!')
      }
    }
    setBookmarking(false)
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!project) return
    setDownloading(true)
    const res = await projectsApi.download(project.id)
    if (res.success && res.data.url) {
      // Locally increment to reflect immediately to the user
      setProject(prev => prev ? { ...prev, download_count: prev.download_count + 1 } : prev)
      window.open(res.data.url, '_blank')
    } else {
      toast.error('Failed to prepare download.')
    }
    setDownloading(false)
  }

  const catStyle = project.ai_category ? getCategoryStyle(project.ai_category, isDark) : null
  const authors = project.authors ?? []
  const canSeePlagiarism = user && (
    user.id === project.supervisor_id ||
    authors.some((a) => a.id === user.id) ||
    user.role === 'admin'
  )

  return (
    <div className="max-w-[720px] mx-auto px-5 md:px-0 pt-12 pb-32 sm:pb-24">
      {/* 1. Category pill */}
      {project.ai_category && catStyle && (
        <div className="mb-6">
          <span className="px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ backgroundColor: catStyle.bg, color: catStyle.text, fontFamily: 'var(--font-body)' }}>
            {project.ai_category}
          </span>
        </div>
      )}

      {/* 2. Title */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1
          className="text-[#0A0A0A] dark:text-[#F5F5F5] flex-1"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 36px)', letterSpacing: '-0.02em', lineHeight: 1.15 }}
        >
          {project.title}
        </h1>
        <button
          onClick={handleToggleBookmark}
          disabled={bookmarking}
          className={`p-3 rounded-2xl border transition-all duration-150 flex-shrink-0 ${isBookmarked ? 'bg-[#0066FF10] border-[#0066FF20] text-[#0066FF]' : 'border-[#E5E7EB] dark:border-[#1C1C1C] text-[#9CA3AF] hover:border-[#0066FF] hover:text-[#0066FF]'
            }`}
          style={{ boxShadow: isBookmarked ? '0 4px 12px -2px rgba(0,102,255,0.12)' : 'none' }}
        >
          {bookmarking ? <CircleNotch size={20} className="animate-spin" /> : <BookmarkSimple size={20} weight={isBookmarked ? 'fill' : 'regular'} />}
        </button>
      </div>

      {/* 3. Authors */}
      <div className="mb-4">
        <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>Authors</p>
        <div className="flex flex-wrap gap-2">
          {authors?.map((a) => <AuthorPill key={a.id} author={a} />)}
        </div>
      </div>

      {/* 3b. Tags */}
      {((project.student_tags && project.student_tags.length > 0) || (project.ai_tags && project.ai_tags.length > 0)) && (
        <div className="mb-4">
          <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>Technical Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {project.student_tags?.map((t, i) => (
              <span key={`st-${i}`} className="px-2.5 py-1 rounded-lg text-[12px] bg-[#F3F4F6] dark:bg-[#111111] text-[#4B5563] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#1C1C1C]" style={{ fontFamily: 'var(--font-body)' }}>
                {t}
              </span>
            ))}
            {project.ai_tags?.map((t, i) => (
              <span key={`ai-${i}`} className="px-2.5 py-1 rounded-lg text-[12px] bg-[#0066FF08] border border-[#0066FF20] text-[#0066FF] flex items-center gap-1" style={{ fontFamily: 'var(--font-body)' }}>
                <Robot size={12} weight="fill" />
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Supervisor */}
      {project.supervisor_name && (
        <div className="mb-4">
          <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>Supervisor</p>
          <Link to={`/profile/${project.supervisor_id}`}>
            <span className="px-3 py-1.5 rounded-full text-[13px] border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#0A0A0A] dark:text-[#F5F5F5] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors inline-block"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
              {project.supervisor_name}
            </span>
          </Link>
        </div>
      )}

      {/* 5. Metadata strip */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {project.department_name && (
          <>
            <span className="text-[13px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{project.department_name}</span>
            <span className="text-[#E5E7EB] dark:text-[#1C1C1C]">•</span>
          </>
        )}
        <span className="text-[13px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{project.year}</span>
        <span className="text-[#E5E7EB] dark:text-[#1C1C1C]">•</span>
        <span className="flex items-center gap-1 text-[13px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
          <DownloadSimple size={13} />{project.download_count} downloads
        </span>
        {canSeePlagiarism && project.plagiarism_score !== null && (
          <>
            <span className="text-[#E5E7EB] dark:text-[#1C1C1C]">•</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${project.plagiarism_score > 30 ? 'bg-[#FEF2F2] dark:bg-red-900/20 text-[#DC2626] dark:text-red-400' : 'bg-[#F0FDF4] dark:bg-green-900/20 text-[#16A34A] dark:text-green-400'}`}
              style={{
                fontFamily: 'var(--font-mono)',
              }}
            >
              {project.plagiarism_score}% similarity
            </span>
          </>
        )}
      </div>

      {/* 5b. Severe Similarity Warning */}
      {canSeePlagiarism && project.plagiarism_score !== null && project.plagiarism_score > 30 && project.similar_project_id && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 flex items-start gap-3 transition-colors">
          <WarningCircle size={20} weight="fill" className="text-red-500 rounded-full flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-semibold text-red-700 dark:text-red-400 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Severe Similarity Detected
            </h4>
            <p className="text-[13px] text-red-600/90 dark:text-red-300/90 leading-relaxed mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              {project.similarity_reason || "This submission has extensive semantic overlap with an existing project."}
            </p>
            <Link to={`/project/${project.similar_project_id}`} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
              View Similar Project <ArrowSquareOut size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* 6. Divider */}
      <div className="h-px bg-[#E5E7EB] dark:bg-[#1C1C1C] mb-8" />

      {/* 6b. Supervisor review panel — visible only to the assigned supervisor */}
      {user?.role === 'supervisor' && user.id === project.supervisor_id && (
        <SupervisorActionsPanel
          project={project}
          onUpdate={(p) => setProject(prev => prev ? { ...prev, ...p } : p)}
        />
      )}

      {/* 6c. Student action panel — revision/resubmit/change-request */}
      {user && authors.some((a) => a.id === user.id) && (
        <StudentActionsPanel
          project={project}
          onUpdate={(p) => setProject(prev => prev ? { ...prev, ...p } : p)}
        />
      )}

      {/* 7. Abstract */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }} className="text-[#0A0A0A] dark:text-[#F5F5F5]">Abstract</h2>
          <span className="text-[11px] text-[#9CA3AF] px-2 py-0.5 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C]" style={{ fontFamily: 'var(--font-body)' }}>
            Markdown
          </span>
        </div>
        <MarkdownBody content={project.abstract ?? ''} className="text-[15px]" />
      </div>

      {/* 8. AI Summary */}
      {id && <AISection projectId={id} type="summary" />}

      {/* 9. Citation */}
      <CitationSection project={project} />

      {/* 10. Project links */}
      {(project.github_url || project.live_url) && (
        <div className="py-6 border-b border-[#E5E7EB] dark:border-[#1C1C1C]">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {project.github_url && (
              <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] text-[14px] text-[#5C6370] dark:text-[#8B8FA8] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                <GithubLogo size={16} />View on GitHub
              </a>
            )}
            {project.live_url && (
              <a href={project.live_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] text-[14px] text-[#5C6370] dark:text-[#8B8FA8] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                <ArrowSquareOut size={16} />Live Demo
              </a>
            )}
          </div>
        </div>
      )}

      {/* 11. Download */}
      <div className="py-6 border-b border-[#E5E7EB] dark:border-[#1C1C1C]">
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '18px' }} className="text-[#0A0A0A] dark:text-[#F5F5F5]">
            Full Document
          </h2>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 transition-colors"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
        >
          {downloading ? <CircleNotch size={16} className="animate-spin" /> : <DownloadSimple size={16} weight="bold" />}
          {downloading ? 'Preparing...' : 'Download PDF'}
        </button>
      </div>

      {/* 12. Divider */}
      <div className="h-px bg-[#E5E7EB] dark:bg-[#1C1C1C] mt-8 mb-0" />

      {/* 13. Project chat */}
      {id && <ElaraTrigger title={project?.title || 'this project'} />}

      {/* 14. Divider */}
      <div className="h-px bg-[#E5E7EB] dark:bg-[#1C1C1C] mt-8 mb-0" />

      {/* 15. Comments */}
      {id && <CommentsSection projectId={id} project={project} />}
    </div>
  )
}