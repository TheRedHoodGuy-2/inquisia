import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Warning, Trash, CheckCircle, ArrowSquareOut } from 'phosphor-react'
import { adminApi } from '../../../lib/api'
import { relativeTime } from '../../../lib/utils'
import { toast } from 'sonner'

interface FlaggedComment {
  id: string
  content: string
  project_id: string
  project_title: string
  user: { id: string; full_name: string; display_name: string | null; role: string }
  created_at: string
  flagged: boolean
}

export function AdminFlaggedCommentsPage() {
  const [comments, setComments] = useState<FlaggedComment[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    adminApi.flaggedComments().then((res) => {
      if (res.success) setComments(res.data as FlaggedComment[])
      setLoading(false)
    })
  }, [])

  const handleUnflag = async (id: string) => {
    setActing(id)
    const res = await adminApi.unflagComment(id)
    if (res.success) {
      setComments((prev) => prev.filter((c) => c.id !== id))
      toast.success('Comment cleared — no action needed.')
    } else {
      toast.error('Failed to unflag comment.')
    }
    setActing(null)
  }

  const handleDelete = async (id: string) => {
    setActing(id)
    const res = await adminApi.deleteComment(id)
    if (res.success) {
      setComments((prev) => prev.filter((c) => c.id !== id))
      toast.success('Comment deleted.')
    } else {
      toast.error('Failed to delete comment.')
    }
    setActing(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5] mb-1"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em' }}>
          Flagged Comments
        </h1>
        <p className="text-[13px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
          Comments automatically flagged for potentially inappropriate content.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#F0F2F5] dark:bg-[#181818] animate-pulse" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] p-12 text-center">
          <CheckCircle size={40} weight="thin" className="text-[#9CA3AF] mx-auto mb-3" />
          <p className="text-[15px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
            No flagged comments right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id}
              className="rounded-2xl border border-[#FCD34D33] bg-white dark:bg-[#101010] p-5"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Warning size={16} weight="fill" className="text-[#F59E0B] flex-shrink-0" />
                  <span className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-body)' }}>
                    {c.user?.display_name || c.user?.full_name || 'Unknown'}
                  </span>
                  <span className="text-[12px] text-[#9CA3AF]">·</span>
                  <span className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
                    {relativeTime(c.created_at)}
                  </span>
                </div>
                <Link to={`/projects/${c.project_id}#comments`}
                  className="flex items-center gap-1 text-[12px] text-[#0066FF] hover:underline flex-shrink-0"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  {c.project_title}
                  <ArrowSquareOut size={12} />
                </Link>
              </div>
              <p className="text-[13px] text-[#374151] dark:text-[#D1D5DB] mb-4 px-1 py-2 rounded-lg bg-[#FEF3C7] dark:bg-[#2A1F00] border border-[#FCD34D33]"
                style={{ fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                {c.content}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleUnflag(c.id)}
                  disabled={acting === c.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] bg-[#F0F2F5] dark:bg-[#181818] text-[#374151] dark:text-[#D1D5DB] hover:bg-[#E5E7EB] dark:hover:bg-[#222] transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  <CheckCircle size={14} />
                  Clear — Keep Comment
                </button>
                <button
                  onClick={() => void handleDelete(c.id)}
                  disabled={acting === c.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] bg-red-50 dark:bg-[#1A0000] text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-[#2A0000] transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  <Trash size={14} />
                  Delete Comment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
