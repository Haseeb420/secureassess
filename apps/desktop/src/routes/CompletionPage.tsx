import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { useAssessmentStore } from '../store/assessmentStore'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function AnimatedCheck() {
  const [pathDone, setPathDone] = useState(false)

  return (
    <motion.svg
      width="88" height="88"
      viewBox="0 0 88 88"
      fill="none"
      aria-hidden="true"
      animate={pathDone ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={pathDone ? { duration: 0.2, ease: 'easeInOut' } : {}}
    >
      <circle
        cx="44" cy="44" r="42"
        stroke="rgba(42,42,71,0.08)"
        strokeWidth="2"
      />
      <motion.path
        d="M 26 44 L 38 56 L 62 32"
        stroke="#DE5E1F"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        onAnimationComplete={() => setPathDone(true)}
      />
    </motion.svg>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 1) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m`
}

export function CompletionPage() {
  const { timerSeconds, timerTotalSeconds, questions } = useAssessmentStore()
  const elapsed = timerTotalSeconds - timerSeconds

  useEffect(() => {
    window.history.pushState(null, '', '/completion')
    const handlePop = () => window.history.pushState(null, '', '/completion')
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F7F8FA] to-[#EEEEF5] px-4">
      <motion.div
        className="flex w-full max-w-sm flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo + name */}
        <motion.div variants={itemVariants} className="mb-8 flex items-center gap-2">
          <ShieldCheck size={28} className="text-brand-navy/20" aria-hidden="true" />
          <span className="font-syne text-sm text-brand-navy/30">SecureAssess</span>
        </motion.div>

        {/* Animated checkmark */}
        <motion.div variants={itemVariants}>
          <AnimatedCheck />
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="mt-6 font-syne text-2xl font-bold text-brand-navy"
        >
          Assessment complete
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="mt-3 max-w-[260px] font-dm-sans text-sm leading-relaxed text-brand-navy/60"
        >
          Your answers have been recorded and will be reviewed by your team.
        </motion.p>

        {/* Divider */}
        <motion.div
          variants={itemVariants}
          className="mx-auto mt-6 h-px w-12 bg-brand-border"
          aria-hidden="true"
        />

        {/* Stats */}
        <motion.div variants={itemVariants} className="mt-6 flex gap-3 justify-center">
          <div className="flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-1.5">
            <span className="font-dm-mono text-xs text-brand-navy/50">Questions</span>
            <span className="font-dm-mono text-xs font-medium text-brand-navy">
              {questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-1.5">
            <span className="font-dm-mono text-xs text-brand-navy/50">Duration</span>
            <span className="font-dm-mono text-xs font-medium text-brand-navy">
              {formatDuration(elapsed)}
            </span>
          </div>
        </motion.div>

        {/* Close note */}
        <motion.p
          variants={itemVariants}
          className="mt-8 font-dm-sans text-xs text-brand-navy/25"
        >
          You may close this window
        </motion.p>
      </motion.div>
    </div>
  )
}
