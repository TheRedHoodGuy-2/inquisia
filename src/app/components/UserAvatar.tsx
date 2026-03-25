import React from 'react'
import { getAvatarColor, getInitials } from '../../lib/utils'

interface UserAvatarProps {
  id: string
  name: string | null | undefined
  avatarUrl?: string | null
  size?: number
  className?: string
  border?: boolean
}

export function UserAvatar({ id, name, avatarUrl, size = 36, className = '', border = false }: UserAvatarProps) {
  const bg = getAvatarColor(id)
  const initials = getInitials(name)

  if (avatarUrl) {
    return (
      <div
        className={`rounded-full flex-shrink-0 overflow-hidden ${border ? 'border border-white dark:border-[#101010]' : ''} ${className}`}
        style={{ width: size, height: size, backgroundColor: bg }}
      >
        <img
          src={avatarUrl}
          alt={name ?? 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.currentTarget
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              parent.style.display = 'flex'
              parent.style.alignItems = 'center'
              parent.style.justifyContent = 'center'
              parent.innerHTML = `<span style="color:white;font-size:${size * 0.38}px;font-family:var(--font-display);font-weight:700;line-height:1;user-select:none">${initials}</span>`
            }
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${border ? 'border border-white dark:border-[#101010]' : ''} ${className}`}
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
