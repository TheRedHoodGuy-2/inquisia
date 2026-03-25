import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  BookOpen,
  Sun,
  Moon,
  Bell,
  CaretDown,
  User,
  SquaresFour,
  SignOut,
  Gear,
  ShieldStar,
} from 'phosphor-react'
import { ElaraLogo } from '../ui/ElaraLogo'
import { motion, AnimatePresence } from 'motion/react'
import { useSession } from '../../../context/SessionContext'
import { useTheme } from '../../../context/ThemeContext'
import { getAvatarColor, getInitials, relativeTime } from '../../../lib/utils'
import type { Notification } from '../../../lib/types'
import { notificationsApi } from '../../../lib/api'
import { InquisiaLogo as BaseInquisiaLogo } from '../ui/InquisiaLogo'

// ─── Logo ─────────────────────────────────────────────────────────────────────

function InquisiaLogo() {
  return (
    <Link to="/" className="flex items-center gap-2 select-none group">
      <BaseInquisiaLogo className="w-7 h-7 transition-transform duration-150 group-hover:scale-105" />
      <span
        className="text-[#0A0A0A] dark:text-[#F5F5F5] text-[17px] leading-none"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em' }}
      >
        inquisia.
      </span>
    </Link>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ id, name, avatarUrl, size = 32 }: { id: string; name: string | null; avatarUrl?: string | null; size?: number }) {
  const bg = getAvatarColor(id)
  const initials = getInitials(name)
  if (avatarUrl) {
    return (
      <div
        className="rounded-full flex-shrink-0 overflow-hidden border border-white dark:border-[#181818]"
        style={{ width: size, height: size, backgroundColor: bg }}
      >
        <img src={avatarUrl} alt={name ?? 'Avatar'} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 border border-white dark:border-[#181818]"
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      <span
        className="text-white select-none"
        style={{
          fontSize: size * 0.38,
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    </div>
  )
}

// ─── Notification Bell ────────────────────────────────────────────────────────

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    notificationsApi.list().then((res) => {
      if (res.success) setNotifications(res.data)
    })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const notifIcons: Record<string, string> = {
    project_approved: '✓',
    project_changes_requested: '⟳',
    project_rejected: '✕',
    comment_reply: '💬',
    change_request_approved: '✓',
    change_request_denied: '✕',
    account_warned: '⚠',
    account_restricted: '⚠',
    account_banned: '✕',
    project_uploaded: '↑',
    project_resubmitted: '↑',
    change_request_submitted: '⟳',
  }

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    notificationsApi.markAllRead()
  }

  const handleDeleteAll = () => {
    setNotifications([])
    notificationsApi.deleteAll()
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full text-[#5C6370] dark:text-[#8B8FA8] hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5] hover:bg-[#F0F2F5] dark:hover:bg-[#181818] transition-colors duration-150"
        aria-label="Notifications"
      >
        <Bell size={20} weight="regular" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-[#080808]" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-[300px] sm:w-[360px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#101010] rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[100] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] dark:border-[#1C1C1C]">
              <span className="text-[14px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-display)' }}>
                Notifications
              </span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[12px] text-[#0066FF] hover:underline"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    className="text-[12px] text-[#9CA3AF] hover:text-red-500 transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-[#9CA3AF] text-[14px]" style={{ fontFamily: 'var(--font-body)' }}>
                No notifications
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-[#F0F2F5] dark:divide-[#1C1C1C]">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 ${!n.is_read ? 'bg-[#0066FF08]' : ''}`}
                  >
                    <span className="text-base flex-shrink-0 mt-0.5 text-[#9CA3AF]">{notifIcons[n.type] ?? '•'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#F5F5F5] leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                        {n.title}
                      </p>
                      <p className="text-[12px] text-[#5C6370] dark:text-[#8B8FA8] mt-0.5 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                        {relativeTime(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 bg-[#0066FF] rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── User Menu ────────────────────────────────────────────────────────────────

function UserMenu() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!user) return null

  const displayName = user.display_name ?? user.full_name ?? user.email.split('@')[0]
  const dashboardLink = user.role === 'admin' ? '/admin' : user.role === 'public' ? `/profile/${user.id}` : '/dashboard'
  const dashboardLabel = user.role === 'admin' ? 'Admin Panel' : user.role === 'public' ? 'My Profile' : 'Dashboard'

  const menuItems = [
    { icon: <User size={16} />, label: 'Profile', href: `/profile/${user.id}` },
    { icon: user.role === 'admin' ? <ShieldStar size={16} /> : <SquaresFour size={16} />, label: dashboardLabel, href: dashboardLink },
    { icon: <Gear size={16} />, label: 'Settings', href: '/settings' },
  ].filter((item, index, self) =>
    // If multiple items point to the same profile/dashboard, only keep the first one
    index === self.findIndex((t) => t.href === item.href)
  )

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-[#F0F2F5] dark:hover:bg-[#181818] transition-colors duration-150"
      >
        <UserAvatar id={user.id} name={user.full_name ?? user.display_name} avatarUrl={user.avatar_url} size={32} />
        <span
          className="text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] hidden sm:block max-w-[120px] truncate"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
        >
          {displayName}
        </span>
        <CaretDown
          size={14}
          weight="bold"
          className={`text-[#9CA3AF] transition-transform duration-200 hidden sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#101010] rounded-2xl border border-[#E5E7EB] dark:border-[#1C1C1C] shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50 overflow-hidden py-1.5"
          >
            {/* User info header */}
            <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-[#1C1C1C] mb-1">
              <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] truncate" style={{ fontFamily: 'var(--font-display)' }}>
                {displayName}
              </p>
              <p className="text-[12px] text-[#9CA3AF] truncate mt-0.5">{user.email}</p>
            </div>

            {menuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] hover:bg-[#0066FF1A] hover:text-[#0066FF] transition-colors duration-100"
              >
                <span className="text-[#9CA3AF]">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            <div className="border-t border-[#E5E7EB] dark:border-[#1C1C1C] mt-1 pt-1">
              <button
                onClick={async () => {
                  setOpen(false)
                  await logout()
                  navigate('/')
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors duration-100"
              >
                <SignOut size={16} />
                Log Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const { user } = useSession()
  const { toggle, isDark } = useTheme()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (path: string) => location.pathname === path

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${scrolled
        ? 'bg-white/90 dark:bg-[#080808]/90 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#1C1C1C]'
        : 'bg-white dark:bg-[#080808]'
        }`}
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-12 h-16 flex items-center justify-between">
        {/* Left — Logo */}
        <InquisiaLogo />

        {/* Right — Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Browse */}
          <Link
            to="/projects"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[14px] transition-colors duration-150 ${isActive('/projects')
              ? 'text-[#0066FF] bg-[#0066FF1A]'
              : 'text-[#5C6370] dark:text-[#8B8FA8] hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5] hover:bg-[#F0F2F5] dark:hover:bg-[#181818]'
              }`}
            style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
          >
            <BookOpen size={16} weight={isActive('/projects') ? 'fill' : 'regular'} />
            <span className="hidden sm:block">Browse</span>
          </Link>

          {/* Elara */}
          <Link
            to="/elara"
            className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-[14px] text-[#5C6370] dark:text-[#8B8FA8] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1C] transition-colors group"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
          >
            <ElaraLogo className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#0066FF] transition-colors" />
            <span className="hidden sm:block">Elara</span>
          </Link>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-full text-[#5C6370] dark:text-[#8B8FA8] hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5] hover:bg-[#F0F2F5] dark:hover:bg-[#181818] transition-colors duration-150"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} weight="regular" /> : <Moon size={18} weight="regular" />}
          </button>

          {user ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <Link
              to="/login"
              className="ml-1 px-4 py-2 rounded-full text-[14px] text-white bg-[#0066FF] hover:bg-[#0052CC] transition-colors duration-150 shadow-sm"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
            >
              Get Started
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}