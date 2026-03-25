import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  User, Lock, Palette, Link as LinkIcon, Plus, X, Check,
  Eye, EyeSlash, Sun, Moon, WarningCircle, Laptop, Camera, Trash,
} from 'phosphor-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSession } from '../../context/SessionContext'
import { useTheme } from '../../context/ThemeContext'
import { usersApi } from '../../lib/api'
import { useRef } from 'react'
import { getAvatarColor, getInitials } from '../../lib/utils'
import { toast } from 'sonner'
import type { UserLink } from '../../lib/types'
import { DashboardLayout } from '../components/layout/DashboardLayout'

// ─── Floating label input ─────────────────────────────────────────────────────

function Field({
  id, label, value, onChange, type = 'text', disabled = false, mono = false, rows,
}: {
  id: string; label: string; value: string; onChange?: (v: string) => void
  type?: string; disabled?: boolean; mono?: boolean; rows?: number
}) {
  const [focused, setFocused] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const raised = focused || value.length > 0
  const inputType = type === 'password' ? (showPwd ? 'text' : 'password') : type

  if (rows) {
    return (
      <div className={`relative rounded-2xl border transition-all duration-150 ${disabled ? 'opacity-60 bg-[#F7F8FA] dark:bg-[#181818]' : focused ? 'border-[#0066FF] shadow-[0_0_0_3px_rgba(0,102,255,0.15)]' : 'border-[#E5E7EB] dark:border-[#1C1C1C]'
        } bg-white dark:bg-[#101010] overflow-hidden`}>
        <label htmlFor={id} className="absolute left-4 top-3 text-[11px] text-[#9CA3AF]"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{label}</label>
        <textarea
          id={id} value={value} rows={rows} disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="w-full bg-transparent outline-none px-4 pt-7 pb-3 text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] resize-none"
          style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)' }}
        />
      </div>
    )
  }

  return (
    <div className={`relative rounded-full border transition-all duration-150 ${disabled ? 'opacity-60 bg-[#F7F8FA] dark:bg-[#181818]' : focused ? 'border-[#0066FF] shadow-[0_0_0_3px_rgba(0,102,255,0.15)]' : 'border-[#E5E7EB] dark:border-[#1C1C1C]'
      } bg-white dark:bg-[#101010]`}>
      <label htmlFor={id} className={`absolute left-4 transition-all duration-150 pointer-events-none ${raised ? 'top-1.5 text-[11px] text-[#9CA3AF]' : 'top-1/2 -translate-y-1/2 text-[14px] text-[#9CA3AF]'
        }`} style={{ fontFamily: 'var(--font-body)', fontWeight: raised ? 500 : 400 }}>
        {label}
      </label>
      <input
        id={id} type={inputType} value={value} disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className={`w-full bg-transparent outline-none px-4 rounded-full text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5] ${raised ? 'pt-5 pb-2' : 'py-3.5'} ${type === 'password' ? 'pr-12' : ''}`}
        style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)' }}
      />
      {type === 'password' && (
        <button type="button" onClick={() => setShowPwd((v) => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#5C6370]">
          {showPwd ? <EyeSlash size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0 ${checked ? 'bg-[#0066FF]' : 'bg-[#E5E7EB] dark:bg-[#1C1C1C]'}`}
      style={{ height: 22, width: 40 }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200"
        style={{ left: checked ? 22 : 2 }}
      />
    </button>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#101010] border border-[#E5E7EB] dark:border-[#1C1C1C] overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="px-6 py-5 border-b border-[#E5E7EB] dark:border-[#1C1C1C]">
        <h2 className="text-[15px] text-[#0A0A0A] dark:text-[#F5F5F5]"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{title}</h2>
        {description && (
          <p className="text-[13px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{description}</p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'account' | 'appearance'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'profile', label: 'Profile', icon: <User size={16} /> },
  { key: 'account', label: 'Account', icon: <Lock size={16} /> },
  { key: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
]

// ─── Profile tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, refresh } = useSession()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [links, setLinks] = useState<UserLink[]>(user?.links ?? [])
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url ?? null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const handleSave = async () => {
    setSaving(true)
    const res = await usersApi.update(user.id, { display_name: displayName, full_name: fullName, bio, links })
    if (res.success) {
      await refresh()
      toast.success('Profile updated!')
    } else {
      toast.error('Failed to update profile.')
    }
    setSaving(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB.')
      return
    }
    setAvatarPreview(URL.createObjectURL(file))
    setUploadingAvatar(true)
    const res = await usersApi.uploadAvatar(user.id, file)
    if (res.success) {
      await refresh()
      toast.success('Profile photo updated!')
    } else {
      toast.error('Failed to upload photo.')
      setAvatarPreview(user.avatar_url ?? null)
    }
    setUploadingAvatar(false)
  }

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    const res = await usersApi.removeAvatar(user.id)
    if (res.success) {
      setAvatarPreview(null)
      await refresh()
      toast.success('Profile photo removed.')
    } else {
      toast.error('Failed to remove photo.')
    }
    setUploadingAvatar(false)
  }

  const addLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return
    setLinks((prev) => [...prev, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }])
    setNewLinkTitle('')
    setNewLinkUrl('')
  }

  const bgColor = getAvatarColor(user.id)
  const initials = getInitials(user.full_name ?? user.display_name)

  return (
    <div className="space-y-5">
      {/* Avatar upload */}
      <SectionCard title="Profile Photo" description="Upload a photo or use your initials as avatar.">
        <div className="flex items-center gap-5">
          {/* Avatar preview */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-[26px] ring-4 ring-[#F0F2F5] dark:ring-[#1C1C1C]"
              style={{ backgroundColor: bgColor, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="flex flex-col gap-2">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e)}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] border border-[#E5E7EB] dark:border-[#1C1C1C] text-[#0A0A0A] dark:text-[#F5F5F5] hover:border-[#0066FF] hover:text-[#0066FF] transition-colors disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}>
              <Camera size={14} />
              {avatarPreview ? 'Change photo' : 'Upload photo'}
            </button>
            {avatarPreview && (
              <button
                onClick={() => void handleRemoveAvatar()}
                disabled={uploadingAvatar}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}>
                <Trash size={14} />
                Remove photo
              </button>
            )}
            <p className="text-[11px] text-[#9CA3AF] ml-1" style={{ fontFamily: 'var(--font-body)' }}>
              JPEG, PNG, WebP or GIF · max 2MB
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Name + bio */}
      <SectionCard title="Basic Information" description="This information appears on your public profile.">
        <div className="space-y-4">
          <Field id="disp" label="Display name" value={displayName} onChange={setDisplayName} />
          <Field id="full" label="Full name" value={fullName} onChange={setFullName} />
          <Field id="bio" label="Bio" value={bio} onChange={setBio} rows={3} />

          {/* Role-specific readonly fields */}
          {user.role === 'student' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="matric" label="Matric number" value={user.matric_no ?? ''} disabled mono />
              <Field id="level" label="Level" value={user.level ? `${user.level} Level` : ''} disabled />
            </div>
          )}
          {user.role === 'supervisor' && (
            <div className="space-y-4">
              <Field id="staffid" label="Staff ID" value={user.staff_id ?? ''} disabled mono />
              <Field id="degrees" label="Degrees" value={user.degrees ?? ''} disabled />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Links */}
      <SectionCard title="Profile Links" description="Add links to your GitHub, portfolio, or academic profiles.">
        <div className="space-y-3 mb-4">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7F8FA] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#1C1C1C]">
              <LinkIcon size={14} className="text-[#0066FF] flex-shrink-0" />
              <span className="flex-1 text-[13px] text-[#0066FF] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                {link.title} — {link.url}
              </span>
              <button onClick={() => setLinks((prev) => prev.filter((_, li) => li !== i))}
                className="p-1 rounded-full hover:bg-[#E5E7EB] dark:hover:bg-[#1C1C1C] text-[#9CA3AF] hover:text-red-500 transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} placeholder="Title (e.g. GitHub)"
            className="flex-1 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] px-4 py-2.5 text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] outline-none focus:border-[#0066FF] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }} />
          <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="URL" type="url"
            className="flex-1 rounded-full border border-[#E5E7EB] dark:border-[#1C1C1C] bg-white dark:bg-[#101010] px-4 py-2.5 text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5] placeholder-[#9CA3AF] outline-none focus:border-[#0066FF] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }} />
          <button onClick={addLink} disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
            className="px-4 py-2.5 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
            <Plus size={13} />Add
          </button>
        </div>
      </SectionCard>

      {/* Save button */}
      <div className="flex justify-end">
        <button onClick={() => void handleSave()} disabled={saving}
          className="px-6 py-3 rounded-full text-[14px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 transition-colors flex items-center gap-2"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
          {saving ? (
            <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving...</>
          ) : (
            <><Check size={15} />Save Profile</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Account tab ──────────────────────────────────────────────────────────────

function AccountTab() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')

  if (!user) return null

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setSaving(true)
    toast.error('Password change is not yet implemented in the backend.')
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Email Address" description="Your login email address.">
        <Field id="email-disp" label="Email" value={user.email} disabled />
        <p className="text-[12px] text-[#9CA3AF] mt-2 ml-4" style={{ fontFamily: 'var(--font-body)' }}>
          To change your email, contact your administrator.
        </p>
      </SectionCard>

      <SectionCard title="Change Password" description="Update your account password.">
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <p className="text-[13px] text-red-600 flex items-center gap-2" style={{ fontFamily: 'var(--font-body)' }}>
                <WarningCircle size={14} />{error}
              </p>
            </div>
          )}
          <Field id="cur-pwd" label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} />
          <Field id="new-pwd" label="New password" type="password" value={newPassword} onChange={setNewPassword} />
          <Field id="conf-pwd" label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
          <button onClick={() => void handleChangePassword()} disabled={saving}
            className="px-5 py-2.5 rounded-full text-[13px] text-white bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 transition-colors"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Account Info">
        <div className="space-y-3">
          {[
            { label: 'Role', value: user.role.charAt(0).toUpperCase() + user.role.slice(1) },
            { label: 'Status', value: user.account_status },
            { label: 'Verified', value: user.is_verified ? 'Yes' : 'Pending verification' },
            { label: 'Member since', value: new Date(user.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-[#F0F2F5] dark:border-[#181818] last:border-0">
              <span className="text-[13px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>{label}</span>
              <span className="text-[13px] text-[#0A0A0A] dark:text-[#F5F5F5]" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Sign Out">
        <p className="text-[13px] text-[#5C6370] dark:text-[#8B8FA8] mb-4" style={{ fontFamily: 'var(--font-body)' }}>
          Sign out of your account on this device.
        </p>
        <button
          onClick={async () => { await logout(); navigate('/') }}
          className="px-5 py-2.5 rounded-full text-[13px] border border-[#EF4444] text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
          Sign Out
        </button>
      </SectionCard>
    </div>
  )
}

// ─── Appearance tab ───────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, setTheme } = useTheme()

  const THEME_OPTIONS = [
    { value: 'light', label: 'Light', icon: <Sun size={20} />, description: 'Clean white interface' },
    { value: 'dark', label: 'Dark', icon: <Moon size={20} />, description: 'Easy on the eyes' },
    { value: 'system', label: 'System', icon: <Laptop size={20} />, description: 'Match OS preference' },
  ]

  return (
    <div className="space-y-5">
      <SectionCard title="Theme" description="Choose how Inquisia looks on your device.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => {
            const isActive = option.value === 'system'
              ? false
              : theme === option.value
            return (
              <button
                key={option.value}
                onClick={() => {
                  if (option.value !== 'system') setTheme(option.value as 'light' | 'dark')
                  else toast.info('System theme — coming soon!')
                }}
                className={`relative p-4 rounded-2xl border text-left transition-all duration-150 ${isActive
                  ? 'border-[#0066FF] bg-[#0066FF08]'
                  : 'border-[#E5E7EB] dark:border-[#1C1C1C] hover:border-[#0066FF]/40'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 ${isActive ? 'bg-[#0066FF1A] text-[#0066FF]' : 'bg-[#F0F2F5] dark:bg-[#181818] text-[#9CA3AF]'}`}>
                  {option.icon}
                </div>
                <p className="text-[14px] text-[#0A0A0A] dark:text-[#F5F5F5]"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{option.label}</p>
                <p className="text-[12px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {option.description}
                </p>
                {isActive && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#0066FF] flex items-center justify-center">
                    <Check size={11} weight="bold" className="text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, isLoading } = useSession()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  useEffect(() => {
    if (!isLoading && !user) navigate('/login?return=/settings')
  }, [user, isLoading, navigate])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#E5E7EB] border-t-[#0066FF] animate-spin" />
      </div>
    )
  }

  return (
    <DashboardLayout activeSection="settings">
      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[#0A0A0A] dark:text-[#F5F5F5] mb-1"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '28px', letterSpacing: '-0.02em' }}>
            Settings
          </h1>
          <p className="text-[14px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-body)' }}>
            Manage your Inquisia account preferences
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar nav */}
          <aside className="md:w-48 flex-shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-full text-[13px] whitespace-nowrap transition-colors duration-150 ${activeTab === tab.key
                    ? 'bg-[#0066FF1A] text-[#0066FF]'
                    : 'text-[#5C6370] dark:text-[#8B8FA8] hover:bg-[#F0F2F5] dark:hover:bg-[#181818] hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5]'
                    }`}
                  style={{ fontFamily: 'var(--font-body)', fontWeight: activeTab === tab.key ? 600 : 400 }}
                >
                  <span className={activeTab === tab.key ? 'text-[#0066FF]' : 'text-[#9CA3AF]'}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'account' && <AccountTab />}
                {activeTab === 'appearance' && <AppearanceTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}