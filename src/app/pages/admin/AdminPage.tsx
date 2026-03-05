import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ChartBar, Users, FolderOpen, DownloadSimple, Warning } from 'phosphor-react'
import { useSession } from '../../../context/SessionContext'
import { publicApi, adminApi } from '../../../lib/api'
import type { PublicStats, Project } from '../../../lib/types'
import { SkeletonBlock } from '../../components/SkeletonPrimitives'
import { relativeTime } from '../../../lib/utils'

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '1A' }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{label}</span>
      </div>
      <p className="text-[28px] font-bold text-[#0A0A0A] dark:text-[#F5F5F5]"
        style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}

export function AdminPage() {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      publicApi.stats(),
      adminApi.adminProjects(),
    ]).then(([statsRes, projectsRes]) => {
      if (statsRes.success) setStats(statsRes.data)
      if (projectsRes.success) setProjects(projectsRes.data as unknown as Project[])
      setLoading(false)
    })
  }, [])

  const pendingProjects = projects.filter((p) => p.status === 'pending')
  const approvedProjects = projects.filter((p) => p.status === 'approved')

  // Slacking supervisors: projects pending > 7 days
  const slackingSupervisors = pendingProjects.filter((p) => {
    const days = (new Date().getTime() - new Date(p.updated_at).getTime()) / (24 * 60 * 60 * 1000)
    return days > 7
  })

  // Top downloads
  const topProjects = [...projects].sort((a, b) => b.download_count - a.download_count).slice(0, 5)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5] mb-1"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '26px', letterSpacing: '-0.02em' }}>
          Admin Overview
        </h1>
        <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>Platform statistics and management</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<FolderOpen size={18} />} label="Total Projects" value={stats?.total_projects ?? 0} color="#0066FF" />
          <StatCard icon={<Users size={18} />} label="Students" value={stats?.total_students ?? 0} color="#7C3AED" />
          <StatCard icon={<ChartBar size={18} />} label="Supervisors" value={stats?.total_supervisors ?? 0} color="#0891B2" />
          <StatCard icon={<DownloadSimple size={18} />} label="Total Downloads" value={stats?.total_downloads ?? 0} color="#22C55E" />
        </div>
      )}

      {/* Project status breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending', count: pendingProjects.length, color: '#F59E0B' },
          { label: 'Approved', count: approvedProjects.length, color: '#22C55E' },
          { label: 'Changes Req.', count: projects.filter(p => p.status === 'changes_requested').length, color: '#EA580C' },
          { label: 'Rejected', count: projects.filter(p => p.status === 'rejected').length, color: '#EF4444' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] p-4"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-[12px] text-[#9CA3AF] mb-2" style={{ fontFamily: 'var(--font-body)' }}>{s.label}</p>
            <p className="text-[24px] font-bold" style={{ fontFamily: 'var(--font-display)', color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slacking supervisors */}
        <div>
          {slackingSupervisors.length > 0 && (
            <div className="rounded-2xl bg-[#FFFBEB] dark:bg-[#1A1200] border border-[#F59E0B]/30 p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Warning size={20} className="text-[#D97706]" />
                <h2 className="text-[15px] text-[#D97706]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Overdue Reviews ({slackingSupervisors.length})
                </h2>
              </div>
              <div className="space-y-3">
                {slackingSupervisors.slice(0, 5).map((p) => {
                  const days = Math.floor((new Date().getTime() - new Date(p.updated_at).getTime()) / (24 * 60 * 60 * 1000))
                  return (
                    <div key={p.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#F5F5F5] truncate" style={{ fontFamily: 'var(--font-display)' }}>{p.title}</p>
                        <p className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
                          Supervisor: {p.supervisor_name ?? 'Unassigned'} · {p.authors?.map(a => a.display_name ?? a.full_name).join(', ') ?? ''}
                        </p>
                      </div>
                      <span className="text-[11px] text-[#D97706] flex-shrink-0 font-medium" style={{ fontFamily: 'var(--font-body)' }}>{days}d</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] p-5"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-[15px] text-[#0A0A0A] dark:text-[#F5F5F5] mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Manage Users', href: '/admin/users' },
                { label: 'Review Projects', href: '/admin/projects' },
                { label: 'Verify Supervisors', href: '/admin/supervisors' },
                { label: 'Manage Departments', href: '/admin/departments' },
                { label: 'Manage AI Categories', href: '/admin/ai-categories' },
              ].map((link) => (
                <Link key={link.href} to={link.href}
                  className="block px-4 py-2.5 rounded-full text-[13px] text-[#5C6370] dark:text-[#8B8FA8] hover:bg-[#0066FF1A] hover:text-[#0066FF] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  {link.label} →
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Top downloads */}
        <div className="rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] p-5"
          style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[15px] text-[#0A0A0A] dark:text-[#F5F5F5] mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Top Downloads</h2>
          <div className="space-y-3">
            {topProjects.map((p, i) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 group">
                <span className="text-[14px] font-bold text-[#9CA3AF] w-5" style={{ fontFamily: 'var(--font-display)' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5] truncate group-hover:text-[#0066FF] transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                    {p.title}
                  </p>
                </div>
                <span className="text-[12px] text-[#9CA3AF] flex-shrink-0 flex items-center gap-1" style={{ fontFamily: 'var(--font-body)' }}>
                  <DownloadSimple size={13} />{p.download_count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
