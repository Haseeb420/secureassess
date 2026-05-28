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
    isOnline: false,
    pendingCount: 0,
    lastSyncAt: null,
  })
  const prevOnlineRef = useRef<boolean | null>(null)

  useEffect(() => {
    let unlisten: (() => void) | undefined

    listen<SyncStatus>('sync:status', (event) => {
      const { online, pending_count, last_sync_at } = event.payload
      setState({ isOnline: online, pendingCount: pending_count, lastSyncAt: last_sync_at })

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
