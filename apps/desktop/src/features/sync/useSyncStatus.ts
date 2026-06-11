import { useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { toast } from 'sonner'

interface SyncStatus {
  online: boolean
  pending_count: number
  last_sync_at: string | null
}

export interface SyncState {
  isOnline: boolean
  pendingCount: number
  lastSyncAt: string | null
}

export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    lastSyncAt: null,
  })
  const prevOnlineRef = useRef<boolean | null>(null)

  // Browser-level network events give instant detection without waiting for the 30s poll cycle.
  useEffect(() => {
    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }))
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Tauri sync worker events for accurate API-level connectivity and pending-item count.
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    let unlisten: (() => void) | undefined

    listen<SyncStatus>('sync:status', (event) => {
      const { online, pending_count, last_sync_at } = event.payload
      setState((prev) => ({
        ...prev,
        isOnline: online,
        pendingCount: pending_count,
        lastSyncAt: last_sync_at,
      }))

      if (prevOnlineRef.current !== null && prevOnlineRef.current !== online) {
        if (!online) {
          toast.info('Syncing paused — you are offline')
        } else {
          toast.success('Synced')
        }
      }
      prevOnlineRef.current = online
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [])

  return state
}
