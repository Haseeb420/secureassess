import { useSyncStatus } from '../features/sync/useSyncStatus'

export function OfflineBanner() {
  const { isOnline } = useSyncStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center bg-yellow-400 px-4 py-1.5 text-center text-sm font-medium text-black"
    >
      ⚠ You are offline. Your work is being saved locally.
    </div>
  )
}
