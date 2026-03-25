import React, { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { ChartBar, Users, FolderOpen, GraduationCap, Buildings, Robot, Warning } from 'phosphor-react'
import { useSession } from '../../../context/SessionContext'
import { ElaraLogo } from '../../components/ui/ElaraLogo'

const NAV_ITEMS = [
  { icon: <ChartBar size={18} />, label: 'Overview', href: '/admin' },
  { icon: <Users size={18} />, label: 'Users', href: '/admin/users' },
  { icon: <FolderOpen size={18} />, label: 'Projects', href: '/admin/projects' },
  { icon: <GraduationCap size={18} />, label: 'Supervisors', href: '/admin/supervisors' },
  { icon: <Buildings size={18} />, label: 'Departments', href: '/admin/departments' },
  { icon: <ElaraLogo className="w-4 h-4" />, label: 'AI Categories', href: '/admin/ai-categories' },
  { icon: <Warning size={18} />, label: 'Flagged Comments', href: '/admin/flagged-comments' },
]

export function AdminLayout() {
  const { user, isLoading } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) navigate('/login?return=/admin')
  }, [user, isLoading, navigate])

  if (isLoading || !user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-[#E5E7EB] border-t-[#0066FF] animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 hidden md:flex flex-col border-r border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010]">
        <div className="p-4 sticky top-16">
          <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3 px-3" style={{ fontFamily: 'var(--font-body)' }}>
            Admin Panel
          </p>
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.href)
              return (
                <Link key={item.href} to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-[13px] transition-colors duration-150 ${isActive
                    ? 'bg-[#0066FF1A] text-[#0066FF]'
                    : 'text-[#5C6370] dark:text-[#8B8FA8] hover:bg-[#F0F2F5] dark:hover:bg-[#181818] hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5]'
                    }`}
                  style={{ fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 400 }}>
                  <span className={isActive ? 'text-[#0066FF]' : 'text-[#9CA3AF]'}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Nav */}
        <nav className="md:hidden flex overflow-x-auto gap-2 border-b border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] p-3 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.href)
            return (
              <Link key={item.href} to={item.href}
                className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-full text-[13px] transition-colors duration-150 ${isActive
                  ? 'bg-[#0066FF1A] text-[#0066FF]'
                  : 'text-[#5C6370] dark:text-[#8B8FA8] hover:bg-[#F0F2F5] dark:hover:bg-[#181818] hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5]'
                  }`}
                style={{ fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 400 }}>
                <span className={isActive ? 'text-[#0066FF]' : 'text-[#9CA3AF]'}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-[#F7F8FA] dark:bg-[#080808]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
