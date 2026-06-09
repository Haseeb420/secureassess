import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PowerOff, Loader2 } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useAssessmentStore } from '../store/assessmentStore'
import { exitKioskMode } from '../features/security/securityService'
import { completeMock } from '../features/attempt/mockAttemptService'

const DM_SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }
const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" }

export function GlobalQuitButton() {
  const location = useLocation()
  const { sessionId, isMock, mockAttemptId } = useAssessmentStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isAssessmentActive = location.pathname === '/assessment' && !!sessionId && !isMock
  const isMockActive       = location.pathname === '/assessment' && isMock
  const isPreAssessment    = location.pathname === '/pre-assessment'
  const needsKioskExit     = isAssessmentActive || isMockActive || isPreAssessment

  // AssessmentPage has its own well-designed exit flow — don't duplicate it.
  // The TopBar Exit button there is the canonical UX for mid-attempt exits.
  if (isAssessmentActive) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      if (isMockActive && mockAttemptId) {
        await completeMock(mockAttemptId).catch(() => {})
      }
      if (needsKioskExit) {
        await exitKioskMode().catch(() => {})
      }
    } finally {
      await getCurrentWindow().close()
    }
  }

  const title = isMockActive
    ? 'End practice round?'
    : isPreAssessment
      ? 'Quit SecureAssess?'
      : 'Quit SecureAssess?'

  const description = isMockActive
    ? 'Your practice round will end. You can start a new one from the assessment portal.'
    : isPreAssessment
      ? 'The security checks will be cancelled and the app will close.'
      : 'Are you sure you want to close SecureAssess?'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quit SecureAssess"
        className="fixed right-4 top-4 z-[9999] flex h-7 w-7 items-center justify-center rounded-lg text-white/20 transition-colors duration-150 hover:bg-white/10 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <PowerOff size={14} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="quit-dialog-title"
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ duration: 0.16 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h2
                id="quit-dialog-title"
                className="text-base font-bold text-brand-navy"
                style={SYNE}
              >
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-navy/60" style={DM_SANS}>
                {description}
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-brand-border py-2.5 text-sm text-brand-navy transition-colors hover:border-brand-navy disabled:opacity-40"
                  style={DM_SANS}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-navy py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-navy-light disabled:opacity-50"
                  style={DM_SANS}
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin" aria-hidden="true" />Closing…</>
                  ) : (
                    'Quit'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
