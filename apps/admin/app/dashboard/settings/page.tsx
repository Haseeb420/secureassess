'use client'

import { Settings } from 'lucide-react'
import { PageHeader } from '../../../components/PageHeader'

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" subtitle="Platform configuration and preferences" />

      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-brand-navy/30">
          <Settings size={40} aria-hidden="true" />
          <p className="text-sm font-medium">Settings coming soon</p>
        </div>
      </div>
    </div>
  )
}
