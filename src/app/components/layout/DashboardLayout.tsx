import React from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { useTheme } from '../../../context/ThemeContext'
import {
    SquaresFour,
    FolderOpen,
    UploadSimple,
    User,
    Gear,
    BookmarkSimple,
    ClockCounterClockwise,
    GitDiff,
    Tray,
    CheckCircle,
    XCircle,
    Users,
} from 'phosphor-react'
import { useSession } from '../../../context/SessionContext'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SidebarItem {
    icon: React.ReactNode
    label: string
    key: string
    badge?: number
    href?: string
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
    overview: 'Overview',
    projects: 'My Projects',
    pending: 'Pending Review',
    changes: 'Changes Requested',
    studentrequests: 'Student Requests',
    approved: 'Approved',
    rejected: 'Rejected',
    students: 'My Students',
    upload: 'Upload New',
    profile: 'Profile',
    bookmarks: 'Bookmarks',
    settings: 'Settings',
}

function DashboardBreadcrumbs({
    activeSection,
    onNavigate,
    baseLabel = 'Dashboard',
}: {
    activeSection: string
    onNavigate?: (k: string) => void
    baseLabel?: string
}) {
    if (activeSection === 'overview') return null
    const label = SECTION_LABELS[activeSection] ?? activeSection
    return (
        <nav className="flex items-center gap-1.5 mb-6" aria-label="Breadcrumb">
            {onNavigate ? (
                <button
                    onClick={() => onNavigate('overview')}
                    className="text-[13px] text-[#0066FF] hover:underline"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
                >
                    {baseLabel}
                </button>
            ) : (
                <Link
                    to="/dashboard"
                    className="text-[13px] text-[#0066FF] hover:underline"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
                >
                    {baseLabel}
                </Link>
            )}
            <span className="text-[#D1D5DB] dark:text-[#2C2C2C] text-[13px]">/</span>
            <span className="text-[13px] text-[#5C6370] dark:text-[#8B8FA8]" style={{ fontFamily: 'var(--font-body)' }}>
                {label}
            </span>
        </nav>
    )
}

// ─── Mobile Section Nav ───────────────────────────────────────────────────────

function MobileSectionNav({
    items,
    active,
    onSelect,
}: {
    items: SidebarItem[]
    active: string
    onSelect: (k: string) => void
}) {
    return (
        <div className="md:hidden mb-5 -mx-1">
            <div className="flex gap-1.5 overflow-x-auto pb-1 px-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                {items.map((item) => {
                    const isActive = active === item.key
                    if (item.href && !isActive) {
                        return (
                            <Link
                                key={item.key}
                                to={item.href}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] whitespace-nowrap flex-shrink-0 border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#5C6370] dark:text-[#8B8FA8] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
                                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </Link>
                        )
                    }
                    return (
                        <button
                            key={item.key}
                            onClick={() => onSelect(item.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] whitespace-nowrap flex-shrink-0 transition-colors ${isActive
                                ? 'bg-[#0066FF] text-white'
                                : 'border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#5C6370] dark:text-[#8B8FA8] hover:border-[#0066FF] hover:text-[#0066FF]'
                                }`}
                            style={{ fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 500 }}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                            {item.badge ? (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-white text-[#0066FF]' : 'bg-[#0066FF] text-white'}`} style={{ fontWeight: 700 }}>
                                    {item.badge}
                                </span>
                            ) : null}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function DashboardSidebar({
    items,
    active,
    onSelect,
}: {
    items: SidebarItem[]
    active: string
    onSelect: (k: string) => void
}) {
    const { toggle, isDark } = useTheme()

    return (
        <aside className="w-56 flex-shrink-0 hidden md:flex flex-col">
            <div className="sticky top-24 flex flex-col gap-1">
                {items.map((item) => {
                    const isActive = active === item.key
                    const cls = `flex items-center gap-3 px-3 py-2.5 rounded-full text-[13px] transition-colors duration-150 w-full text-left ${isActive
                        ? 'bg-[#0066FF1A] text-[#0066FF]'
                        : 'text-[#5C6370] dark:text-[#8B8FA8] hover:bg-[#F0F2F5] dark:hover:bg-[#181818] hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5]'
                        }`
                    const styleObj = { fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 400 }
                    const inner = (
                        <>
                            <span className={isActive ? 'text-[#0066FF]' : 'text-[#9CA3AF]'}>{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                            {item.badge ? (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#0066FF] text-white" style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                                    {item.badge}
                                </span>
                            ) : null}
                        </>
                    )

                    return item.href && !isActive ? (
                        <Link key={item.key} to={item.href} className={cls} style={styleObj}>
                            {inner}
                        </Link>
                    ) : (
                        <button key={item.key} onClick={() => onSelect(item.key)} className={cls} style={styleObj}>
                            {inner}
                        </button>
                    )
                })}

                <div className="mt-6 pt-4 border-t border-[#E5E7EB] dark:border-[#1C1C1C]">
                    <button
                        onClick={toggle}
                        className="flex items-center gap-3 px-3 py-2 text-[13px] text-[#9CA3AF] hover:text-[#5C6370] transition-colors w-full"
                        style={{ fontFamily: 'var(--font-body)' }}
                    >
                        {isDark ? '☀' : '🌙'} {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                </div>
            </div>
        </aside>
    )
}

// ─── Layout Component ─────────────────────────────────────────────────────────

export function DashboardLayout({
    children,
    activeSection,
    onNavigate,
    sidebarItems,
}: {
    children: React.ReactNode
    activeSection: string
    onNavigate?: (k: string) => void
    sidebarItems?: SidebarItem[]
}) {
    const { user } = useSession()

    // Default sidebar items filtered by role
    const defaultSidebarItems: SidebarItem[] = user ? [
        ...(user.role === 'student' ? [
            { icon: <SquaresFour size={18} />, label: 'Overview', key: 'overview', href: '/dashboard' },
            { icon: <FolderOpen size={18} />, label: 'My Projects', key: 'projects', href: '/dashboard' },
            { icon: <UploadSimple size={18} />, label: 'Upload New', key: 'upload', href: '/upload' },
        ] : []),
        { icon: <User size={18} />, label: 'Profile', key: 'profile', href: `/profile/${user.id}` },
        { icon: <BookmarkSimple size={18} />, label: 'Bookmarks', key: 'bookmarks', href: '/bookmarks' },
        { icon: <Gear size={18} />, label: 'Settings', key: 'settings', href: '/settings' },
    ] : []

    const items = sidebarItems || defaultSidebarItems

    return (
        <div className="max-w-[1200px] mx-auto px-4 py-6 md:px-12 md:py-10">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                <DashboardSidebar
                    items={items}
                    active={activeSection}
                    onSelect={(k) => onNavigate?.(k)}
                />

                <div className="flex-1 min-w-0">
                    <MobileSectionNav
                        items={items}
                        active={activeSection}
                        onSelect={(k) => onNavigate?.(k)}
                    />

                    <DashboardBreadcrumbs
                        activeSection={activeSection}
                        onNavigate={onNavigate}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
