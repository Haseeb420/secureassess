'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ClipboardList, HelpCircle, Monitor, BarChart2,
  ChevronLeft, ChevronRight, LogOut, Settings, Key,
} from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { signOut } from '../lib/auth-client'

const NAV = [
  { label: 'Assessments', href: '/dashboard/assessments', icon: ClipboardList },
  { label: 'Questions',   href: '/dashboard/questions',   icon: HelpCircle },
  { label: 'Tokens',      href: '/dashboard/tokens',      icon: Key },
  { label: 'Monitor',     href: '/dashboard/monitor',     icon: Monitor },
  { label: 'Reports',     href: '/dashboard/reports',     icon: BarChart2 },
]

const COLLAPSED_KEY = 'sidebar-collapsed'

export function Sidebar({
  initialName,
  initialEmail,
  initialRole,
}: {
  initialName: string
  initialEmail: string
  initialRole: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const name = initialName
  const email = initialEmail
  const role = initialRole

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  })

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem(COLLAPSED_KEY, String(next))
      return next
    })
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const initials = (name || email || 'U').slice(0, 2).toUpperCase()

  return (
    <Tooltip.Provider delayDuration={300}>
      <motion.aside
        className="flex shrink-0 flex-col bg-brand-navy overflow-hidden"
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <span className="text-lg font-bold text-white shrink-0">SA</span>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="ml-2 text-sm font-semibold text-white"
            >
              SecureAssess
            </motion.span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="Main navigation">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <NavItem
                key={href}
                label={label}
                href={href}
                icon={Icon}
                active={active}
                collapsed={collapsed}
              />
            )
          })}
        </nav>

        {/* Bottom: user + collapse */}
        <div className="border-t border-white/10 p-2 space-y-1">
          {/* User section */}
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-semibold text-white">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{name}</p>
                <p className="truncate text-xs capitalize text-white/50">{role}</p>
              </div>
            )}
          </div>

          <NavItem label="Settings" href="/dashboard/settings" icon={Settings} active={false} collapsed={collapsed} />

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-white/10 hover:text-red-300 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} aria-hidden="true" />
            {!collapsed && 'Log out'}
          </button>

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex w-full items-center justify-center rounded-lg p-2 text-white/30 hover:bg-white/10 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </motion.aside>
    </Tooltip.Provider>
  )
}

function NavItem({
  label, href, icon: Icon, active, collapsed,
}: {
  label: string
  href: string
  icon: React.ElementType
  active: boolean
  collapsed: boolean
}) {
  const content = (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      className={[
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
        collapsed ? 'justify-center' : '',
        active
          ? 'bg-brand-orange/20 text-brand-orange border-l-2 border-brand-orange'
          : 'text-white/60 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      <Icon size={18} aria-hidden="true" />
      {!collapsed && label}
    </Link>
  )

  if (!collapsed) return content

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{content}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="rounded-md bg-brand-navy-light px-2.5 py-1.5 text-xs text-white shadow-lg"
        >
          {label}
          <Tooltip.Arrow className="fill-brand-navy-light" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
