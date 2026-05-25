import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'

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

  useEffect(() => {
    let unlisten: (() => void) | undefined

    listen<SyncStatus>('sync:status', (event) => {
      setState({
        isOnline: event.payload.online,
        pendingCount: event.payload.pending_count,
        lastSyncAt: event.payload.last_sync_at,
      })
    }).then((fn) => {
      unlisten = fn
    })

    return () => {
      unlisten?.()
    }
  }, [])

  return state
}
