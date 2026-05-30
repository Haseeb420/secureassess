import { useSyncStatus } from './useSyncStatus'

export function SyncIndicator() {
  const { isOnline, pendingCount, lastSyncAt } = useSyncStatus()

  let dotColor: string
  let label: string
  let text: string

  if (!isOnline) {
    dotColor = 'bg-red-400'
    text = 'Offline'
    label = `Offline — ${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending`
  } else if (pendingCount > 0) {
    dotColor = 'bg-brand-orange'
    text = 'Syncing…'
    label = `Syncing — ${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending`
  } else {
    dotColor = 'bg-green-400'
    text = 'Synced'
    label = lastSyncAt ? `Synced at ${new Date(lastSyncAt).toLocaleTimeString()}` : 'Synced'
  }

  return (
    <span className="flex items-center gap-1.5" title={label} aria-label={label}>
      <span className={`h-2 w-2 rounded-full transition-colors duration-300 ${dotColor}`} aria-hidden="true" />
      <span className="text-xs text-white/50">{text}</span>
    </span>
  )
}
