import { useSyncStatus } from './useSyncStatus'

export function SyncIndicator() {
  const { isOnline, pendingCount, lastSyncAt } = useSyncStatus()

  let color: string
  let label: string

  if (!isOnline) {
    color = 'bg-red-500'
    label = `Offline — ${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending`
  } else if (pendingCount > 0) {
    color = 'bg-yellow-400'
    label = `Syncing — ${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending`
  } else {
    color = 'bg-green-500'
    label = lastSyncAt ? `Synced at ${new Date(lastSyncAt).toLocaleTimeString()}` : 'Synced'
  }

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color} transition-colors duration-300`}
      title={label}
      aria-label={label}
    />
  )
}
