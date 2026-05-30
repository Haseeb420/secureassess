import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useSyncStatus } from '../features/sync/useSyncStatus'

export function OfflineBanner() {
  const { isOnline } = useSyncStatus()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-sm font-medium text-amber-900"
        >
          <WifiOff size={14} aria-hidden="true" />
          You're offline. Code is saving locally and will sync when reconnected.
        </motion.div>
      )}
    </AnimatePresence>
  )
}
