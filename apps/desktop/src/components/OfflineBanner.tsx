import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'
import { useSyncStatus } from '../features/sync/useSyncStatus'

type BannerState = 'offline' | 'back-online' | 'hidden'

export function OfflineBanner() {
  const { isOnline } = useSyncStatus()
  const [banner, setBanner] = useState<BannerState>('hidden')
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setBanner('offline')
    } else if (wasOffline.current) {
      setBanner('back-online')
      hideTimer.current = setTimeout(() => setBanner('hidden'), 3000)
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [isOnline])

  const visible = banner !== 'hidden'
  const isBack = banner === 'back-online'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={[
            'flex items-center gap-3 px-6 py-2 text-sm font-medium text-white shadow-lg',
            isBack ? 'bg-green-600' : 'bg-amber-500',
          ].join(' ')}
        >
          {isBack ? (
            <Wifi size={16} aria-hidden="true" />
          ) : (
            <WifiOff size={16} aria-hidden="true" />
          )}
          <span>
            {isBack
              ? 'Back online — syncing your work…'
              : "You're offline — code is saving locally and will sync when reconnected"}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
