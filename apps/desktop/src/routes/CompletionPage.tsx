import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { useAssessmentStore } from '../store/assessmentStore'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
  hidden:   { opacity: 0, y: 16 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

function AnimatedCheck() {
  return (
    <svg
      width="80" height="80"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      {/* Background circle */}
      <motion.circle
        cx="40" cy="40" r="38"
        stroke="#DE5E1F"
        strokeWidth="3"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      />
      {/* Checkmark path */}
      <motion.path
        d="M22 41L35 54L58 28"
        stroke="#DE5E1F"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      />
    </svg>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  if (m < 1) return `${seconds}s`
  return `${m}m`
}

export function CompletionPage() {
  const { timerSeconds } = useAssessmentStore()

  // Lock to this page — prevent back navigation
  useEffect(() => {
    window.history.pushState(null, '', '/completion')
    const handlePop = () => window.history.pushState(null, '', '/completion')
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-surface px-4">
      <motion.div
        className="flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/10">
            <ShieldCheck size={24} className="text-brand-orange" aria-hidden="true" />
          </div>
        </motion.div>

        {/* Animated checkmark */}
        <motion.div variants={itemVariants}>
          <AnimatedCheck />
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="mt-5 text-2xl font-semibold text-brand-navy"
        >
          Assessment Submitted
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="mt-2 max-w-sm text-sm leading-relaxed text-brand-navy/60"
        >
          Your answers have been recorded and will be reviewed by your team.
        </motion.p>

        {/* Divider */}
        <motion.div
          variants={itemVariants}
          className="my-6 h-px w-48 bg-brand-border"
          aria-hidden="true"
        />

        {/* Stats */}
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <span className="rounded-full bg-brand-navy-pale px-3 py-1 text-xs text-brand-navy">
            Questions answered: 1
          </span>
          <span className="rounded-full bg-brand-navy-pale px-3 py-1 text-xs text-brand-navy">
            Session: {formatDuration(3600 - timerSeconds)}
          </span>
        </motion.div>

        {/* Close note */}
        <motion.p
          variants={itemVariants}
          className="mt-8 text-xs text-brand-navy/40"
        >
          You may close this window.
        </motion.p>
      </motion.div>
    </div>
  )
}
